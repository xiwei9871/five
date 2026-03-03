import { expect, test } from '@playwright/test';

test('pve flow triggers an automatic ai reply', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByTestId('game-mode').selectOption('pve');
  await page.getByRole('button', { name: '重新开始' }).click();
  await page.locator('[data-cell="7-7"]').click();

  await expect(page.locator('[data-cell="7-7"]')).toContainText('●');
  await expect(page.getByTestId('history-panel').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('board-grid').locator('button', { hasText: '○' })).toHaveCount(1);
});
