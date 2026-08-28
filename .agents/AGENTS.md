# Project Guidelines: JungleDiff

You are assisting with the JungleDiff project, a League of Legends stats tracker built with Nuxt 4.5.2.

## IMPORTANT META-RULE: Synchronization
At every major modification (adding a feature, technical change, etc.), you MUST:
1. Update and synchronize ALL AI instruction files (`.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, and this `.agents/AGENTS.md`).
2. Update the `README.md` to reflect the project's architecture, its current state, and the ongoing modifications.

## Technology Stack
- Nuxt 4.5.2 (SSR enabled, `app/` structure)
- Vue Composition API (script setup only)
- TypeScript (Strict mode, no `any`, explicit typing)
- Tailwind CSS v4 + Flowbite Vue
- Pinia (Setup stores only)
- OIDC Auth (oidc-client-ts for Keycloak)

## Architecture & Conventions
- `app/pages`: Orchestrate data loading (using `useAsyncData`) and layouts.
- `app/components`: Separate generic UI (`app/components/ui/`) from business components (`app/components/lol/`).
- `app/composables`: Reusable business logic and API injection.
- `app/stores`: State management via Pinia setup stores (e.g., `app/stores/lol.ts`).
- Data that must stay fresh (`lol` store: home stats, ladder players, last matches) is cached behind a
  60 s freshness window rather than for the whole SPA session, and its `useAsyncData` callers pass
  `getCachedData: cacheOnlyDuringHydration` (`app/utils/async-data.ts`) so the handler is replayed on
  client navigation without breaking hydration. Without both, returning to a page reused the values
  from the very first load until a manual refresh.
- `app/lib/api`: Centralized typed API client (`BaseApiService`). Bearer token is strictly attached only for the GameOn API domain. No auth headers for Riot CDN.
- `app/lib/types`: Strict domain interfaces.

## Code Quality Constraints
- Always use `import type` for type-only imports.
- Vue components should prioritize Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Errors must be mapped to the standardized `AppError` model.
- Any section/value rendered without a backing API field or endpoint MUST be visually flagged with `app/components/ui/MockBadge.vue` (place it inside a `relative` parent; it self-positions top-right). Never present fabricated data as if it were live.

## Current Project State
- Project is scaffolded and successfully building.
- Custom Dark/Light Design System implemented with CSS variables.
- Homepage fully redesigned (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.
- Keycloak authentication flow is wired.
- API client layers for GameOn API and Riot CDNs are implemented.
- Recent Games on homepage integrated with dynamic match history logic (LolGameCard) mapping Riot API data, DDragon versions, and timezone rules.
- LoL patches integration with Riot Data Dragon via SSR-friendly Pinia store and ddragon utils is fully operational.
- Summoner Profile page (`app/pages/summoner/[id].vue`) rebuilt to match the "JungleDiff Profil v3" Claude Design import (identity card, Solo/Duo & Flex rank cards, filterable/paginated match history with per-game CS/min-dmg/min-vision stats, an LP progression sparkline, and a real Performance KPI panel) — all wired to real GameOn API data (`LeaguePlayer`, rank history, paginated match history, `GET /lol/summoner/{id}?period=...` performanceStats). The Champions, Rôles and Duos side panels still have no backing aggregate endpoint on the GameOn API, so they render representative data wrapped in `MockBadge` until that endpoint exists — desired endpoint shape documented in `README.md` under "Backend Gaps".
- `app/utils/lol-tier.ts` exposes a shared `rankScore()` helper (tier+division+LP → numeric score) used by both the rank-history chart (`RankHistory.vue`) and the new LP sparkline (`LpProgressionCard.vue`).
- Game detail page (`app/pages/game/[id]/[playerId].vue`) rebuilt to match the "JungleDiff Partie (features-game)" Claude Design import: win/loss-tinted header (splash art, rating badge, MVP/ACE accolade, sync action), per-team objectives row, key-moments strip, and four tabs — Vue d'ensemble (per-team scoreboards with responsive column drop at the same breakpoints as the mockup, plus highlights), Film de la partie (single timeline scrubber driving the minimap, gold race, kill feed, gold-difference chart and per-champion stat chart), Performance (player picker, KPI tiles, radar + damage-profile + gold + stat charts, damage and ranking comparison bars), and a collapsible Données brutes table. Every value is wired to real GameOn API match/timeline data via `useGameOnLol` — no `MockBadge` needed on this page.
- Dependencies bumped to latest compatible majors (2026-08-28): `@nuxtjs/i18n` v10, `@pinia/nuxt` v1 / `pinia` v4, `@nuxt/eslint` v1 / `eslint` v10, `flowbite-vue` v0.4, `oidc-client-ts` v3.5, `tailwindcss`/`@tailwindcss/vite` v4.3, `vue-tsc` v3.3. `typescript` is intentionally pinned to `^6.0.3` rather than the new v7 "Corsa" native-compiler line — `typescript-eslint` (pulled in by `@nuxt/eslint-config`) only supports `typescript <6.1.0` as of this date and crashes under v7; revisit once that ecosystem adds v7 support. Build, `vue-tsc --noEmit`, and `eslint .` all verified working post-upgrade (existing pre-upgrade lint warnings/errors are unrelated code-quality debt, not upgrade regressions).
