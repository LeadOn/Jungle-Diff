# Mission brief — migrate JungleDiff to the Canopée design system (v8)

You are implementing a redesign that has already been designed, reviewed and approved. Your job is
to bring the whole site onto it **without losing a single feature**, in verified increments. You are
not asked to design: where this brief, `DESIGN-SYSTEM.md` and the reference mock-ups are silent,
apply their rules; where they cannot decide, stop and ask.

## 0. Read first, in this order

1. `.agents/AGENTS.md` (identical to `CLAUDE.md`): the project's rules, architecture and pitfalls.
   Everything in it still applies. This brief only adds to it, and says so where it changes a rule.
2. This file, entirely, before touching code.
3. `docs/canopee/DESIGN-SYSTEM.md`: the written design rules (French, the product's language).
4. The reference mock-ups (static HTML, real crew data captured on 2026-10-21):
   - `docs/canopee/reference/home/` — **the reference for the page `/`**.
   - `docs/canopee/reference/design-system/` — foundations, every component with its states, the
     tokens and the migration order. Its "Accueil v8" view is an earlier take on the home: where it
     differs from `reference/home/` (it has a "tableau des scores" where the home has the week
     ledger), `reference/home/` wins.
   - View them with `python3 -m http.server 8000 --directory docs/canopee/reference`, then open
     `http://localhost:8000/home/` and `http://localhost:8000/design-system/` (views: `#direction`,
     `#fondations`, `#composants`, `#v8`, `#tokens`; `#v7` reproduces today's home for comparison).
5. `docs/canopee/tokens/canopee-main.css`: the tokens in the project's convention, with a v7 bridge.
   It compiles with the repository's Tailwind 4.3.3 (checked).

Exact visual values (sizes, radii, gaps, colours, breakpoints) are in the reference CSS
(`reference/home/canopee-core.css`, `reference/home/home.css`, `reference/design-system/canopee.css`).
When the prose and the CSS disagree on a number, **the CSS wins**. The markup in `home.js` /
`app.js` shows structure and states; do not port its vanilla JS patterns into Vue.

## 1. Decisions already taken (do not reopen them)

| Topic | Decision |
|---|---|
| Scope | The whole site: layouts, `/`, `/stats`, `/summoner/[id]`, `/game/[id]/[playerId]`, `/settings`, `/admin/**`, `error.vue`, the crew search palette, header, footer, mobile bar. |
| Tier colours | They stay **data colours in `app/utils/lol-tier.ts`** (`TIER_TINTS` / `tierTint`). Replace their values with the Canopée OKLCH values (listed at the top of `tokens/canopee-main.css`). Components receive a tier colour through an inline custom property, e.g. `:style="{ '--tier': tierTint(rank.tier) }"`, and the CSS reads `var(--tier, var(--tier-none))`. Do **not** add `--t-*` / `--color-tier-*` tokens to `main.css` (the reference CSS has them; that is the one part of it you must not copy). `CLAUDE.md`'s rule "Tier pastels are data colours in `lol-tier.ts`, not tokens" stays true. |
| Text over images | **No text halo anywhere.** `text-shadow-photo` is removed from every component and then from `main.css`. Text over splash art passes WCAG AA through a scrim (`bg-scrim-rise`, `bg-scrim-side`, `bg-photo-scrim`) or sits on a night pill (`bg-night/80` + `text-on-night`), never through a shadow. This replaces `CLAUDE.md`'s "Text over splash art gets `text-shadow-photo`" rule; update that rule in phase 8. |
| Splash art | On the home page: the three podium cards and the player of the week, nowhere else. On `/summoner/[id]` and `/game/[id]/[playerId]`: the existing hero keeps its splash (one per page), redrawn with the Canopée scrim and no halo. No new splash art anywhere. |
| Ladder | Podium (3 cards over each player's main champion) + "L'échelle des rangs" + list, as in v7 — the earlier "Tour" proposal is abandoned. |
| Game card | The v7 `LolGameCard` look, redrawn with Canopée tokens (result-tinted gradient, 5 px rail, "VICTOIRE/DÉFAITE" caps, 52 px portrait with a level pill, items under the meta line). Still one card for the home feed and the profile history. |
| Theme | Light by default, dark through the `.dark` class (unchanged mechanism, `app/utils/theme.ts`, `public/theme-init.js`). |
| Gold | Only for: the #1 of the ladder, "Vous", the mobile search button, the focus ring in dark. |

## 2. Non-negotiables

All of `CLAUDE.md` applies. The points most at risk during a redesign:

- **Every feature survives.** Before restyling a component, list what it does (props, events, states,
  links, empty/loading/error states, a11y attributes, `data-testid`s used by `tests/`). After, check the
  list. `DESIGN-SYSTEM.md` → "Accueil v8 — notes de conception" → "Ce qui n'a pas disparu" is the
  home's checklist; write the equivalent for every other page before you start it.
- No API, store, composable or route change unless a visual change strictly needs it (it should not).
  Data flow, SSR, caching, auth and every pitfall in `CLAUDE.md` stay as they are — in particular:
  viewer-dependent UI after mount on `/`, `useEntered()` for entrance animations, `cacheOnlyDuringHydration`,
  the smurf toggles' two mechanisms, `null` vs `0` for `rankChange` and `netLpChange`, `matchId` not `id`.
- Code and comments in English; every user-facing string stays French (copy the French wording of
  the mock-ups where a string changes; keep the existing wording otherwise).
- `<script setup>`, TypeScript strict, no `any`, `import type`, explicit imports of `app/utils/*`.
- **No raw colour in a component**: no hex, `rgb()`, `oklch()` or named colour in `.vue` templates,
  `<style>` blocks or class strings. Colours come from tokens (Tailwind utilities) or, for tiers and
  chart series, from `lol-tier.ts` / the match-page tokens. Check with:
  `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(|hsl\(" app --glob '*.vue'` — every hit must be justified.
- Tailwind utilities over inline styles; the only inline styles allowed are data-driven custom
  properties (`--tier`, positions on the rank scale, bar heights).
- Container queries for components that live in columns of varying width (the reference uses them
  everywhere: ladder 560/640/760 px, game card 600/700 px). Tailwind v4 has them built in
  (`@container` on the parent, `@min-[560px]:` on the children; checked on 4.3.3).
- New dependencies: only `subset-font` (dev, if `@nuxt/fonts` asks for it — see phase 3). Nothing else
  without asking.
- No push, no PR. Commit at the end of each phase on a branch `features/canopee` (create it from `main`),
  message `Canopée phase N: <what>`, ending with the attribution line your setup requires.
- Never delete a file you did not create without asking (`app/components/home/LiveGameCard.vue` is
  unreferenced on purpose: ask).

## 3. How the token switch works (read before phase 1)

The Canopée Tailwind names collide with today's names. `tokens/canopee-main.css` explains each
collision at its top; the plan relies on two facts:

1. `--color-ink` means "the always-dark band" in v7 (`bg-ink`, `text-ink-text`, `text-ink-muted`) and
   "body text" in Canopée (`text-ink`). So phase 1 renames every v7 `ink` utility to `night` while the
   v7 palette is still in place: a pure rename with no visual change.
2. Every other v7 utility keeps working because the file's **v7 bridge** re-points the v7 names
   (`bg-surface-base`, `text-text-main`, `text-brand-gold`, `bg-win-soft`, `text-team-blue-text`, …)
   at the Canopée raw values. Phase 2 therefore switches the palette of the whole site at once, and
   the later phases restyle components with the Canopée names (`bg-surface`, `text-ink-2`,
   `rounded-5`, `type-d2`, `fig`, …). Phase 7 deletes the bridge when nothing uses it.

Map of the main names (v7 → Canopée), for restyling:

| v7 utility | Canopée utility |
|---|---|
| `bg-bg-base` | `bg-paper` |
| `bg-surface-base` | `bg-surface` |
| `bg-surface-high`, `bg-surface-sunken` | `bg-sunken` |
| `bg-surface-hover` | `hover:bg-sunken` (on a surface) |
| `bg-surface-highlight`, `bg-brand-gold-soft` | `bg-gold-soft` |
| `border-border-base` | `border-line` |
| `border-border-accent`, `border-border-dashed` | `border-line-strong` |
| `text-text-main` / `-sec` / `-ter` | `text-ink` / `text-ink-2` / `text-ink-3` |
| `text-brand-gold` | `text-gold-ink` |
| `bg-brand-gold-bright` | `bg-gold` (with `text-on-tier`) |
| `text-brand-green` / `text-brand-red` | `text-win-ink` / `text-loss-ink` |
| `bg-win`, `bg-win-soft`, `bg-loss`, `bg-loss-soft` | unchanged names |
| `bg-ink` / `text-ink-text` / `text-ink-muted` (v7) | `bg-night` / `text-on-night` / `text-on-night-2` |
| `bg-inverse` / `text-inverse-text` | `bg-ink` / `text-paper` (after phase 1 freed the name) |
| `text-on-photo-*`, `text-signal` | `text-on-night-win` / `-loss` / `-gold` / `-blue` |
| `bg-team-blue(-text/-soft)`, `bg-team-red(...)` | `bg-side-blue(-ink/-soft)`, `bg-side-red(...)` |
| `text-violet`, `bg-violet-soft` | `text-violet-ink`, `bg-violet-soft` |
| `bg-surface-selected` | `bg-picked` |
| `shadow-card-hover`, `shadow-hero`, `shadow-podium(-hover)` | `shadow-card` (+ `ring-2 ring-gold` for the #1) |
| `bg-scrim-hero` | `bg-scrim-side` |
| `bg-scrim-soft` | `bg-photo-scrim` |
| `bg-page-wash` | nothing (plain `bg-paper`) |
| `rounded-[20px]`…`rounded-[26px]`, `rounded-2xl`, `rounded-3xl` on cards | `rounded-5` (18 px) |
| pill controls (`rounded-full` on buttons, segments, chips) | buttons and fields `rounded-2`; segments `rounded-2`; player filter chips stay `rounded-full` |

Type: Archivo with its width axis. Titles `type-d1` / `type-d2` / `type-d3` (118 % width), card titles
`type-title`, running text `type-body` / `type-small`, eyebrows `type-label`, every figure `fig`
(72 %, tabular), times, durations, patches, Riot tags and ids `type-mono` (Geist Mono).

## 4. Phases

Each phase ends with the **gate** (section 5) and a commit. Do not start a phase while the previous
gate is red. Report at the end of each phase: what changed, the gate output, before/after
screenshots of the pages it touched (both themes, 1440 and 375 px), and anything you were unsure of.

### Phase 0 — Baseline
- Branch `features/canopee` from `main`. Run the full gate on the untouched code and keep the output.
- Take before-screenshots of every page in light and dark at 1440 and 375 px (Playwright; the pages that
  need data need `.env` sourced; `/settings` and `/admin/**` need a session — if you have none, say so
  and skip them rather than faking one).
- Run the contrast audit (section 5) on `/`, `/stats`, one profile and one match: it records the v7
  baseline; v7 failures are not yours, but note them.

### Phase 1 — Free the name `ink`
- Rename every use of the v7 dark-band utilities: `bg-ink` → `bg-night`, `text-ink-text` →
  `text-on-night`, `text-ink-muted` → `text-on-night-2`, and every variant (`border-ink`, `from-ink`,
  `to-ink`, `ring-ink`, `/opacity` modifiers, `hover:`/`dark:` prefixes, class strings in `.ts`).
  In `main.css`, add `--color-night`, `--color-on-night`, `--color-on-night-2` pointing at the
  current v7 raw values, and remove `--color-ink*` from `@theme`.
- `rg -n "\b(bg|text|border|from|to|via|ring|fill|stroke|outline|divide|shadow|decoration)-ink(-text|-muted)?\b" app`
  must return nothing. Visual diff: none (compare with the phase 0 screenshots).

### Phase 2 — Switch the palette
- Replace the v7 colour, shadow and scrim definitions of `main.css` (the `:root` and `:root.dark`
  blocks, the colour part of `@theme`, the v7 `@utility` blocks and `body`) with
  `tokens/canopee-main.css`. Keep what that file does not cover: the `dark` / `light` custom variants,
  the `@keyframes` and `--animate-*` still in use, the other `@utility` blocks (`tabular-nums`, …).
- Put the Canopée tier values into `TIER_TINTS` (`lol-tier.ts`). Check every `tierTint` /
  `tierGlow*` caller still reads well (they now get OKLCH strings, which is valid CSS).
- Remove `text-shadow-photo` from every component **only where the text still passes AA without it**;
  where it does not, leave it for the phase that restyles that component (and list them).
- The whole site changes colour at once. Walk every page in both themes; run the contrast audit on
  `/`, `/stats`, a profile and a match. Fix contrast regressions by choosing the right token for the
  role, never by adding a raw colour.

### Phase 3 — Archivo's width axis
- In `nuxt.config.ts`: `{ name: 'Archivo', provider: 'google', weights: ['100 900'], variableAxis: { wdth: [{ min: 62, max: 125 }] } }`.
  `@nuxt/fonts` 1.0.1 then requires the dev dependency `subset-font`; add it with npm as a dev
  dependency (the Dockerfile's builder stage runs `npm ci`, which installs dev dependencies; the
  runtime image only holds `.output`).
- Prove the axis is served: in the browser, the width of the same word at `font-stretch: 72%`, `100%`
  and `118%` must differ (three different values). If it does not, self-host the Archivo variable
  font with a hand-written `@font-face { font-stretch: 62% 125%; font-weight: 100 900; }` under
  `public/` and drop Archivo from `@nuxt/fonts`. The CSP must stay third-party-free (no Google request
  at runtime).

### Phase 4 — UI primitives (`app/components/ui/`)
Build them from the reference CSS ("Composants" view), with props and slots, keyboard and focus states,
French labels passed in by the caller. Suggested names (auto-imported with the `Ui` prefix):
`UiButton` (primary / secondary / quiet / icon / gold; 28 / 36 / 44 px; busy and disabled states),
`UiSegmented` (`v-model`), `UiSwitch` (`role="switch"`, `v-model`), `UiPlayerChip` (avatar + name +
count, `aria-pressed`), `UiPanel` (card, optional head with title and link), `UiStatus` (Vous, Smurf,
Archivé, En partie, +N), `UiSkeleton`, `UiEmptyState`, `UiErrorState`. Domain ones go under
`app/components/lol/`: `LolLpBadge` (or restyle `LolRankChangeBadge`, keeping its tooltip and its
`light:` corrections until phase 7), `LolFormPills` (with its `aria-label`), `LolRankEmblem`.
No page uses them yet except a temporary check that each renders in both themes.

### Phase 5 — The home page `/`
Reference: `reference/home/`. Map of the existing components:

| Mock-up block | Component(s) today | Notes |
|---|---|---|
| Header, search field, theme button, account | `ui/AppHeader.vue`, `lol/LolPlayerPalette.vue` | Sticky, `bg-header` + blur, 56 px. Palette: the only floating shadow; `bg-overlay` behind. ⌘K / Ctrl K / "/" unchanged. |
| Opening: status line (sync, window, patch), data-written headline and standfirst, smurf switch | `pages/index.vue` | Headline built from `weeklyActivity.netLpChange`, games, win rate, `topPlayer` (see the notes). The figure takes the result colour, nothing else. The sync clock and anything viewer-dependent stay after mount. The smurf switch keeps its current wiring (`v-model:include-smurfs`, re-queries `/lol/Home` and `/lol/Match/last`). |
| Week ledger (one column per Paris day, total column; pivots to one row per day under 760 px) | `home/WeekBento.vue` | Rename to `WeekLedger.vue` if you rebuild it (update every reference and the docs). `days[]` from `/lol/Home?window=Last7Days`; `netLpChange: null` draws no bar; old API builds without the window fields must still degrade, not throw. |
| "En partie" strip | `home/LiveStrip.vue` | Client-only, 60 s poll, stops on 404, live dot is the only infinite animation. |
| Ladder: podium, "L'échelle des rangs", list | `home/CrewLadder.vue`, `home/LadderPodiumCard.vue`, `home/RankTrack.vue`, `home/LadderRow.vue` | See below. |
| Feed: player chips, day headings, game cards, "Voir plus" | `home/RecentGames.vue`, `lol/LolGameCard.vue` | The card is shared with the profile; restyle it once. Keep `buildFeed`, the "+N" chip, pagination and the smurf-flag reset. |
| Rail: player of the week, month records, crew champions | `home/PlayerOfTheWeek.vue`, `home/MonthRecords.vue`, `home/CrewChampions.vue` | Sticky from 1100 px. Records and champions are lists in one panel each. |
| Footer, mobile bottom bar | `layouts/default.vue`, `ui/AppBottomNav.vue` | Mobile bar on `bg-night`, the search button in gold. |

Ladder specifics:
- Podium card (`LadderPodiumCard`): art from the player's `mainChampionName` splash (Data Dragon, as
  today) with `bg-photo-scrim`; medal pill (`1er` gold, others night) top-left, champion name in a night
  pill top-right; tier emblem and avatar (ringed with `--tier`) overlapping the art's bottom edge; name
  in `type-d3`-like wide bold, rank line in mono, a 7-day LP chip and a win-rate chip, then a dashed
  foot with "En tête du crew" / "−N LP de <name>" and the form pills. #1 taller and ringed in gold. When
  `mainChampionName` is missing, the art falls back to the blurred champion portrait or the tier colour
  (see `.pod-art.icon` in the reference).
- Rank scale (`RankTrack`): equal tier bands tinted with the tier colour, one avatar per ranked
  player with its position badge, laid out on lanes so avatars never overlap; the lane spacing must
  come from the scale's **measured width** (`ResizeObserver`), not from the viewport. The 7-day trail
  goes from where the player stood a week ago (LP score minus `lpChange7Days*`) to now. Give the scale `role="img"` and an
  `aria-label` that lists the players per tier (the reference builds that sentence). Bands, dots and the
  trail must render identically on the server and on hydration; measured lanes can only refine after
  mount without a layout jump (reserve the height).
- List (`LadderRow`): one panel with dashed separators; position disc in the tier colour, avatar, name
  with "Vous" / "Smurf", tag; from 560 px the emblem with tier and LP and the LP gap pill; from 760 px
  form pills and win rate; 7-day LP last. The "Vous" row on `bg-gold-soft`, its muted lines in `ink-2`
  (AA). Unranked accounts under a "Non classés · N" group.
- Reordering (queue switch, smurf toggle): podium cards, scale avatars and rows slide to their new
  place in 620 ms with `--ease-glide` (FLIP, `transform` only), nothing under
  `prefers-reduced-motion`. The rows' focus outline is drawn inside (`outline-offset: -3px`) because
  the panel clips.
- Keep everything `CLAUDE.md` says about the ladder: `buildLadder` filters smurfs in the browser, the
  store keeps every account, "Vous" resolves after mount, `useEntered()` for entrance motion.

### Phase 6 — Every other page, one per pass
There are no mock-ups for these pages: apply the foundations and the primitives, keep each page's
layout and information, and change only how it looks. Order and specifics:

1. **`/summoner/[id]`** (`LolPlayerHeader`, `LolPlayerRanks`, `PerformanceKpis`, `LpProgressionCard`,
   `LpChangesChart`, `RankHistory`, `ChampionsAside`, `RolesAside`, `DuosAside`, the history with
   `LolGameCard`). The hero keeps its splash under `bg-scrim-side` with the identity on the opaque
   side and no halo; chips over the art become night pills. Rank cards, KPI panel and asides become
   18 px cards with `type-title` heads; every figure `fig`; ring and charts on tokens.
2. **`/game/[id]/[playerId]`** (every `lol/game/*` component). The hero (`LolGameHeader`) keeps the
   route player's splash, same treatment. Sides are `side-blue` / `side-red` (a side is not a result),
   damage types `dmg-*`, ACE `violet-*`, picked row `picked`. Tabs stay `<button role="tab">` (tests
   rely on it). Charts drawn in `preserveAspectRatio="none"` SVGs keep their non-scaling strokes and
   HTML hover dots. The custom-game pitfalls (0 means "never recorded") are untouched.
3. **`/stats`**: award cards as 18 px panels, filters as `UiSegmented` / `UiSwitch`, figures `fig`.
4. **`/settings`**: form fields 6 px radius, visible labels, inline errors, `UiButton`.
5. **`/admin/**`** (`layouts/admin.vue`, `components/admin/*`): same primitives; keep the mono route
   line under every action; modals with `bg-overlay` and the floating shadow.
6. **`error.vue`, `PlayerNotFound`, loading and empty states**: `UiEmptyState` / `UiErrorState`, the
   wording pattern of `DESIGN-SYSTEM.md` → "États".

### Phase 7 — Clean up
Remove, once `rg` proves nothing uses them: the v7 bridge entries one by one, `text-shadow-photo`, the
old scrims and shadows, `bg-page-wash`, the `light:` variant and its last users (`LolRankChangeBadge`,
`RankHistory`), the `bob` / `float` / `fadeInUp` / `blinkLive` animations, `--ease-spring*`. Ask before
deleting any component file.

### Phase 8 — Documentation
Per the meta-rule of `CLAUDE.md`: edit `.agents/instructions.base.md` (never the generated files),
then `npm run sync:rules`, and update `README.md`. At least: the "Design System" section (Canopée
instead of v7, the token names, type roles, radii and pill rule, gold rule, motion), the token lines
of "Naming Conventions", the tier-colour sentence (still data, now OKLCH, read through `--tier`), the
text-over-art rule (scrim or night pill, no halo), the renamed components, and the pitfalls you met.
`npm run sync:rules:check` must pass.

## 5. The gate (end of every phase)

```bash
npm run lint              # 0 errors, 0 warnings
npx vue-tsc --noEmit
npm run sync:rules:check
npm audit --omit=dev --audit-level=high
npm run build
npm run test:e2e          # smoke must pass with no upstream; source .env for the rest
node docs/canopee/tools/contrast-audit.mjs http://localhost:3000/ http://localhost:3000/stats \
  http://localhost:3000/summoner/<id> http://localhost:3000/game/<matchId>/<playerId>
```

- The contrast audit opens each URL at 1440 and 375 px, in light and dark, and checks every visible
  text against WCAG AA through gradients, pills and scrims. Mark every element that holds a splash
  image with `data-photo` so the audit tests the text over it against both a white and a black
  picture. Exit code 1 means a failure; "unprotected on photo" means text sits on art with no scrim or
  pill under it. Phase 2 onwards: zero failures on the pages the phase touched.
- Visual checks on `npm run dev` (see `CLAUDE.md`: the first load of `/` after an edit is the
  pre-edit SWR render; reload once). Every page touched, both themes, 1440 / 768 / 375 px, no
  horizontal scroll, keyboard focus visible on every interactive element, reduced motion honoured.
- No raw colour (`rg` command in section 2).
- `reference/` mock-ups are not part of the app: never import from `docs/`.

## 6. Pitfalls specific to this migration

- **Theme variables are resolved on `:root`.** Tailwind v4 emits `@theme` variables on `:root`; a
  token defined as `var(--surface)` follows the theme because `.dark` is on the same element. Do not
  move the dark class to `<body>`.
- **A class name can already exist.** The reference had a `.scale` class used by two different
  components and one silently inherited `min-width: 640px` from the other. Scoped `<style>` blocks
  avoid this; if you write global CSS, grep the name first.
- **Hidden-pane screenshots lie.** If you check contrast or motion in a background browser tab,
  CSS transitions and animations may be paused mid-way; freeze them (`transition: none`) before
  measuring, as the audit does.
- **Hydration.** Anything measured (lane spacing, container widths) or viewer-dependent ("Vous") must
  not change the server markup. Reserve space, then refine after mount.
- **The splash fallback.** The mock-ups ship four splash arts only and blur a portrait for the rest;
  the app has every splash on Data Dragon. Keep the fallback for a `null` `mainChampionName` only.
- **`ink` again.** After phase 1, `text-ink` means body text. A leftover v7 `bg-ink` would now paint
  body-text colour as a background: the phase 1 `rg` check exists for that.

## 7. When to stop and ask

- A feature has no obvious place in the new design.
- The reference contradicts `CLAUDE.md` on behaviour (not on looks).
- A component would need an API change, a new dependency other than `subset-font`, or a file deletion.
- A contrast failure cannot be fixed with existing tokens.
- You are about to change a token's value (tokens are approved; components adapt to them).
