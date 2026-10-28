# Prompt to give Gemini

Start Gemini (CLI or Code Assist) at the root of the JungleDiff repository, then paste the block
below as the first message. The repository has no `GEMINI.md`: the prompt points Gemini at
`.agents/AGENTS.md`, which carries the same rules as `CLAUDE.md`.

---

```text
You are working in the JungleDiff repository (Nuxt 4, Vue, TypeScript strict, Tailwind v4). Your task is
to migrate the whole site to the "Canopée" design system, which is already designed and approved.

Before writing any code, read in this order:
1. .agents/AGENTS.md — the project's rules, architecture and pitfalls. They all apply.
2. docs/canopee/BRIEF.md — your mission: decisions already taken, non-negotiables, the token-switch
   strategy, the 9 phases (0 to 8), the gate to run after each phase, and when to stop and ask.
3. docs/canopee/DESIGN-SYSTEM.md — the written design rules (in French).
4. docs/canopee/tokens/canopee-main.css — the tokens to bring into app/assets/css/main.css.
5. The reference mock-ups in docs/canopee/reference/ (serve them with
   `python3 -m http.server 8000 --directory docs/canopee/reference`). Their CSS is the source of truth for
   exact values. reference/home/ is the reference for the page "/".

Working rules:
- Work one phase at a time, on a branch features/canopee created from main. Never push.
- At the end of each phase: run the full gate from BRIEF.md section 5 (including
  node docs/canopee/tools/contrast-audit.mjs), commit, then STOP and report: what changed, the gate
  output, before/after screenshots (light and dark, 1440 and 375 px) of the pages you touched, and
  anything you were unsure of. Wait for my go-ahead before the next phase.
- Do not change the API client, stores, composables, routes or data flow. Do not delete files you did
  not create. Do not add dependencies other than subset-font (phase 3). Ask when BRIEF.md section 7 says so.
- Code and comments in English; every user-facing string stays in French.

Start with phase 0 (baseline), then stop and report.
```

---

## Follow-up messages

- After reviewing a phase: `Phase N approved, go on with phase N+1.`
- To ask for a correction: describe the page, the theme, the width and what is wrong; ask Gemini to
  fix it inside the current phase, rerun the gate and report again.
