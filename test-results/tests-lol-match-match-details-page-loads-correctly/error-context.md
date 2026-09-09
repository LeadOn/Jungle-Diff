# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/lol-match.spec.ts >> match details page loads correctly
- Location: tests/lol-match.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Détails de la partie')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Détails de la partie') with timeout 5000ms
  - waiting for locator('text=Détails de la partie')

```

```yaml
- banner:
  - link "JungleDiff Logo JungleDiff":
    - /url: /
    - img "JungleDiff Logo"
    - text: JungleDiff
  - navigation:
    - link "Accueil":
      - /url: /
    - link "Records":
      - /url: /stats
  - button
  - button "Se connecter"
- main:
  - link "Retour":
    - /url: /summoner/1
- contentinfo:
  - text: JUNGLEDIFF · V1.0.1 Created with ❤️ in France by
  - link "LeadOn":
    - /url: https://www.valentinvirot.fr
- img
- button "Toggle Nuxt DevTools":
  - img
- text: 19 ms
- button "Toggle Component Inspector":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('match details page loads correctly', async ({ page }) => {
  4  |   // Assuming dev server runs on 3000
  5  |   await page.goto('http://localhost:3000/game/EUW1_1234567890/1');
  6  | 
  7  |   // Wait for the loading state to finish (spinner disappears)
  8  |   await expect(page.locator('.lucide-loader')).not.toBeVisible({ timeout: 10000 });
  9  | 
  10 |   // Check if Header is present
> 11 |   await expect(page.locator('text=Détails de la partie')).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  12 | 
  13 |   // Check if Tabs are present
  14 |   await expect(page.locator('role=tablist')).toBeVisible();
  15 |   await expect(page.locator('role=tab[name="Détails"]')).toBeVisible();
  16 |   
  17 |   // Check if Key moments are present
  18 |   await expect(page.locator('text=Premier sang').or(page.locator('text=Nexus détruit'))).toBeVisible();
  19 | 
  20 |   // Check if Overview Tab shows players
  21 |   await expect(page.locator('text=Équipe bleue')).toBeVisible();
  22 |   await expect(page.locator('text=Équipe rouge')).toBeVisible();
  23 | });
  24 | 
```