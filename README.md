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
- `app/lib/api/`: Centralized HTTP services handling standardized errors and automated token injection.

## 🔑 Authentication
The app connects to Keycloak (`gameon` realm). The global auth middleware (`app/middleware/auth.global.ts`) intercepts navigation and securely logs in users, preventing infinite loops during the OIDC callback.

## 📊 Current State
- **Scaffolding:** Complete.
- **Dependencies:** Installed and audited (overrides configured for `nanoid` and `esbuild` vulnerabilities).
- **Authentication:** Operational.
- **Pages:** Home, Summoner Profile, and Match Details skeletons are set up.

## 🛠️ Ongoing Modifications
- Implementation of a custom Dark/Light Design System based on CSS variables mapped to Tailwind v4.
- Complete redesign of the Homepage (Hero, Ladder, Recent Games) to match a sober, analytical gaming interface.

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
