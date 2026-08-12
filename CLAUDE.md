You are assisting with the JungleDiff project, a League of Legends stats tracker built with Nuxt 4.5.2.

# Technology Stack
- Nuxt 4.5.2 (SSR enabled, `app/` structure)
- Vue Composition API (script setup only)
- TypeScript (Strict mode, no `any`, explicit typing)
- Tailwind CSS v4 + Flowbite Vue
- Pinia (Setup stores only)
- OIDC Auth (oidc-client-ts for Keycloak)

# Architecture & Conventions
- `app/pages`: Orchestrate data loading (using `useAsyncData`) and layouts.
- `app/components`: Separate generic UI (`app/components/ui/`) from business components (`app/components/lol/`).
- `app/composables`: Reusable business logic and API injection.
- `app/stores`: State management via Pinia setup stores (e.g., `app/stores/lol.ts`).
- `app/lib/api`: Centralized typed API client (`BaseApiService`). Bearer token is strictly attached only for the GameOn API domain. No auth headers for Riot CDN.
- `app/lib/types`: Strict domain interfaces.

# Code Quality Constraints
- Always use `import type` for type-only imports.
- Vue components should prioritize Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Errors must be mapped to the standardized `AppError` model.
- Any section/value rendered without a backing API field or endpoint MUST be visually flagged with `app/components/ui/MockBadge.vue` (place it inside a `relative` parent; it self-positions top-right). Never present fabricated data as if it were live.

# Current Project State
- Project is scaffolded and successfully building.
- Custom Dark/Light Design System implemented with CSS variables.
- Homepage fully redesigned (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.
- Keycloak authentication flow is wired.
- API client layers for GameOn API and Riot CDNs are implemented.
- Recent Games on homepage integrated with dynamic match history logic (LolGameCard) mapping Riot API data, DDragon versions, and timezone rules.
- LoL patches integration with Riot Data Dragon via SSR-friendly Pinia store and ddragon utils is fully operational.
- Summoner Profile page (`app/pages/summoner/[id].vue`) rebuilt to match the "JungleDiff Profil v3" Claude Design import (identity card, Solo/Duo & Flex rank cards, filterable/paginated match history with per-game CS/min-dmg/min-vision stats, an LP progression sparkline, and a real Performance KPI panel) — all wired to real GameOn API data (`LeaguePlayer`, rank history, paginated match history, `GET /lol/summoner/{id}?period=...` performanceStats). The Champions, Rôles and Duos side panels still have no backing aggregate endpoint on the GameOn API, so they render representative data wrapped in `MockBadge` until that endpoint exists — desired endpoint shape documented in `README.md` under "Backend Gaps".
- `app/utils/lol-tier.ts` exposes a shared `rankScore()` helper (tier+division+LP → numeric score) used by both the rank-history chart (`RankHistory.vue`) and the new LP sparkline (`LpProgressionCard.vue`).

# IMPORTANT META-RULE: Synchronization
At every major modification (adding a feature, technical change, etc.), you MUST:
1. Update and synchronize ALL AI instruction files (`.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.agents/AGENTS.md`).
2. Update the `README.md` to reflect the project's architecture, its current state, and the ongoing modifications.
