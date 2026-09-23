You are assisting with JungleDiff, a League of Legends stats tracker for a closed group of players
("the crew"). It reads match data from the GameOn API, enriches it with Riot's Data Dragon CDN, and
presents ladders, player profiles and per-match analysis. The interface is French; there is no
public sign-up — authentication exists so a crew member can edit their own profile.

# Technology Stack

- Nuxt 4.5.2, SSR enabled, `app/` directory structure, Nitro server routes under `server/`
- Vue Composition API, `<script setup>` only
- TypeScript strict; `any` is a lint error
- Tailwind CSS v4 driven by a custom CSS-variable design system
- Pinia setup stores
- Keycloak OIDC, implemented **server-side** in Nitro — no OIDC library ships to the browser
- `@nuxt/fonts` (self-hosted Manrope / IBM Plex Mono), `@nuxt/icon` (lucide), `chart.js` + `vue-chartjs`
- Playwright for end-to-end tests, ESLint via `@nuxt/eslint`

# Language Policy

- **All source code and code comments are written in English**, without exception.
- User-facing strings stay **French**: UI labels, error messages rendered in the interface, and
  `useSeoMeta` content. The product is French; the code is not.

# Features

- `/` — crew dashboard: weekly activity tiles, full ladder (`LadderTable`), recent games, "fact of
  the week", and the top crew records. A summoner search box exists but is deliberately hidden
  behind `v-if="false"` (see Known Gaps).
- `/stats` — global crew records, filterable by queue, period, ranked-only and "inclure les smurfs",
  with one card per award defined in `app/utils/lol-awards.ts`.
- `/summoner/[id]` — player profile: identity card, Solo/Duo and Flex rank cards, a period-filtered
  performance KPI panel, a "Progression classement" card (`LpProgressionCard`: the rank sparkline
  from `GET /lol/summoner/{id}/rank`, and under it `LpChangesChart`, one bar per ranked game from
  `GET /lol/summoner/{id}/rank/changes`, both behind one Solo/Flex switch), a filterable and
  paginated match history, and Champions / Rôles / Duos side panels. Server-rendered.
- `/game/[id]/[playerId]` — match detail: win/loss-tinted header with MVP/ACE accolade, per-team
  objectives, key moments, then five tabs — Vue d'ensemble (scoreboards + highlights), Film de la
  partie (a timeline scrubber driving minimap, gold race, kill feed and charts), Performance (player
  picker, KPI tiles, radar and damage/gold/ranking charts), rAImmus (the AI coach report), and a
  collapsible Données brutes table.
- **LP per game** — `app/components/lol/LolRankChangeBadge.vue` renders a participant's `rankChange`
  as "+18 LP" / "-21 LP" / "0 LP" with a "Emerald II 27 LP → Emerald II 45 LP" tooltip, plus a
  chevron chip tinted with the reached tier when the division or tier changes. It shows beside the
  result in `LolGameCard` (in `compact` mode: emblem and chevrons only) and in every scoreboard row
  on the match page. Helpers live in `app/utils/lol-rank-change.ts`, built on `app/utils/lol-tier.ts`.
- **rAImmus** — the AI coach, named after Rammus, rendered by
  `app/components/lol/game/LolGameCoachReport.vue`. The persona is a UI skin only: the routes stay
  neutral (`GET`/`POST /lol/coach/{matchId}/player/{playerId}`) and the report text comes from the
  model, never from the front end. Generation is queued server-side, so neither route blocks:
  `GET` answers `200` with the report, `202` with a `LoLCoachQueueStatusDto`, or `404` when nobody
  has asked; `POST` is authenticated and answers `200` or `202`. The component owns five states —
  not generated yet, queued, report, abandoned, error — polls the `GET` every 5 s while queued, and
  the tab is only offered when the route carries a usable `playerId`.
- `/settings` — the only authenticated page (`definePageMeta({ auth: true })`): edit nickname, full
  name, Riot ID and avatar; shows an admin panel to holders of the `gameon_admin` realm role.
- `/healthz` — liveness probe, not a user-facing page.

# Directory Layout

- `app/pages/` — orchestrate data loading with `useAsyncData` and own the page layout.
- `app/components/ui/` — generic, domain-free UI.
- `app/components/home/`, `app/components/lol/`, `app/components/lol/game/` — business components.
- `app/composables/` — reusable logic and API client injection.
- `app/stores/` — Pinia setup stores.
- `app/lib/api/` — typed HTTP clients built on `BaseApiService`.
- `app/lib/types/` — domain interfaces, re-exported through `app/lib/types/index.ts`.
- `app/utils/` — pure helpers.
- `shared/types/` — contracts used by both Nitro and the app, imported via `#shared`.
- `server/api/`, `server/routes/`, `server/middleware/`, `server/plugins/`, `server/utils/` — Nitro.
- `tests/` — Playwright specs.

# Naming Conventions

- **Components**: PascalCase filenames. Nuxt auto-imports every component under `app/components/`
  using its directory path as a prefix, de-duplicating overlap — `ui/AppImage.vue` becomes
  `<UiAppImage>`, `lol/game/LolGameDetailsPlayer.vue` stays `<LolGameDetailsPlayer>`. In practice
  `ui/` components are always used through their prefixed auto-import name, while pages import
  domain components explicitly so they keep their short name (`<ChampionsAside>`, not
  `<LolChampionsAside>`). Both are valid; follow whichever the surrounding file already uses.
- **Component prefixes by domain**: components representing a LoL entity are prefixed `Lol`
  (`LolGameCard`, `LolPlayerHeader`); everything under `lol/game/` is prefixed `LolGame`.
  Panels rendered beside the profile end in `Aside` (`ChampionsAside`, `RolesAside`, `DuosAside`).
- **Stores**: file `app/stores/<domain>.ts` exporting `use<Domain>Store` — `lol.ts` → `useLolStore`.
- **Composables**: file named after the function — `useGameOnLol.ts` → `useGameOnLol`.
- **Utils**: kebab-case filenames; LoL-domain helpers carry a `lol-` prefix (`lol-tier.ts`,
  `lol-awards.ts`, `lol-timeline-event.ts`). Generic ones do not (`theme.ts`, `async-data.ts`).
  Despite `app/utils/` being auto-imported, the codebase **imports these explicitly** everywhere —
  match that.
- **Types**: LoL domain types are prefixed `LoL` (capital L, capital L — `LoLGameDto`,
  `LoLHomeStatsDto`). API payload shapes end in `Dto`. `LeaguePlayer` and `LeagueOfLegendsRank`
  predate the convention and keep their names.
- **Server routes**: `<name>.<method>.ts` — `session.get.ts`, `logout.post.ts`. The method suffix is
  what restricts the verb; omitting it accepts every verb.
- **Server utils**: kebab-case, imported by **relative path** (`../../utils/session`) rather than
  through Nitro's auto-import, so the dependency is visible at the top of the file.
- **Props and events in templates**: kebab-case (`:hero-player`, `@player-selected`), camelCase in
  `<script setup>`. ESLint enforces this; `v-model` pairs use `update:<prop>`.
- **Design tokens**: `app/assets/css/main.css` defines raw values on `:root` (`--color-gold`,
  `--color-surface`) and maps them in `@theme` to the names Tailwind exposes
  (`--color-brand-gold`, `--color-surface-base`, `--color-text-main`). Write `bg-surface-base`,
  `text-text-main`, `text-brand-gold` — never a raw hex in a component.

# Authentication (no token ever reaches the browser)

- Tokens live in `httpOnly` + `SameSite=Lax` cookies set by Nitro. The browser never reads one.
- `offline_access` is requested on purpose: it backs the ~30-day persistent session so users are not
  asked to sign in again every day. It is safe here **because** the refresh token stays server-side.
- `app/stores/auth.ts` holds only `isAuthenticated`, the `SessionUser` profile and its roles. It has
  no `getToken()` and must never gain one.
- All data calls go to `/api/gameon/...`; the proxy attaches the bearer. Never call the GameOn API
  directly from the browser — the only exception is anonymous `<img src>` URLs built from
  `config.public.gameOnApiUrl`.
- `ALLOWED_PREFIXES` in the proxy bounds what the front end may reach. Widen it deliberately.
- Roles come from the session, not from decoding a token client-side: `authStore.isAdmin` checks the
  `gameon_admin` realm role.

# Data Flow

- The browser and SSR both talk to Nitro, never to an upstream directly. `server/api/gameon/` proxies
  the GameOn API with the session bearer; `server/api/ddragon/versions.get.ts` serves Riot's version
  list from a one-hour server cache with a 24-hour stale window.
- `app/lib/api/BaseApiService` gives every call a 120 s timeout, one retry on reads and none on
  writes, maps failures to `AppError`, and encodes path segments via `encodePathSegment`. The ceiling
  is deliberately wide: the GameOn API is slow on its aggregates and is expected to stay that way
  (`/lol/Stats/global` unfiltered measures 65–73 s, `/lol/Home` 7–13 s). The former 8 s cut those
  calls mid-flight and the UI reported an unreachable API for one that was merely answering slowly.
  The same 120 s is set as `UPSTREAM_TIMEOUT_MS` in the proxy, and **the two must move together** —
  whichever is lower is the one that actually cuts the call. A single call may still override through
  `RequestOptions.timeout`, and nothing does today; it is now mainly useful to *shorten* a ceiling.
- Data that must stay fresh (`lol` store: home stats, ladder players, last matches) is cached behind
  a 60 s window rather than for the whole SPA session, and its `useAsyncData` callers pass
  `getCachedData: cacheOnlyDuringHydration` (`app/utils/async-data.ts`) so the handler is replayed on
  client navigation without breaking hydration. Both halves are required: the store window alone
  never runs, and forcing the handler alone breaks the SSR match.
- `usePatchStore` is a read-only view over `useLolStore.versions`. There is one version list per
  request, not one per store.
- `/` and `/stats` are served through Nitro's SWR cache (60 s); `/settings` and `/api/auth/**` are
  explicitly `no-store`.

# Design System

- Dark is the default theme: `:root` tokens are dark, and the `.light` class on `<html>` switches to
  the light palette. `public/theme-init.js` applies the stored choice before first paint.
- The Tailwind variant is `light:`, **not** `dark:`. A `dark:` utility does nothing, because the
  `.dark` class is never set.
- Read and write the theme through `app/utils/theme.ts`; never test the class by hand.
- Any section or value rendered without a backing API field MUST be flagged with
  `app/components/ui/MockBadge.vue` (place it inside a `relative` parent; it self-positions
  top-right). Never present fabricated data as if it were live. Nothing currently needs it.

# Code Quality Constraints

- Always use `import type` for type-only imports.
- Prioritise Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Map errors to `AppError`; ignore deliberate cancellations with `isAbortError`.
- Long-running or filterable views must pass an `AbortSignal` so a late response cannot overwrite
  newer state. Every `GameOnClient` method accepts one.
- `eslint .` and `vue-tsc --noEmit` must both be clean before a change is considered done.

# Build, Checks & Tests

There is **no CI pipeline**: delivery is manual, so these checks only run when someone runs them.
Treat the list below as the gate before any deploy, and run all of it — nothing else will.

```bash
npm run lint            # must be 0 errors and 0 warnings
npx vue-tsc --noEmit    # must be clean
npm run sync:rules:check  # generated instruction files still match their source
npm audit --omit=dev --audit-level=high
npm run build           # required before the e2e suite; it boots .output
npm run test:e2e
```

- Tests target the **production build**, not `nuxt dev`: the CSP nonce, SWR route rules and real 404
  status codes all behave differently under Vite's dev middleware.
- `tests/smoke.spec.ts` needs **no upstream and no secrets** — it passes with no GameOn API and no
  Keycloak. Keep it that way: it is the part of the suite that can always be run. The specs needing
  live data skip themselves when `NUXT_PUBLIC_GAME_ON_API_URL` is unset, so source `.env` first to
  exercise those.
- `reuseExistingServer` is on, so a server already listening on the port is reused — and with it a
  possibly stale `.output`. Rebuild before a run whose result has to be trusted.
- The Dockerfile uses `npm ci`, Node 24 LTS, runs as `USER node`, and carries a HEALTHCHECK against
  `/healthz`. The runtime image holds only `.output` — no `node_modules`, no package manager.
  **Nothing builds or boots this image automatically**; verify it by hand when it changes.
- No `NUXT_PUBLIC_*` value is baked in at build time; all are read from the environment at container
  start, so one image is promotable across environments. Do not reintroduce build args for them.

# Pitfalls

Each of these is easy to reintroduce and hard to diagnose.

- **`useSeoMeta` must come after the refs it reads.** Placing it above a `const` it dereferences hits
  the temporal dead zone; unhead then has no head entry and crashes on unmount with
  `Cannot read properties of undefined (reading 'dispose')`, taking hydration down with it.
- **Register lifecycle hooks before any top-level `await`.** After an await there is no active
  component instance and the hook is silently dropped.
- **`createError` inside a `useAsyncData` handler never reaches Nuxt.** `useAsyncData` captures it
  into `error`, so the response stays 200. Inspect `error.value` after the call and throw at setup
  level to get a real 404.
- **The GameOn API answers `204 No Content` for unknown ids**, not 404. Treat an empty successful
  response as "not found".
- **Inline scripts need the CSP nonce.** Nuxt emits inline bootstrap scripts whose content changes
  per render, so `script-src 'self'` alone breaks hydration. The nonce is issued in
  `server/plugins/csp.ts` during the render — not in middleware — so it stays in step with the
  SWR-cached HTML. `type="application/json"` blocks are inert and need no nonce.
- **Match DTOs key on `matchId`, not `id`.** `id` is absent on the paginated match endpoints, so
  reading it yields `undefined` and any derived URL is silently malformed.
- **Participants outside the crew have a `null` `playerId`.** Build `/game/<matchId>/<playerId>`
  links from a tracked player's own match list, not from `/lol/match/last`.
- **The game tabs are `<button role="tab">`.** Query them with the `tab` role; `getByRole('button')`
  finds nothing.
- **Custom games carry a poorer payload than match-v5.** They are imported from the LoL client, so
  ping counters, `consumablesPurchased` and the timeline's `championStats` are simply absent and
  read back as 0. A 0 from one of those fields means "never recorded", not "none": hide the value
  rather than rendering it. `bestParticipant` only sorts, so it happily crowns a random player when
  every score is 0 — guard on a value strictly above 0 before awarding anything.
- **Queue ids above 3000 are custom lobbies.** Riot does not document them, so only `QUEUE_LABELS`
  in `app/lib/utils/lol.ts` can name them. The `queues` fallback behind it needs `fetchQueues()` to
  have run on the current page — it is not loaded globally, and a page that forgets it falls all the
  way through to a raw `Queue <id>`.
- **Percent-encoded path traversal is the case that matters.** HTTP clients collapse a literal `../`
  before sending, so only `%2f`-encoded separators reach the proxy's guard.
- **The coach's first `404` is nominal, a later one is a failure.** On the initial read it means
  "nobody has asked for this analysis yet" and is the state that offers the button, so map
  `statusCode === 404` onto `null` inside the `useAsyncData` handler or the tab reads as broken. The
  same `404` seen *while polling a queued slot* means the opposite: the API gave up after five
  consecutive refusals from the model. Render the two differently, or an abandoned generation is
  indistinguishable from the starting state and the player re-clicks forever.
- **The coach queues, it no longer generates during the request.** A generation takes ~50 s and the
  model's free tier allows 5 requests/minute, so the API serialises the work behind one consumer.
  Both routes answer immediately; a `202` carries `LoLCoachQueueStatusDto` and `$fetch` resolves on
  it like any other body, which is why `getCoachReport`/`generateCoachReport` return the
  `LoLCoachResponse` union and every call site discriminates through `isCoachQueued`. The API
  deduplicates on `(matchId, playerId)`, so a second click returns the existing position.
- **`estimatedWaitSeconds` moves between polls.** It is a rolling average of the last ten real
  generations, not a constant: render whatever the latest poll carried instead of freezing the first
  value. Below ~90 s show seconds, above it minutes.
- **A `setInterval` poll must die with the component.** `onBeforeUnmount` clears the interval as well
  as calling `abort()`; an interval that survives keeps hitting the API for a destroyed view.
- **rAImmus' `noteSur10` is not the header's rating.** The header shows
  `LoLGameParticipantStat.Rating`, computed and reproducible; the coach's is editorial and can
  diverge by several points on the same game. Render it explicitly as rAImmus' opinion, or not at all.
- **`pointsForts` is legitimately empty sometimes.** The coach is told not to invent a compliment, so
  an empty array is an answer: render a sentence for it rather than an empty list.
- **The two "inclure les smurfs" toggles are not the same mechanism, on purpose.** On `/stats` it is
  a real API parameter (`includeSmurfs`; at `false` the secondary accounts leave the records
  entirely, and `totalGamesAnalyzed` / `totalPlayersTracked` / `topChampions` move with them). **Both
  toggles default to excluding smurfs**, against the API's own default of `true`: the records rank
  the crew's main accounts, and a smurf in a low-elo bracket distorts every award it touches. Because
  the front-end default is the opposite of the API's, the query string carries the opt-**in**
  (`includeSmurfs=true`) while the client always sends `includeSmurfs=false` upstream — the two
  directions are easy to confuse. On `/` it is a
  **view filter inside `LadderTable`** and must stay one: `useLolStore.fetchPlayers()` has to keep
  returning every account, because `LolPlayerHeader` and `LolGameDetailsPlayer` walk `players` to
  climb from a smurf to its main and `LolGameCard` uses it to tell a crew participant from an
  outsider — filtering the store breaks the smurf badge and makes a smurf's games read as non-crew.
  The store's cache is temporal and ignores its arguments, so a `fetchPlayers(includeSmurfs)` would
  additionally serve the previous call's list for a minute. `/lol/Home` has no such parameter at all:
  its `crewRecords` always include smurfs, and passing one does nothing.
- **Crew scoping is already total; there is nothing to filter.** `GET /lol/summoner` takes
  `includeOutOfCrew` and defaults it to `false`, and `GameOnClient.getLeaguePlayers` pins it anyway so
  the assumption lives in the call. `GET /lol/Stats/global` has no crew parameter at all **because it
  needs none**: its records already contain only crew members (verified — none of the out-of-crew ids
  appears in any award). Do not add an `inCrew` filter on either side; there is nothing for it to
  remove, and on `/stats` no parameter exists to carry it.
- **A component that copies a prop into a `ref` freezes on the first value.** `home/StatCard.vue` did
  exactly that for its count-up animation and never watched `value` again, so it kept rendering the
  first figure it was mounted with. Invisible while the home page loaded its numbers once, plainly
  wrong as soon as a filter could re-query them: the store held the new value and the card showed the
  old one. It now re-runs the animation from a `watch` on the prop. Look for this pattern before
  blaming reactivity on the store or on `useAsyncData`.
- **The smurf predicate lives in `app/utils/lol-smurf.ts` (`isSmurf` / `smurfIds`) and is the only
  copy.** It reads `!!primaryPlayerId && primaryPlayerId !== id && primaryPlayerId !== 0`; the two
  extra guards are load-bearing, because the API returns a self-referencing or zeroed
  `primaryPlayerId` on some mains and the short `!!primaryPlayerId` form would crown them smurfs.
  Import it, never re-inline it.
- **The home's smurf toggle is page state, not component state.** It lives in `index.vue` and reaches
  `LadderTable` through `v-model:include-smurfs` and `RecentGames` through a plain prop, because one
  click has to move the whole dashboard. Only the ladder is still filtered in the browser, and only
  because the store has to keep every account for the smurf badge and the main-account links;
  `/lol/Home` and `/lol/Match/last` are both re-queried instead.
- **`/lol/Match/last` takes `includeSmurfs` and refills the page.** It drops a match only when
  **every** crew participant in it is a secondary account — a smurf playing alongside a main is still
  that main's game — and then tops the page back up with older matches, so a page of `size` stays a
  page of `size`. That refill is exactly what the earlier client-side filter could not do, and the
  reason this belongs in the request.
- **Changing that flag must reset the component's pagination.** `RecentGames` keeps its extra pages
  in a local `additionalMatches`; those rows were fetched under the previous flag, so a `watch` on the
  prop clears them and sends `currentPage` back to 1. Without it, smurf-only games stay stranded in
  the list after being excluded and the next `loadMore` resumes from the wrong offset. `loadMore`
  forwards the flag too, or page 2 silently contradicts page 1.
- **`GET /lol/Home` now takes `includeSmurfs` (default `true`) and `includeOutOfCrew` (default
  `false`)**, and the flag reaches the weekly activity, the fact of the week *and* `crewRecords`, so
  one re-query moves the whole dashboard. Note the API's Swagger document can lag behind the running
  build — the parameter bound and worked while `/swagger/v1/swagger.json` still listed none. Test the
  behaviour, not the schema.
- **A store loader that takes a filter must memoize that filter next to its timestamp.** `isFresh`
  only looks at the clock, so `fetchHomeStats` and `fetchLastMatches` each compare a stored flag
  (`homeStatsIncludeSmurfs`, `lastMatchesIncludeSmurfs`) as well; without it a toggle flip inside the
  60 s window is answered with the previous flag's data and the UI silently does nothing. The flag is returned from the store like the
  timestamps, so the hydrated client agrees with the SSR payload. The `useAsyncData` key stays static
  and `watch: [includeSmurfs]` is what re-runs the handler.
- **The coach keys on the route's `playerId`, not the selected player.** The Performance picker walks
  all ten participants, but eight of them have no GameOn `playerId` and the API answers 404.
- **A participant's `rankChange` is `null` far more often than not, and `null` is not 0.** The API
  sets it only for a tracked player on a Solo (420) or Flex (440) game whose LP it could pin to that
  game; several games between two rank refreshes leave it `null`. Render nothing for `null` — 0 is a
  genuine result (a loss at 0 LP under demotion protection) and gets its own neutral "0 LP" badge.
  Compare promotions on `divisionScore` (tier + division), never on the LP figure: Gold I 90 LP →
  Platinum IV 10 LP is a climb whose LP number drops. `rankBefore`/`rankAfter` are meaningless from
  Master upwards, which `tierLabel` and `divisionScore` already ignore.
- **The per-game LP bars keep every game, known or not.** `rank/changes` lists ranked games oldest
  first, and an entry with `rankChange: null` was played — only its LP are unknown. It keeps its slot
  on the axis as a grey bar straddling the baseline (a genuine 0 is a flat tick), and it is left out
  of the win/loss averages instead of counting as 0. Solo and Flex are two calls, not one
  `queue=All`: `limit` applies to the merged list, and a busy Solo queue would crowd Flex out of it.
  Both follow the page period through `days` (7 / 30 / none), like the sparkline.
- **Tier names are English on purpose.** `tierLabel` prints "Emerald II", matching the rank cards,
  the ladder and the LP charts; the LP badge reuses it rather than introducing a second, French
  vocabulary ("Émeraude") for the same tiers.
- **`LolGameCard`'s text column needs its `min-w-0` chain.** Without it the result line's
  `truncate` never engages: its min-content width propagates up, and anything added beside the
  result (the LP badge did) pushes the mobile KDA off the card, which then scrolls sideways inside
  its `overflow-hidden`.

# Known Gaps

- **No search by name on the API.** Only `GET /lol/summoner/{id:int}` exists, so nicknames are
  resolved locally against the loaded ladder (`app/utils/player-search.ts`). This is also why the
  home page search box stays hidden: the logic works, but its suggestions panel is still placeholder
  content, and local resolution does not scale past the crew.
- **No CI pipeline.** Delivery is manual by choice; lint, types, audit, build and the e2e suite only
  run when someone runs them. Nothing verifies the Docker image builds or boots.
- **No error tracking.** Failures are reported through `console.error` only, which in production goes
  to stdout and is lost. This is the largest remaining hole.
- **No rate limiting on `/api/gameon`.** The allowlist bounds paths, not request volume. The coach
  `POST` is the one endpoint where that actually costs money; the API's own queue and its
  `(matchId, playerId)` deduplication now bound the spend, and only the crew's own authentication
  stands in front of the endpoint itself.
- **The front end never regenerates a coach report.** The API takes `?force=true` on the `POST` but
  honours it only for `gameon_admin`; nothing in the UI sends it, so a report written from a bad
  payload stays as it is and the button only ever reloads the stored one.
- **A `404` on the coach `POST` means the API does not have that match**, or that player did not play
  it — not that the endpoint is missing, and not the abandoned-generation `404` the poll can see. Check which API the server is actually proxying before
  reading it as a front-end bug: `NUXT_PUBLIC_GAME_ON_API_URL` in the process environment wins over
  the one in `.env`, and an older deployment answers `404` to the coach routes at every verb.
- **No sitemap; `robots.txt` allows everything.** No image optimisation pipeline either.
- **`app/components/home/LiveGameCard.vue` is unreferenced.** Left in place because the name suggests
  an in-progress feature; ask before deleting.
- The GameOn API itself (open CORS, mostly anonymous LoL endpoints) is a separate repository and out
  of scope — `GameOn-Front` consumes it too, so changes there need its own discussion.

# Environment

Required: `NUXT_PUBLIC_GAME_ON_API_URL`, `NUXT_PUBLIC_KEYCLOAK_AUTHORITY`,
`NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NUXT_PUBLIC_KEYCLOAK_REALM`.
Optional: `NUXT_GAME_ON_API_URL` (overrides the proxy target server-side),
`NUXT_KEYCLOAK_CLIENT_SECRET` (only for a confidential Keycloak client; empty means public + PKCE).
The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

`typescript` is pinned to `^6.0.3` on purpose: `typescript-eslint` (via `@nuxt/eslint-config`) still
declares `typescript >=4.8.4 <6.1.0` and crashes under the v7 "Corsa" line. Re-check that peer range
before bumping.

# IMPORTANT META-RULE: Synchronization

At every major modification (adding a feature, technical change, etc.), you MUST:

1. Edit `.agents/instructions.base.md` — the single source of truth — then run `npm run sync:rules`
   to regenerate `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `.github/copilot-instructions.md`
   and `.agents/AGENTS.md`. Never edit those five by hand; they are generated and will be overwritten.
2. Update `README.md` to reflect the project's architecture, its current state, and ongoing work.
