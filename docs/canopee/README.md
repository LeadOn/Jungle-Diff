# Canopée handoff package

Everything an implementing agent needs to migrate JungleDiff to the Canopée design system (v8.2,
approved on 2026-10-28). Nothing here is imported by the app.

| Path | What it is |
|---|---|
| `PROMPT.md` | The first message to give the implementing agent (Gemini), and how to follow up. |
| `BRIEF.md` | The mission: decisions taken, non-negotiables, token-switch strategy, phases 0–8, the gate, pitfalls, when to ask. |
| `DESIGN-SYSTEM.md` | The written design rules (French), generated from the published design system and the home mock-up's design notes. |
| `tokens/canopee-main.css` | The tokens in the project's `main.css` convention (`:root` / `:root.dark` / `@theme`), with a temporary v7 bridge. Compiles with Tailwind 4.3.3. |
| `reference/home/` | Static mock-up of the page `/` on Canopée, with the crew's data of 2026-10-21. The reference for `/`. |
| `reference/design-system/` | The design system: direction, today's v7 home reproduced, foundations, components with states, the v8 home, tokens and migration order. |
| `tools/contrast-audit.mjs` | WCAG AA audit of every visible text, light and dark, desktop and mobile, through gradients and scrims (Playwright). |

## View the mock-ups

```bash
python3 -m http.server 8000 --directory docs/canopee/reference
```

Then open `http://localhost:8000/home/` and `http://localhost:8000/design-system/`. The design
system's views are `#direction`, `#v7`, `#fondations`, `#composants`, `#v8` and `#tokens`.

## Run the contrast audit

On the reference (it switches theme with `data-theme`):

```bash
node docs/canopee/tools/contrast-audit.mjs --theme attr http://localhost:8000/home/
```

On the app (`npm run dev` or the built server; it switches theme with the `.dark` class):

```bash
node docs/canopee/tools/contrast-audit.mjs http://localhost:3000/ http://localhost:3000/stats
```

All 24 combinations of the reference (6 views × 2 widths × 2 themes) pass at the time of writing.

## Notes

- `reference/*/img/` holds Riot images (Data Dragon 16.19.1 and CommunityDragon emblems), about
  1.6 MB per mock-up, so the mock-ups need no Riot request. They are content, not app assets. The
  mock-ups load Archivo and Geist Mono from Google Fonts, so they need a connection to render with
  the right fonts; the app itself self-hosts its fonts.
- ESLint lints this folder with the rest of the repository (`npm run lint`): keep it clean.
- The mock-ups were also published as private claude.ai artifacts; this folder is the offline copy
  and does not need them.
