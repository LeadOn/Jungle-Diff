<!-- Generated from .agents/instructions.base.md by `npm run sync:rules`. Do not edit by hand. -->

# Project Guidelines: JungleDiff

## IMPORTANT META-RULE: Synchronization

At every major modification (adding a feature, technical change, etc.), you MUST:

1. Edit `.agents/instructions.base.md` — the single source of truth — then run `npm run sync:rules`
   to regenerate `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `.github/copilot-instructions.md`
   and `.agents/AGENTS.md`. Never edit those five by hand; they are generated and will be overwritten.
2. Update `README.md` to reflect the project's architecture, its current state, and ongoing work.

You are assisting with JungleDiff, a League of Legends stats tracker for a closed group of players
("the crew"). It reads match data from the GameOn API, enriches it with Riot's Data Dragon CDN, and
presents ladders, player profiles and per-match analysis. The interface is French; there is no
public sign-up — authentication exists so a crew member can edit their own profile.

## Technology Stack

- Nuxt 4.5.2, SSR enabled, `app/` directory structure, Nitro server routes under `server/`
- Vue Composition API, `<script setup>` only
- TypeScript strict; `any` is a lint error
- Tailwind CSS v4 driven by a custom CSS-variable design system
- Pinia setup stores
- Keycloak OIDC, implemented **server-side** in Nitro — no OIDC library ships to the browser
- `@nuxt/fonts` (self-hosted Archivo / Geist Mono), `@nuxt/icon` (lucide), `chart.js` + `vue-chartjs`
- Playwright for end-to-end tests, ESLint via `@nuxt/eslint`

## Language Policy

- **All source code and code comments are written in English**, without exception.
- User-facing strings stay **French**: UI labels, error messages rendered in the interface, and
  `useSeoMeta` content. The product is French; the code is not.

## Features

- `/` — crew dashboard, built from the Claude Design mock-up "JungleDiff Accueil v7", **the design
  base for the whole site** (theme, layout, header, footer). Top to bottom: status chips (last sync,
  the 7-day window, the patch), a bento of the last 7 days (`WeekBento`: ranked games, active
  players, win-rate ring and its delta, net LP and playtime day by day), the "En partie maintenant"
  strip (`LiveStrip`, from `GET /lol/live`), then two columns — `CrewLadder` (podium of three over
  each player's main champion, "L'échelle des rangs" (`RankTrack`), the remaining rows) and
  `RecentGames` (the feed grouped by Paris day, with player filters counted from `activePlayers`) —
  beside a rail: `PlayerOfTheWeek`, `MonthRecords`, `CrewChampions` (with each champion's
  `topPlayer`). Everything on it is live data.
- **Crew search** — `app/components/lol/LolPlayerPalette.vue`, a command palette mounted once by the
  layout and opened from the header, the mobile bottom bar, ⌘K / Ctrl K or "/". It resolves names
  locally against the crew list (see Known Gaps) and loads that list on first opening when the
  current page did not.
- `/stats` — global crew records, filterable by queue, period, ranked-only and "inclure les smurfs",
  with one card per award defined in `app/utils/lol-awards.ts`.
- `/summoner/[id]` — player profile, built from the Claude Design mock-up "JungleDiff Profil v5":
  an ink hero over the player's main-champion splash (`LolPlayerHeader`: avatar and level, Riot ID,
  archived / smurf-of chips, sync time, OP.GG / DPM links, Rafraîchir, a disabled "Comparer ·
  Bientôt"), Solo/Duo and Flex rank cards with a win-rate ring and recent form, a period-filtered
  performance KPI panel (flagged "Filtré · …" when the history's role or queue filter also narrows
  it), then the match history (role and queue filters, games grouped by Paris day with a W/L and LP
  chip) beside a rail: a "Progression classement" card (`LpProgressionCard`: the rank sparkline from
  `GET /lol/summoner/{id}/rank`, and under it `LpChangesChart`, one bar per ranked game from
  `GET /lol/summoner/{id}/rank/changes`, both behind one Solo/Flex switch), then Champions / Rôles /
  Duos panels (the champion and duo lists show five, the rest on demand). Server-rendered; the crew
  list is loaded after mount for the hero's `mainChampionName` and the smurf's main account.
- `/game/[id]/[playerId]` — match detail, built from the Claude Design mock-up "JungleDiff Partie
  v5": an ink hero over the route player's champion splash (`LolGameHeader`: result tinted
  win/loss, rating and MVP/ACE chips, queue / duration / date / patch chips, the game's LP with a
  promotion chip, Synchroniser, the match id), per-team objective cards (`LolGameObjectives`), key
  moments, then five tabs in a pill bar that sticks under the site header — Vue d'ensemble (two
  scoreboards, each row unfolding advanced stats, then "Mentions spéciales"), Film de la partie (a
  timeline scrubber driving minimap, gold race, kill feed and charts; a click on a kill-feed event
  moves the film there), Performance (player picker, KPI tiles, radar and damage/gold/stat/ranking
  charts), rAImmus (the AI coach report), and a collapsible Données brutes table. "Synchroniser"
  re-reads the match and its timeline from the API; it does not call `refreshGame` (the API's
  `POST /lol/match/{id}/update`), which nothing in the UI sends. The viewer's "Vous" badges are
  resolved after mount, like everywhere else. Participants are named by their Riot ID through
  `playerRiotName` (`lol-match.ts`), like the profile's hero; the GameOn nickname
  (`playerDisplayName`) only appears on a scoreboard row's crew chip, next to the Riot ID.
- **LP per game** — `app/components/lol/LolRankChangeBadge.vue` renders a participant's `rankChange`
  as "+18 LP" / "-21 LP" / "0 LP" with a "Emerald II 27 LP → Emerald II 45 LP" tooltip, plus a
  chevron chip tinted with the reached tier when the division or tier changes. It shows in every
  scoreboard row on the match page. `LolGameCard` (the game cards of the home feed and of the
  profile history) draws the same information as v7 chips of its own, from the same helpers. Helpers live in `app/utils/lol-rank-change.ts`, built on `app/utils/lol-tier.ts`.
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

## Directory Layout

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

## Naming Conventions

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
  `text-text-main`, `text-brand-gold` — never a raw hex in a component. Shadows, scrims and the page
  wash are `@utility` classes over theme variables (`shadow-card`, `bg-scrim-side`,
  `bg-page-wash`). Text over splash art gets `text-shadow-photo` (inherited, so set it on the card):
  the scrims are kept light on purpose so the art shows, and the halo carries the contrast. Tier pastels (`tierTint`) are data colours in `lol-tier.ts`, not tokens.
  The match page's data colours are tokens, because every chart and chip needs them as utilities:
  the two sides (`team-blue` / `team-red`, each with `-text` and `-soft`), the damage types
  (`dmg-physical`, `dmg-magic`, `dmg-true`), the ACE accolade (`violet`, `violet-soft`) and a picked
  row (`surface-selected`). A side is not a result: `team-red` shares `loss`'s values but the red team
  can win. Ratings map to tones through `ratingTone` / `ratingToneClass` in `lol-match.ts`.

## Authentication (no token ever reaches the browser)

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

## Data Flow

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
- The home page's reload chip calls `useLolStore().invalidateDashboard()` then `refreshNuxtData` on
  `homeStats`, `players` and `lastMatches`: it re-reads the API, it does not ask the API to
  re-synchronise with Riot. Its "Synchro il y a X min" is the latest `lolRefreshedOn` of the crew.
- A page of recent games is `RECENT_MATCHES_PAGE_SIZE` (6, in `app/stores/lol.ts`), shared by the
  SSR preload and the feed's pagination so the offsets line up.

## Design System

- The design base is the home page of the Claude Design mock-up "JungleDiff Accueil v7": a light
  sage palette (`#F4F5F0` page, white cards, `#16241B` ink), Archivo for everything, Geist Mono for
  figures and technical labels, pill-shaped controls, 20–26px card radii, soft layered shadows and a
  springy easing (`ease-spring`). New pages and restyled old ones follow it.
- **Light is the default theme**: the `:root` tokens are the v7 palette, and the `.dark` class on
  `<html>` switches to a dark one derived from the brand guidelines (jungle green-black `#0C120E`).
  The mock-up has no dark variant and no theme button; both were added on purpose, the toggle sits in
  the header. `public/theme-init.js` applies a stored `dark` choice before first paint.
- Two variants: `dark:` applies under `.dark` and is what new code uses. `light:` applies whenever
  `.dark` is absent — components written for the former dark-first palette carry their light-mode
  corrections under `light:`, and this definition keeps them active on the new default without
  rewriting them. Only `LolRankChangeBadge` and `RankHistory` still use it; the match page, its
  former main user, was rebuilt on the v7 tokens.
- `inverse` tokens flip with the theme (selected pills, primary buttons); `ink` tokens stay dark in
  both (footer, tooltips, the mobile bar, and cards printed over splash art).
- Read and write the theme through `app/utils/theme.ts`; never test the class by hand.
- Custom breakpoint `rail:` (1100px, where the dashboard gains its side rail) is declared in **rem**
  (`68.75rem`). Tailwind cannot sort a px breakpoint against its rem ones: in px it was emitted
  before `md:`, which then always won.
- Any section or value rendered without a backing API field MUST be flagged with
  `app/components/ui/MockBadge.vue` (place it inside a `relative` parent; it self-positions
  top-right). Never present fabricated data as if it were live. Nothing currently needs it: the home
  page used it while `/lol/Home` lacked the per-day data, active players, last week's win rate, live
  games and top players, until the API shipped them (2026-09-25).

## Code Quality Constraints

- Always use `import type` for type-only imports.
- Prioritise Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Map errors to `AppError`; ignore deliberate cancellations with `isAbortError`.
- Long-running or filterable views must pass an `AbortSignal` so a late response cannot overwrite
  newer state. Every `GameOnClient` method accepts one.
- `eslint .` and `vue-tsc --noEmit` must both be clean before a change is considered done.

## Build, Checks & Tests

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

## Pitfalls

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
  **view filter inside `CrewLadder`** (`buildLadder` in `app/utils/lol-ladder.ts`) and must stay one: `useLolStore.fetchPlayers()` has to keep
  returning every account, because `LolPlayerHeader` and `LolGameDetailsPlayer` walk `players` to
  climb from a smurf to its main and the home feed (`buildFeed`) uses it to tell a crew participant
  from an outsider — filtering the store breaks the smurf badge and makes a smurf's games read as non-crew.
  The store's cache is temporal and ignores its arguments, so a `fetchPlayers(includeSmurfs)` would
  additionally serve the previous call's list for a minute. `/lol/Home` has no such parameter at all:
  its `crewRecords` always include smurfs, and passing one does nothing.
- **Crew scoping is already total; there is nothing to filter.** `GET /lol/summoner` takes
  `includeOutOfCrew` and defaults it to `false`, and `GameOnClient.getLeaguePlayers` pins it anyway so
  the assumption lives in the call. `GET /lol/Stats/global` has no crew parameter at all **because it
  needs none**: its records already contain only crew members (verified — none of the out-of-crew ids
  appears in any award). Do not add an `inCrew` filter on either side; there is nothing for it to
  remove, and on `/stats` no parameter exists to carry it.
- **A component that copies a prop into a `ref` freezes on the first value.** The former
  `home/StatCard.vue` did exactly that for its count-up animation and kept rendering the first figure
  it was mounted with, plainly wrong as soon as a filter re-queried the week. Count-ups now go through
  `useAnimatedNumber(() => value)`, which watches a getter. It starts on the real value rather than
  0, because the server already painted it; only later changes animate. Look for this pattern before
  blaming reactivity on the store or on `useAsyncData`.
- **Anything that depends on the viewer renders after mount on `/`.** The page is served from a
  shared SWR cache, so a "Vous", a "Vous êtes 3e" or a relative "il y a 4 min" rendered on the server
  would be cached and shown to everyone. `CrewLadder` resolves the current player behind an
  `isMounted` flag, the header keeps its account pill in `<ClientOnly>`, the sync chip only gets its
  clock in `onMounted`.
- **Under `nuxt dev`, the first load of `/` after an edit is the pre-edit render.** The SWR rule also
  applies in dev: the server answers with the cached HTML and revalidates behind it, so the client
  hydrates new code over old markup and logs hydration mismatches. Reload once more before chasing
  them — and if they persist, add a throwaway query string (`/?v=2`): the response carries
  `last-modified` without `max-age`, so the browser may replay its own heuristic cache of the old
  page even after the server has revalidated.
- **Entrance animations start from the server's state.** Bars, the win-rate ring and the rank-scale
  dots grow from 0 through `useEntered()`, a flag that is `false` on the server and on the first
  client render and flips after mount — so hydration matches and the transition plays from what was
  painted.
- **`/lol/Home` is asked for `window=Last7Days`, and everything it returns is ranked-only.** The
  API's default is the calendar week (Monday 00:00 Paris to now, against the previous full week —
  five days against seven on a Friday), which GameOn-Front still uses; the client writes `window`
  only when it departs from that default. With `Last7Days`, `weeklyActivity` and `factOfTheWeek` run
  from six days ago 00:00 Paris to now against the seven days before, and `windowStart` / `windowEnd`
  say so: the period chip is built from them, not from the reader's clock. Every figure counts
  Solo/Duo and Flex only, hence "parties classées". The ladder's `lpChange7Days*` is also a rolling
  7 days, on rank snapshots.
- **The window fields are optional on purpose.** `windowStart`, `days`, `activePlayers`,
  `winsLastWeek`/`lossesLastWeek` and `topPlayer` only exist on API builds from 2026-09-25; an older
  build ignores `window` and answers for the calendar week. Front and API ship separately, so the page
  degrades (no period chip, no per-day charts, no "surtout") instead of throwing — a missing
  `windowStart` fed to the date helpers is exactly what once turned `/` into a 500. **Deploy the API
  first.** `LiveStrip` likewise stops polling on a `404` from a build without `/lol/live`.
- **A day's `netLpChange` of `null` is not 0.** It means no account had a comparable pair of rank
  snapshots that day: the bar is simply not drawn. A genuine 0 is a flat grey tick.
- **`activePlayers` and `topPlayer.player` carry identity fields only** (ranks, form and
  `mainChampionName` are empty), and `mainChampionName` is only served by `GET /lol/summoner`: the
  podium and the player of the week read it from `useLolStore().players`, never from the DTO at
  hand. It replaced one `GET /lol/summoner/{id}?period=Month` per podium player.
- **`LiveStrip` is client-only and polls every 60 s**, the API's own cache duration: baked into the
  SWR-cached HTML of `/`, it would stack a minute of staleness on the API's. Its clock runs from
  `gameLengthSeconds` + the time since `retrievedOn`; `gameStart: null` means the loading screen.
- **Dates on the dashboard are Paris dates.** `app/utils/date.ts` formats and groups in
  `Europe/Paris` explicitly: a UTC server would put a 00:30 game under the previous day while the
  browser put it under the right one.
- **The smurf predicate lives in `app/utils/lol-smurf.ts` (`isSmurf` / `smurfIds`) and is the only
  copy.** It reads `!!primaryPlayerId && primaryPlayerId !== id && primaryPlayerId !== 0`; the two
  extra guards are load-bearing, because the API returns a self-referencing or zeroed
  `primaryPlayerId` on some mains and the short `!!primaryPlayerId` form would crown them smurfs.
  Import it, never re-inline it.
- **The home's smurf toggle is page state, not component state.** It lives in `index.vue` and reaches
  `CrewLadder` through `v-model:include-smurfs` and `RecentGames` through a plain prop, because one
  click has to move the whole dashboard. Only the ladder is still filtered in the browser, and only
  because the store has to keep every account for the smurf badge and the main-account links;
  `/lol/Home` and `/lol/Match/last` are both re-queried instead.
- **`/lol/Match/last` takes `includeSmurfs` and refills the page.** It drops a match only when
  **every** crew participant in it is a secondary account — a smurf playing alongside a main is still
  that main's game — and then tops the page back up with older matches, so a page of `size` stays a
  page of `size`. That refill is exactly what the earlier client-side filter could not do, and the
  reason this belongs in the request.
- **Changing that flag must reset the component's pagination.** `RecentGames` keeps its extra pages
  in a local `crewExtra`; those rows were fetched under the previous flag, so a `watch` on the prop
  clears them and sends `crewPage` back to 1 (and drops a smurf picked in the player chips). Without
  it, smurf-only games stay stranded in the list after being excluded and the next `loadMore` resumes
  from the wrong offset. `loadMore` forwards the flag too, or page 2 silently contradicts page 1.
- **The feed shows one card per game, not per crew member.** `/lol/Match/last` returns games, and a
  five-stack would otherwise fill the page with the same match. `buildFeed` (`app/utils/lol-feed.ts`)
  tells each game from its first crew member — a main account first when smurfs are excluded — and
  counts the others as a "+N" chip. A player chip switches the source to
  `/lol/match/player/{id}`, paginated separately, and the card then belongs to that player.
- **"Sans LP" is a statement, so it is only printed when true**: a remake or an unranked queue. A
  ranked game whose `rankChange` is `null` prints nothing, as everywhere else. A day heading sums the
  LP of its known games and omits the chip when none is known.
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
- **One game card for the home feed and the profile history: `LolGameCard`.** The home's version is
  the reference; the profile once had a card of its own and the two drifted apart (backgrounds,
  result label, LP column). Both lists feed it a `FeedEntry` from `buildFeed` — the profile passes
  its own `playerId`, so every card is that player's and the other crew members become the "+N"
  chip — and the profile sets `:show-player="false"`, titling the card with the champion instead of
  a name repeated on every row. Its breakpoints are container queries (600px for the KDA / clock
  columns, 700px for the items), so the list around it must be an `@container`: the profile's rail
  takes 376px from the history column on desktop.
- **`LolGameCard`'s text column needs its `minmax(0, 1fr)` track and `min-w-0` chain.** Without
  them the title's `truncate` never engages: its min-content width propagates up, and the chips
  beside the result push the KDA off the card.
- **The hero's splash is read once.** `LolPlayerHeader` prefers the crew list's `mainChampionName`
  and falls back to the profile's first `championStats` entry captured at setup — that list follows
  the period filter, and the backdrop must not change when the period does.
- **Charts drawn in a `preserveAspectRatio="none"` SVG stretch anything round.** The match page's
  line charts scale their 800×220 view box to the card, so a `<circle>` becomes an ellipse: their
  hover dot is an absolutely positioned `<span>` over the SVG, and their strokes carry
  `vector-effect="non-scaling-stroke"`. Keep both when adding a chart of that kind.
- **The gold race keeps one DOM order.** Its rows are laid out by `top` from their rank, but iterated
  in roster order: re-sorting the elements themselves would re-insert them and skip the slide.
- **Clip paths are document-wide ids.** `LolGameGoldChart` builds its two masks from `useId()`; a
  hard-coded id would be shared by any second instance.

## Known Gaps

- **No search by name on the API.** Only `GET /lol/summoner/{id:int}` exists, so the crew search
  palette resolves nicknames locally against the crew list (`filterPlayersByName` in
  `app/utils/player-search.ts`). It finds crew members only, and local resolution does not scale past
  the crew.
- **The feed filters count ranked games, the feed lists every queue.** A chip's count is the player's
  `activePlayers[].games` (ranked, 7 days); players seen in the feed without a ranked game get a chip
  without a count. There is no per-player "all queues over 7 days" figure upstream.
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

## Environment

Required: `NUXT_PUBLIC_GAME_ON_API_URL`, `NUXT_PUBLIC_KEYCLOAK_AUTHORITY`,
`NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NUXT_PUBLIC_KEYCLOAK_REALM`.
Optional: `NUXT_GAME_ON_API_URL` (overrides the proxy target server-side),
`NUXT_KEYCLOAK_CLIENT_SECRET` (only for a confidential Keycloak client; empty means public + PKCE).
The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

`typescript` is pinned to `^6.0.3` on purpose: `typescript-eslint` (via `@nuxt/eslint-config`) still
declares `typescript >=4.8.4 <6.1.0` and crashes under the v7 "Corsa" line. Re-check that peer range
before bumping.
