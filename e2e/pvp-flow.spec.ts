import { expect, test } from '@playwright/test';

test('pvp flow supports moves undo history and restart', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('[data-cell="7-7"]').click();
  await page.locator('[data-cell="8-7"]').click();

  await expect(page.locator('[data-cell="7-7"]')).toContainText('●');
  await expect(page.locator('[data-cell="8-7"]')).toContainText('○');
  await expect(page.getByTestId('history-panel').locator('li')).toHaveCount(2);

  await page.getByTestId('control-panel').locator('[data-action="undo"]').click();
  await expect(page.locator('[data-cell="8-7"]')).toBeEmpty();
  await expect(page.getByTestId('history-panel').locator('li')).toHaveCount(1);

  await page.getByTestId('control-panel').locator('[data-action="restart"]').click();
  await expect(page.locator('[data-cell="7-7"]')).toBeEmpty();
  await expect(page.locator('[data-cell="8-7"]')).toBeEmpty();
  await expect(page.getByTestId('history-panel').locator('li')).toHaveCount(0);
});
