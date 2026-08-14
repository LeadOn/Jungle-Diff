import { test, expect } from '@playwright/test';

test('match details page loads correctly', async ({ page }) => {
  // Assuming dev server runs on 3000
  await page.goto('http://localhost:3000/game/EUW1_1234567890/1');

  // Wait for the loading state to finish (spinner disappears)
  await expect(page.locator('.lucide-loader')).not.toBeVisible({ timeout: 10000 });

  // Check if Header is present
  await expect(page.locator('text=Détails de la partie')).toBeVisible();

  // Check if Tabs are present
  await expect(page.locator('role=tablist')).toBeVisible();
  await expect(page.locator('role=tab[name="Détails"]')).toBeVisible();
  
  // Check if Key moments are present
  await expect(page.locator('text=Premier sang').or(page.locator('text=Nexus détruit'))).toBeVisible();

  // Check if Overview Tab shows players
  await expect(page.locator('text=Équipe bleue')).toBeVisible();
  await expect(page.locator('text=Équipe rouge')).toBeVisible();
});
