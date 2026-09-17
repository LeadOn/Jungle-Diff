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
- `/stats` — global crew records, filterable by queue, period and ranked-only, with one card per
  award defined in `app/utils/lol-awards.ts`.
- `/summoner/[id]` — player profile: identity card, Solo/Duo and Flex rank cards, a period-filtered
  performance KPI panel, an LP progression sparkline, a filterable and paginated match history, and
  Champions / Rôles / Duos side panels. Server-rendered.
- `/game/[id]/[playerId]` — match detail: win/loss-tinted header with MVP/ACE accolade, per-team
  objectives, key moments, then five tabs — Vue d'ensemble (scoreboards + highlights), Film de la
  partie (a timeline scrubber driving minimap, gold race, kill feed and charts), Performance (player
  picker, KPI tiles, radar and damage/gold/ranking charts), rAImmus (the AI coach report), and a
  collapsible Données brutes table.
- **rAImmus** — the AI coach, named after Rammus, rendered by
  `app/components/lol/game/LolGameCoachReport.vue`. The persona is a UI skin only: the routes stay
  neutral (`GET`/`POST /lol/coach/{matchId}/player/{playerId}`) and the report text comes from the
  model, never from the front end. `GET` returns the stored report or `404`; `POST` is authenticated
  and writes it. The component owns four states — not generated yet, generating, report, error — and
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
- `app/lib/api/BaseApiService` gives every call an 8 s timeout, one retry on reads and none on
  writes, maps failures to `AppError`, and encodes path segments via `encodePathSegment`. A call may
  raise its own ceiling through `RequestOptions.timeout`; only `generateCoachReport` does, and the
  proxy grants the same window to `SLOW_UPSTREAM_PREFIXES`. Both halves are required — raising one
  alone still gets the call cut at 8 s by the other.
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
- **The coach's `404` is nominal, not an error.** It means "nobody has asked for this analysis yet"
  and is the state that offers the button. `BaseApiService` turns it into an `AppError`, so map
  `statusCode === 404` onto `null` inside the `useAsyncData` handler or the tab reads as broken.
- **Generating a coach report blocks for ~15 s.** It is a strictly client-side `POST` — never inside
  a handler that runs during SSR — and it needs both the client and proxy timeout overrides above.
  A second `POST` is cheap (the API returns the stored report), so the button may stay live, but
  label it as reloading rather than promising a fresh opinion.
- **rAImmus' `noteSur10` is not the header's rating.** The header shows
  `LoLGameParticipantStat.Rating`, computed and reproducible; the coach's is editorial and can
  diverge by several points on the same game. Render it explicitly as rAImmus' opinion, or not at all.
- **`pointsForts` is legitimately empty sometimes.** The coach is told not to invent a compliment, so
  an empty array is an answer: render a sentence for it rather than an empty list.
- **The coach keys on the route's `playerId`, not the selected player.** The Performance picker walks
  all ten participants, but eight of them have no GameOn `playerId` and the API answers 404.

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
  `POST` is the one endpoint where that actually costs money, and only the crew's own authentication
  stands in front of it.
- **The front end never regenerates a coach report.** The API takes `?force=true` on the `POST` but
  honours it only for `gameon_admin`; nothing in the UI sends it, so a report written from a bad
  payload stays as it is and the button only ever reloads the stored one.
- **A `404` on the coach `POST` means the API does not have that match**, or that player did not play
  it — not that the endpoint is missing. Check which API the server is actually proxying before
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
