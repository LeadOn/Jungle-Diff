# JungleDiff

JungleDiff is a League of Legends stats tracker built with a strict Nuxt 4 architecture and Keycloak OIDC authentication.

## 🚀 Technology Stack

- **Framework:** Nuxt 4.5.2 (SSR enabled, `app/` structure)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS v4 + Flowbite Vue
- **State Management:** Pinia
- **Auth:** OIDC via Keycloak (`oidc-client-ts`)

## 📂 Architecture

- `app/pages/`: Page components and data orchestration using `useAsyncData`.
- `app/components/`: Reusable Vue components separated into `ui/` and `lol/` domains.
- `app/composables/`: Reusable logic, including API clients injections.
- `app/stores/`: Pinia stores (using setup function syntax).
- `app/utils/async-data.ts`: `getCachedData` helper (`cacheOnlyDuringHydration`) for `useAsyncData` calls
  whose data must be re-fetched on client navigation instead of being pinned to the first page load.
- `app/lib/api/`: Centralized HTTP services handling standardized errors and automated token injection.

## 🔑 Authentication
The app connects to Keycloak (`gameon` realm). The global auth middleware (`app/middleware/auth.global.ts`) intercepts navigation and securely logs in users, preventing infinite loops during the OIDC callback.

## 📊 Current State
- **Scaffolding:** Complete.
- **Dependencies:** Installed and audited (overrides configured for `nanoid` and `esbuild` vulnerabilities).
- **Authentication:** Operational.
- **Pages:** Home, Summoner Profile, and Match Details are built out.
- **Data freshness:** the home page (crew stats, ladder, recent games) used to keep the values of the very
  first page load for the whole SPA session — coming back from a player profile showed stale ranks until a
  manual refresh. The `lol` store now stamps each successful load and reuses it for 60 s only, and the
  matching `useAsyncData` calls opt out of Nuxt's per-key cache after hydration via
  `cacheOnlyDuringHydration`. Both halves are required: the store window alone never runs, and forcing the
  handler alone flips `pending` back to true during hydration and breaks the SSR match.
- **LoL Patches:** Integration with Riot Data Dragon via SSR-friendly Pinia store and ddragon utils is fully operational.
- **Homepage:** Recent Games logic mapped to Riot API with dynamic DDragon versioning.
- **Summoner Profile:** Rebuilt to match the "JungleDiff Profil v3" design — identity card, Solo/Duo & Flex rank cards, filterable/paginated match history (with per-game CS/min, dmg/min and vision stats), a real LP progression sparkline, and a real, period-filterable Performance KPI panel, all wired to the GameOn API.
- **Match Details** (`app/pages/game/[id]/[playerId].vue`): Rebuilt to match the "JungleDiff Partie (features-game)" design — win/loss-tinted header with rating & MVP/ACE accolade, per-team objectives row, key-moments strip, and four tabs (Vue d'ensemble, Film de la partie, Performance, Données brutes), all wired to real GameOn API match + timeline data. No `MockBadge` needed on this page.
- **Dependencies:** Bumped to latest compatible majors on 2026-08-28 (`@nuxtjs/i18n` v10, `@pinia/nuxt` v1 / `pinia` v4, `@nuxt/eslint` v1 / `eslint` v10, `flowbite-vue` v0.4, `oidc-client-ts` v3.5, `tailwindcss`/`@tailwindcss/vite` v4.3, `vue-tsc` v3.3). `typescript` stays pinned to `^6.0.3` — the new v7 "Corsa" native-compiler line breaks `typescript-eslint` (via `@nuxt/eslint-config`), which currently requires `typescript <6.1.0`. Build, `vue-tsc --noEmit`, and `eslint .` all confirmed working post-upgrade.

## 🛠️ Ongoing Modifications
- Implementation of a custom Dark/Light Design System based on CSS variables mapped to Tailwind v4.
- Complete redesign of the Homepage (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.
- Complete redesign of the Summoner Profile page. The Performance KPI grid is now wired to real data via `GET /lol/summoner/{id}?period=...` (`performanceStats` on `LeaguePlayer`). The Champions, Rôles and Duos side panels still have no backing aggregate endpoint on the GameOn API, so they currently render representative data flagged with a purple "Mock" badge (`app/components/ui/MockBadge.vue`) until that endpoint exists — see "Backend Gaps" below.
- Complete redesign of the Match Details page: header, objectives, key moments, and all four tabs (overview scoreboards + highlights; film timeline driving minimap/gold-race/kill-feed/gold-diff/stat charts; performance KPIs/radar/damage-profile/ranking charts; collapsible raw stats table) now match the "JungleDiff Partie (features-game)" Claude Design import, including its per-column responsive breakpoints. The film scrubber shows a live current-frame time readout (00:00 / current / end) alongside the track, matching the mockup.

## 🧩 Backend Gaps (blocking a fully real Summoner Profile)

`GameOnClient.getPlayerById(id, period?)` now calls `GET /lol/summoner/{id}?period=AllTime|Week|Month|ThreeMonths|SixMonths` (default `AllTime`), which returns a `performanceStats` aggregate (games/wins/losses, win rate, playtime, avg KDA, avg CS/min, avg dmg/min, avg vision score per game — `null` if no games in the window) on `LeaguePlayer`. This powers `PerformanceKpis.vue` with real data, no more `MockBadge` there.

Three panels on the Summoner Profile page (`ChampionsAside.vue`, `RolesAside.vue`, `DuosAside.vue`) still need per-player, per-period **aggregates** that don't exist yet, so they render as Mock. Raw fields these aggregates would be computed from already exist per match participant (`teamPosition`, `playerId`, `teamId`, `stats.{csPerMinute,damagePerMinute}`, `visionScore`), so a backend endpoint shaped roughly like:

```
GET /lol/summoner/{id}/stats?period=7d|30d|season
```
returning `{ topChampions[], roleShare[], topDuos[] }`

would let the front-end remove the remaining three `MockBadge` panels. Until then, `Rôles` and `Duos` could alternatively be computed client-side from an already-loaded batch of matches (the raw fields are present) if a stopgap is preferred over waiting on the backend.

## 🤖 AI Instructions Synchronization
> **Rule:** Any major change to the architecture, tech stack, or feature set must be reflected in `README.md` and all `.rules`/instruction files simultaneously.

## Development

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Lint code
npm run lint

# Build for production
npm run build
```
