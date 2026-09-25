# JungleDiff

JungleDiff is a League of Legends stats tracker built with a strict Nuxt 4 architecture and Keycloak
OIDC authentication.

## 🚀 Technology Stack

- **Framework:** Nuxt 4.5.2 (SSR enabled, `app/` structure, Nitro server routes under `server/`)
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS v4 with a custom CSS-variable design system
- **State:** Pinia (setup stores)
- **Auth:** Keycloak OIDC, implemented server-side in Nitro — no OIDC library ships to the browser
- **Assets:** `@nuxt/fonts` (self-hosted Archivo / Geist Mono), `@nuxt/icon` (lucide)
- **Charts:** `chart.js` + `vue-chartjs`

## 📂 Architecture

### Application (`app/`)

- `app/pages/` — page components and data orchestration via `useAsyncData`.
- `app/components/` — reusable components, split into `ui/`, `home/` and `lol/` domains. The layout
  mounts `ui/AppHeader`, `ui/AppBottomNav` (phones) and `lol/LolPlayerPalette` (crew search) once.
- `app/composables/` — reusable logic, including API client injection.
- `app/stores/` — Pinia stores. `usePatchStore` is a read-only view over `useLolStore.versions`, so
  there is exactly one Data Dragon version list per request.
- `app/lib/api/` — typed HTTP services. Every call carries a 120 s timeout, retries once on reads
  only (never on writes), maps failures to `AppError`, and encodes path segments. The ceiling is wide
  because the API is slow on its aggregates; it has to stay in step with the proxy's own timeout. A
  call can override through `RequestOptions.timeout`; nothing does today.
- `app/utils/async-data.ts` — `cacheOnlyDuringHydration`, a `getCachedData` helper for data that must
  be re-fetched on client navigation instead of being pinned to the first page load.
- `app/utils/theme.ts` — single entry point for reading and applying the theme.
- `app/utils/lol-ladder.ts`, `lol-feed.ts`, `date.ts` — the home page's pure logic: ladder order and
  gaps, one feed card per game, Paris-time day grouping.

### Server (`server/`)

- `server/api/auth/*` — the complete OIDC Authorization Code + PKCE flow: `login`, `callback`,
  `session`, `logout`.
- `server/api/gameon/[...path].ts` — authenticating proxy to the GameOn API. Reads the session
  cookies, attaches the bearer, and bounds reachable paths through an allowlist. One timeout for
  every route (120 s), matching `BaseApiService`. An upstream that never answers yields `502`, one
  that blows the ceiling `504`, so a slow API is not reported as a dead one.
- `server/api/ddragon/versions.get.ts` — Data Dragon versions, cached server-side for an hour with a
  24 h stale window.
- `server/middleware/security-headers.ts` and `server/plugins/csp.ts` — security headers and the
  per-render CSP nonce.
- `server/routes/healthz.get.ts` — dependency-free liveness probe for orchestrators.

### Shared (`shared/`)

Contracts used by both Nitro and the app (e.g. `SessionState`), imported via `#shared`.

## 📐 Conventions

**Components** — PascalCase files. Nuxt auto-imports everything under `app/components/` with the
directory path as a prefix, de-duplicating overlap: `ui/AppImage.vue` → `<UiAppImage>`,
`lol/ChampionsAside.vue` → `<LolChampionsAside>`, `lol/game/LolGameDetailsPlayer.vue` stays
`<LolGameDetailsPlayer>`. In practice `ui/` components are used through their prefixed name, while
pages import domain components explicitly to keep the short one. Components representing a LoL
entity are prefixed `Lol`; everything under `lol/game/` is prefixed `LolGame`; profile side panels
end in `Aside`.

**Stores** — `app/stores/<domain>.ts` exporting `use<Domain>Store` (`lol.ts` → `useLolStore`).

**Composables** — file named after the function (`useGameOnLol.ts` → `useGameOnLol`).

**Utils** — kebab-case; LoL-domain helpers carry a `lol-` prefix (`lol-tier.ts`, `lol-awards.ts`).
They are auto-importable but the codebase imports them explicitly everywhere — match that.

**Types** — LoL domain types are prefixed `LoL` (`LoLGameDto`); API payload shapes end in `Dto`.
`LeaguePlayer` and `LeagueOfLegendsRank` predate the convention and keep their names.

**Server routes** — `<name>.<method>.ts` (`session.get.ts`, `logout.post.ts`). The method suffix is
what restricts the verb; omitting it accepts every verb. Server utils are imported by relative path
rather than through Nitro's auto-import, so dependencies stay visible.

**Templates** — props and events in kebab-case (`:hero-player`, `@player-selected`), camelCase in
`<script setup>`. ESLint enforces it; `v-model` pairs use `update:<prop>`.

**Design tokens** — `app/assets/css/main.css` defines raw values on `:root` (`--color-gold`) and maps
them in `@theme` to what Tailwind exposes (`--color-brand-gold`). Write `bg-surface-base`,
`text-text-main`, `text-brand-gold` — never a raw hex in a component. **Light is the default theme**
(the v7 design palette) and the `.dark` class switches to a dark one; new code uses `dark:`, while
`light:` stays active whenever `.dark` is absent so the pages written dark-first keep their light
corrections. The custom `rail:` breakpoint (1100px) is declared in rem so Tailwind sorts it after
`md:`.

## 🔑 Authentication

Tokens never reach the browser. The OIDC flow runs entirely in Nitro and stores both the access and
refresh tokens in `httpOnly` + `SameSite=Lax` cookies; the client only ever learns _whether_ it is
signed in and as whom.

`offline_access` is requested deliberately — it backs the ~30-day persistent session so returning
visitors, especially on mobile, are not asked to sign in every day. That long-lived refresh token is
safe here precisely because it stays server-side; in a browser-storage design it would be the single
most valuable thing an XSS could steal.

Data calls go to `/api/gameon/...` and the proxy authenticates them. The only direct hits to the
GameOn API are anonymous `<img src>` URLs built from `config.public.gameOnApiUrl`.

## 🧠 rAImmus, the AI coach

rAImmus — Rammus + AI — is the coach on the match detail page, behind its own tab. He reads the game
and answers with a synthesis, what went well, what to work on, and a mark out of ten.

The name is a **UI skin, nothing more**: the routes stay neutral
(`GET`/`POST /lol/coach/{matchId}/player/{playerId}`) and the report text comes from the model, so
the persona lives only in `LolGameCoachReport.vue`'s French labels.

Five things shape the implementation:

- **Generation is queued, not synchronous.** A report takes ~50 s to write and the model's free tier
  allows 5 requests a minute, so the API serialises the work behind a single consumer. Both routes
  answer immediately: `200` with the report, or `202` with a `LoLCoachQueueStatusDto` carrying the
  position, the queue length and a server-computed estimate. `$fetch` resolves on a `202` like any
  other body, so both client methods return the `LoLCoachResponse` union and every call site
  discriminates through `isCoachQueued`. While queued, the component polls the `GET` every 5 s and
  shows the position and the remaining wait rather than an opaque spinner. `estimatedWaitSeconds` is
  a rolling average of the last ten real generations, so it moves from poll to poll and is rendered
  as it arrives.
- **The `GET`'s first 404 is nominal, a later one is not.** On the initial read it means "nobody has
  asked for this analysis yet" — the state that offers the button — so the handler maps
  `statusCode === 404` onto `null` rather than letting `useAsyncData` treat it as an error. The same
  404 arriving *while polling a queued slot* means the API gave up after five consecutive refusals
  from the model; it stops the poll and shows a failure with its own wording, because otherwise an
  abandoned generation is indistinguishable from the starting state.
- **The `POST` is authenticated, client-side and instant.** It either hands back a cached report or
  takes the slot, and the API deduplicates on `(matchId, playerId)`, so clicking twice returns the
  same position instead of buying a second generation.
- **`noteSur10` is not the rating in the page header.** That one comes from
  `LoLGameParticipantStat.Rating`, computed and reproducible; rAImmus' is editorial and can land
  several points away on the same game. It is rendered as "l'avis de rAImmus", with the distinction
  spelled out next to it.
- **The report keys on the route's `playerId`**, never on the player picked in the Performance tab:
  eight of the ten participants have no GameOn id and would come back 404.

`generatedOn` and `modelName` are shown in the card's footer, alongside a plain statement that the
text was written by an AI.

## 🛡️ Security Posture

- Nonce-based Content Security Policy: `script-src 'self' 'nonce-…'`, `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri`/`form-action` locked to `'self'`, and `connect-src` restricted to
  our own origin plus the Riot CDNs — so an injected script has nowhere to send stolen data.
- `X-Content-Type-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`,
  and HSTS when served over TLS.
- Route params are encoded before reaching the API, and the proxy rejects path traversal outright.
- `?redirect=` on the login route accepts internal paths only, closing the open-redirect vector.
- No third-party runtime dependencies: fonts and external favicons are self-hosted, so no visitor
  request leaks to Google.

## ⚙️ Configuration

Copy `.env.example` to `.env`:

| Variable                         | Required | Purpose                                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------- |
| `NUXT_PUBLIC_GAME_ON_API_URL`    | yes      | GameOn API base URL (proxy target and image host)                         |
| `NUXT_PUBLIC_KEYCLOAK_AUTHORITY` | yes      | Realm issuer URL                                                          |
| `NUXT_PUBLIC_KEYCLOAK_CLIENT_ID` | yes      | Keycloak client id                                                        |
| `NUXT_PUBLIC_KEYCLOAK_REALM`     | yes      | Realm name                                                                |
| `NUXT_GAME_ON_API_URL`           | no       | Overrides the proxy target server-side; defaults to the public URL        |
| `NUXT_KEYCLOAK_CLIENT_SECRET`    | no       | Only for a confidential Keycloak client; empty means public client + PKCE |

The Keycloak client must allow `<origin>/api/auth/callback` as a redirect URI.

## 📊 Current State

- Production hardening pass completed on 2026-09-16. `vue-tsc --noEmit`, `eslint .` (0 errors,
  0 warnings) and `nuxt build` all pass, and every page was verified in a real browser with a clean
  console.
- **Auth** reworked into the server-side flow described above; `oidc-client-ts` removed.
- **Resilience:** timeouts and bounded retries on every outbound call. Data Dragon versions are
  cached server-side — previously _two_ uncached CDN calls fired on every SSR render, so any Riot CDN
  slowdown propagated to every page.
- **Correct HTTP semantics:** unknown players and matches now return a real 404 with the branded
  error page instead of a 200 carrying an error panel.
- **SEO:** the Summoner Profile is server-rendered; it used to be client-only and was served empty to
  crawlers, with `useSeoMeta` describing a player not yet loaded.
- **Data freshness:** the home page (crew stats, ladder, recent games) used to keep the values of the
  very first page load for the whole SPA session. The `lol` store now stamps each successful load and
  reuses it for 60 s only, and the matching `useAsyncData` calls opt out of Nuxt's per-key cache after
  hydration via `cacheOnlyDuringHydration`. Both halves are required: the store window alone never
  runs, and forcing the handler alone flips `status` back to `pending` during hydration and breaks
  the SSR match.
- **Dependencies:** `flowbite-vue` and `@nuxtjs/i18n` removed — neither had a single usage, and the
  UI is hardcoded French. `typescript` stays pinned to `^6.0.3`; the v7 "Corsa" line still breaks
  `typescript-eslint` (via `@nuxt/eslint-config`), which requires `typescript >=4.8.4 <6.1.0`.
  `npm audit` reports 0 vulnerabilities.
- **Pages:** Home, Summoner Profile and Game Detail are wired to real GameOn API data.
- **rAImmus** (2026-09-17): the AI coach tab on the match detail page, backed by the GameOn
  `/lol/coach` endpoints. Generation is authenticated and on demand — nothing is written unless a
  crew member asks for it. Since the API moved generation onto a queue, the tab shows the position
  in that queue and the estimated wait, polling until the report lands.
- **LP per game** (2026-09-23): the GameOn API now carries a nullable `rankChange` on each match
  participant. The match history cards and the match page scoreboards show the LP won or lost on the
  game, with the rank before and after on hover and a highlighted chip when the game promoted or
  demoted the player. `null` (LP not attributable to a single game) renders nothing; 0 is shown.
  On the profile, the "Progression classement" card adds a bar per ranked game under the rank
  sparkline (`GET /lol/summoner/{id}/rank/changes`), with the average gain on wins and loss on
  defeats; a game with unknown LP stays on the axis as a grey bar.
- **Tests & container:** 18 Playwright tests, 14 of which need no upstream, plus a non-root Node 24
  image with a health probe. `vue` is pinned to `^3.5.42`; it was `latest`, which let two installs a
  week apart produce different builds. Delivery is manual — see "Checks Before Deploying".
- **Design v7** (2026-09-25): the home page was rebuilt from the Claude Design mock-up
  "JungleDiff Accueil v7", which is now the design base for the whole site. The new tokens (light
  sage palette, Archivo / Geist Mono, pill controls, soft shadows), the sticky header, the footer and
  the mobile bottom bar apply everywhere; the other pages inherit the palette and typography and keep
  their layouts until they are redesigned in turn. The home page itself: a bento of the week, the
  crew ladder as a podium + rank scale + rows, the recent games grouped by day with player filters,
  and a rail with the player of the week, the month's records and the crew's champions. A dark theme
  derived from the brand guidelines stays available from the header (the mock-up has none). The
  crew search is back, as a command palette (⌘K / Ctrl K, "/").
- **Home on live data** (2026-09-25): the GameOn API now serves everything the v7 home needs, and the
  temporary placeholders are gone. `GET /lol/Home?window=Last7Days` gives a rolling 7-day window with
  its bounds, a per-day breakdown (games, playtime, net LP), the active players, and last week's wins
  and losses; `crewRecords.topChampions[].topPlayer` names each champion's main player;
  `GET /lol/summoner` carries each account's `mainChampionName` (the podium backdrops, previously one
  profile call per player); `GET /lol/live` lists the crew's games in progress (spectator-v5 behind a
  one-minute cache), polled by the "En partie maintenant" strip. The front tolerates an API build
  without these fields (it degrades rather than fails), but the API should be deployed first.

## 🧩 Backend Gaps

**No rate limiting in front of the coach.** The proxy's allowlist bounds paths, not request volume,
and the coach `POST` is the one endpoint where a request costs real money. The API's queue and its
`(matchId, playerId)` deduplication now bound the spend, but only the crew's own authentication
stands in front of the endpoint itself. The API does accept `?force=true` on the `POST` to
rewrite a report, but honours it for `gameon_admin` only and nothing in the UI sends it — so from the
front end a report is written once and a poor one stays as it is.

**No search by name.** The only profile route is `GET /lol/summoner/{id:int}`, so the search palette
resolves nicknames client-side against the crew list (`app/utils/player-search.ts`). That works for a
closed crew but will not scale to arbitrary summoners.

**The home page's weekly figures are ranked-only.** `/lol/Home` counts Solo/Duo and Flex only, so the
page says "parties classées", and the feed filters count ranked games while the feed itself lists
every queue: there is no per-player "all queues over 7 days" figure upstream.

**No crew-wide resync.** The "Synchro" chip re-reads the API; asking the API to re-synchronise every
account with Riot would need an endpoint that does not exist (only the per-player `PATCH`).

Everything else is backed by real endpoints. `GameOnClient.getPlayerById(id, period?)` calls
`GET /lol/summoner/{id}?period=AllTime|Week|Month|ThreeMonths|SixMonths` (default `AllTime`) and
returns a `performanceStats` aggregate on `LeaguePlayer` — games/wins/losses, win rate, playtime,
avg KDA, avg CS/min, avg dmg/min, avg vision score, plus `championStats`, `roleStats` and
`duoStats`. It powers `PerformanceKpis.vue` and the Champions / Rôles / Duos side panels alike. **No
`MockBadge` is rendered anywhere in the app.**

## ✅ Checks Before Deploying

There is **no CI pipeline** — delivery is manual, so nothing runs these for you. Run the whole list
before a deploy:

```bash
npm run lint              # must be 0 errors and 0 warnings
npx vue-tsc --noEmit      # must be clean
npm run sync:rules:check  # generated instruction files still match their source
npm audit --omit=dev --audit-level=high
npm run build             # required before the e2e suite; it boots .output
npm run test:e2e
```

`tests/smoke.spec.ts` needs **no upstream and no secrets**: it passes with no GameOn API and no
Keycloak at all, covering the security headers and CSP nonce, the proxy's allowlist and
path-traversal guards, the anonymous session contract, real 404 status codes, and that the home page
still serves a 200 when the API is unreachable. The specs that need live data skip themselves when
`NUXT_PUBLIC_GAME_ON_API_URL` is unset — source `.env` first to exercise those too.

Tests run against the **production build**, never `nuxt dev`: the CSP nonce, SWR route rules and 404
status codes all behave differently under Vite's dev middleware, so testing the dev server would
test something that never ships. A server already listening on the port is reused, stale `.output`
included, so rebuild before a run whose result has to be trusted.

## 🐳 Container

- Node 24 LTS. The previous image pinned 23.6.1 — an odd-numbered release that never had long-term
  support and is now end-of-life.
- `npm ci`, so the image cannot drift to different dependency versions between builds.
- Runs as `USER node`. It previously ran as uid 0, which meant a remote code execution in the app
  would have started with full privileges inside the container.
- `HEALTHCHECK` against `/healthz`. The probe deliberately does **not** call the GameOn API: one
  that did would restart JungleDiff during a backend incident and make the outage worse.
- The runtime image contains only `.output`; Nitro bundles every server dependency, so there is no
  `node_modules` and no package manager in the shipped image.
- **Nothing builds or boots this image automatically.** Build and smoke-test it by hand when the
  Dockerfile changes:

  ```bash
  docker build -t junglediff .
  docker run --rm -p 3000:3000 --env-file .env junglediff
  curl -fsS http://localhost:3000/healthz
  ```

- No `NUXT_PUBLIC_*` value is baked in at build time — every one is read from the environment at
  container start, so a single image is promotable across environments.

## 🤖 AI Instructions Synchronization

`.agents/instructions.base.md` is the **single source of truth**. `.cursorrules`, `.windsurfrules`,
`CLAUDE.md`, `.github/copilot-instructions.md` and `.agents/AGENTS.md` are generated from it and must
never be edited by hand:

```bash
npm run sync:rules
```

`npm run sync:rules:check` exits non-zero if any generated file has drifted from its source. It is part of the pre-deploy list above.

Any major change to the architecture, tech stack, or feature set must be reflected in
`.agents/instructions.base.md` and `README.md` together.

## Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Type-check, lint, and build
npm run typecheck
npm run lint
npm run build

# End-to-end tests (needs a server on http://localhost:3000)
npm run test:e2e:install   # once, to fetch the browser
npm run test:e2e
```
