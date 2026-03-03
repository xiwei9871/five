# Gobang Playwright E2E Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Playwright end-to-end coverage for the Gobang browser app's main user flows: app load, PvP moves, undo/history/restart, and PvE auto-response.

**Architecture:** Introduce a small Playwright test stack alongside the existing Vitest suite. Add only the minimum UI test selectors required for robust browser automation, then cover the browser flows with three E2E specs: smoke, PvP, and PvE. Keep PvE assertions behavior-oriented instead of pinning exact AI coordinates.

**Tech Stack:** Playwright, Vite, Vue 3, TypeScript

---

## References

- E2E design doc: `docs/plans/2026-03-03-gobang-playwright-design.md`
- Existing app entry: `src/App.vue`
- Required process skill during execution: `@superpowers:executing-plans`
- Required test discipline during each task: `@superpowers:test-driven-development`
- Required final verification before claiming completion: `@superpowers:verification-before-completion`

### Task 1: Add Playwright toolchain and scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`

**Step 1: Write the failing test**

Create a minimal E2E file:

```ts
// e2e/app-smoke.spec.ts
import { test, expect } from '@playwright/test';

test('app shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('五子棋')).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app-smoke.spec.ts`
Expected: FAIL because Playwright is not installed or configured yet.

**Step 3: Write minimal implementation**

Add:
- `@playwright/test` to `devDependencies`
- `npm run e2e`
- `npm run e2e:headed`
- `playwright.config.ts` with:
  - `testDir: './e2e'`
  - Chromium project only
  - `webServer` running local Vite server
  - `baseURL` pointing at that server

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app-smoke.spec.ts`
Expected: PASS or proceed to next task if the app still needs stable selectors.

**Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e/app-smoke.spec.ts
git commit -m "test: add playwright e2e toolchain"
```

### Task 2: Add stable UI selectors for browser automation

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/BoardGrid.vue`
- Modify: `src/components/ControlPanel.vue`
- Modify: `src/components/HistoryPanel.vue`
- Modify: `src/components/StatusPanel.vue`

**Step 1: Write the failing test**

Expand `e2e/app-smoke.spec.ts`:

```ts
await expect(page.getByTestId('status-panel')).toBeVisible();
await expect(page.getByTestId('board-grid')).toBeVisible();
await expect(page.getByTestId('control-panel')).toBeVisible();
await expect(page.getByTestId('history-panel')).toBeVisible();
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/app-smoke.spec.ts`
Expected: FAIL because the `data-testid` attributes do not exist yet.

**Step 3: Write minimal implementation**

Add stable selectors:
- `data-testid="status-panel"`
- `data-testid="board-grid"`
- `data-testid="control-panel"`
- `data-testid="history-panel"`
- `data-testid="game-mode"`
- `data-testid="ai-difficulty"`

Do not restructure the UI beyond adding the selectors.

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/app-smoke.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.vue src/components/BoardGrid.vue src/components/ControlPanel.vue src/components/HistoryPanel.vue src/components/StatusPanel.vue e2e/app-smoke.spec.ts
git commit -m "test: add stable selectors for e2e coverage"
```

### Task 3: Add PvP browser flow coverage

**Files:**
- Create: `e2e/pvp-flow.spec.ts`

**Step 1: Write the failing test**

Create:

```ts
import { test, expect } from '@playwright/test';

test('pvp flow supports moves undo history and restart', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('[data-cell="7-7"]').click();
  await page.locator('[data-cell="8-7"]').click();

  // Assert two stones render, history length is two, undo rewinds one move,
  // restart clears board and history.
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/pvp-flow.spec.ts`
Expected: FAIL until the exact assertions are implemented correctly or missing hooks are revealed.

**Step 3: Write minimal implementation**

Finish the test with assertions for:
- current board state after two moves
- history showing two entries
- undo removing the second move
- restart clearing both moves and history

If needed, add only the smallest extra DOM hooks required to count history items reliably.

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/pvp-flow.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/pvp-flow.spec.ts src/components/HistoryPanel.vue
git commit -m "test: cover pvp browser flow with playwright"
```

### Task 4: Add PvE browser flow coverage

**Files:**
- Create: `e2e/pve-flow.spec.ts`

**Step 1: Write the failing test**

Create:

```ts
import { test, expect } from '@playwright/test';

test('pve flow triggers an automatic ai reply', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByTestId('game-mode').selectOption('pve');
  await page.getByRole('button', { name: '重新开始' }).click();
  await page.locator('[data-cell="7-7"]').click();

  // Assert history becomes length 2 and a second stone appears.
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/pve-flow.spec.ts`
Expected: FAIL until the app and assertions line up in a stable way.

**Step 3: Write minimal implementation**

Finish the test with assertions for:
- mode switched to PvE
- first human move appears
- second AI move appears automatically
- history length becomes 2

Do not assert exact AI coordinates.

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/pve-flow.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/pve-flow.spec.ts
git commit -m "test: cover pve browser flow with playwright"
```

### Task 5: Final verification and regression check

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `e2e/*.spec.ts` as needed

**Step 1: Write the failing test**

Add any missing regression assertions so the suite proves:
- the app still opens cleanly
- PvP flow still works after selector additions
- PvE flow remains behavior-based rather than AI-position-specific

**Step 2: Run test to verify it fails**

Run: `npm run e2e`
Expected: at least one missing assertion or flaky step should surface before the final adjustment.

**Step 3: Write minimal implementation**

Fix only the smallest issues required:
- selector stability
- localStorage cleanup sequencing
- Playwright server startup timing

Do not add mobile viewport matrices, cross-browser projects, or visual snapshots in this task.

**Step 4: Run test to verify it passes**

Run: `npm test && npm run e2e && npm run build`
Expected: unit tests PASS, Playwright PASS, build PASS.

**Step 5: Commit**

```bash
git add package.json playwright.config.ts e2e
git commit -m "test: finalize playwright e2e coverage"
```
