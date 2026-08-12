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
- `app/lib/api`: Centralized typed API client (`BaseApiService`). Bearer token is strictly attached only for the GameOn API domain. No auth headers for Riot CDN.
- `app/lib/types`: Strict domain interfaces.

## Code Quality Constraints
- Always use `import type` for type-only imports.
- Vue components should prioritize Tailwind utility classes over inline styles.
- Avoid heavy transformations in templates; use computed properties or composables.
- Errors must be mapped to the standardized `AppError` model.

## Current Project State
- Project is scaffolded and successfully building.
- Custom Dark/Light Design System implemented with CSS variables.
- Homepage fully redesigned (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.
- Keycloak authentication flow is wired.
- API client layers for GameOn API and Riot CDNs are implemented.
- Recent Games on homepage integrated with dynamic match history logic (LolGameCard) mapping Riot API data, DDragon versions, and timezone rules.
- LoL patches integration with Riot Data Dragon via SSR-friendly Pinia store and ddragon utils is fully operational.
