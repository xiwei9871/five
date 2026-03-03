import { expect, test } from '@playwright/test';

test('app shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('五子棋')).toBeVisible();
  await expect(page.getByTestId('status-panel')).toBeVisible();
  await expect(page.getByTestId('board-grid')).toBeVisible();
  await expect(page.getByTestId('control-panel')).toBeVisible();
  await expect(page.getByTestId('history-panel')).toBeVisible();
});
