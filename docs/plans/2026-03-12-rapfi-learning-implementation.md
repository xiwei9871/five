# Rapfi Hard Learning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `hard` mode improve over time by keeping Rapfi alive across requests, enabling its local database, and adding import/export/reset controls for that learning state.

**Architecture:** Convert the current one-request-one-process Rapfi wrapper into a persistent engine manager, then expose learning-management HTTP endpoints and thin frontend clients for them. Keep the game flow unchanged except for new hard-learning controls and status display, with local hard-AI fallback preserved when the service is unavailable.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, Node HTTP server, local Rapfi binary

---

### Task 1: Persist Rapfi process lifecycle and database config

**Files:**
- Modify: `server/rapfi-service.ts`
- Modify: `server/rapfi-service.spec.ts`
- Modify: `vendor/rapfi/config.toml`

**Step 1: Write the failing test**

```typescript
test('reuses a persistent rapfi process across move requests', async () => {
  const spawn = vi.fn(() => createMockChildProcess(['9,9', '8,8']));
  const service = createRapfiService({
    binaryPath: '/tmp/rapfi',
    existsSync: () => true,
    spawn,
  });

  await expect(service.getBestMove(request)).resolves.toEqual({ x: 9, y: 9 });
  await expect(service.getBestMove(request)).resolves.toEqual({ x: 8, y: 8 });
  expect(spawn).toHaveBeenCalledTimes(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: FAIL because the service spawns a new child process for every request and does not maintain a reusable engine session.

**Step 3: Write minimal implementation**

```typescript
type RapfiEngineManager = {
  getBestMove(request: RapfiRequest): Promise<Point>;
  dispose(): void;
};

// Keep one child process alive, serialize move requests, and restart once on crash.
```

Update `vendor/rapfi/config.toml` to:

```toml
[database]
enable_by_default = true

[database.search]
readonly_mode = false
```

**Step 4: Run test to verify it passes**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: PASS with persistent-process coverage green.

**Step 5: Commit**

```bash
git add server/rapfi-service.ts server/rapfi-service.spec.ts vendor/rapfi/config.toml
git commit -m "feat: persist rapfi engine process"
```

### Task 2: Add hard-learning management endpoints on the local server

**Files:**
- Modify: `server/rapfi-service.ts`
- Modify: `server/http-server.ts`
- Modify: `server/rapfi-service.spec.ts`
- Modify: `server/http-server.spec.ts`

**Step 1: Write the failing test**

```typescript
test('returns learning status and supports reset/export/import endpoints', async () => {
  const handler = createRapfiHttpHandler(mockService, mockLearningStore);

  await expectJson(handler, 'GET', '/api/ai/learning/status').resolves.toMatchObject({ available: true });
  await expect(handler(new Request('http://127.0.0.1:8787/api/ai/learning/export'))).resolves.toHaveProperty('status', 200);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- server/rapfi-service.spec.ts server/http-server.spec.ts`
Expected: FAIL because only `/api/ai/rapfi-move` and `/api/ai/health` exist today.

**Step 3: Write minimal implementation**

```typescript
type RapfiLearningStore = {
  getStatus(): Promise<LearningStatus>;
  exportDatabase(): Promise<Uint8Array>;
  importDatabase(file: Uint8Array): Promise<void>;
  resetDatabase(): Promise<void>;
};
```

Implement:

- `GET /api/ai/learning/status`
- `GET /api/ai/learning/export`
- `POST /api/ai/learning/import`
- `POST /api/ai/learning/reset`

Ensure import/reset coordinate with the persistent engine manager so the database file is never mutated mid-request.

**Step 4: Run test to verify it passes**

Run: `npm test -- server/rapfi-service.spec.ts server/http-server.spec.ts`
Expected: PASS with endpoint coverage green.

**Step 5: Commit**

```bash
git add server/rapfi-service.ts server/http-server.ts server/rapfi-service.spec.ts server/http-server.spec.ts
git commit -m "feat: add rapfi learning management api"
```

### Task 3: Add frontend learning client and store integration

**Files:**
- Modify: `src/utils/remote-ai.ts`
- Modify: `src/utils/remote-ai.spec.ts`
- Modify: `src/stores/game.ts`
- Modify: `src/stores/game.spec.ts`
- Create: `src/types/learning.ts`

**Step 1: Write the failing test**

```typescript
test('loads hard-learning status and resets it through the remote service', async () => {
  vi.stubGlobal('fetch', vi.fn(mockLearningResponses));

  const store = useGameStore();
  await store.refreshLearningStatus();
  await store.resetLearningData();

  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/learning/status', { method: 'GET' });
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/learning/reset', expect.objectContaining({ method: 'POST' }));
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/remote-ai.spec.ts src/stores/game.spec.ts`
Expected: FAIL because the frontend client and store do not know about learning endpoints or learning state.

**Step 3: Write minimal implementation**

```typescript
export type LearningStatus = {
  available: boolean;
  hasDatabase: boolean;
  updatedAt: string | null;
};
```

Add remote helpers for:

- status fetch
- export download
- import upload
- reset request

Extend the game store with hard-learning state and actions while keeping move-play logic unchanged except for refresh hooks.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/remote-ai.spec.ts src/stores/game.spec.ts`
Expected: PASS with remote client and store coverage green.

**Step 5: Commit**

```bash
git add src/types/learning.ts src/utils/remote-ai.ts src/utils/remote-ai.spec.ts src/stores/game.ts src/stores/game.spec.ts
git commit -m "feat: wire rapfi learning state into client store"
```

### Task 4: Add UI controls for hard-learning management

**Files:**
- Modify: `src/App.vue`
- Modify: `src/App.remote-ai.spec.ts`
- Modify: `src/components/ControlPanel.vue`
- Modify: `src/components/ControlPanel.spec.ts`
- Create: `src/components/LearningPanel.vue`
- Create: `src/components/LearningPanel.spec.ts`
- Modify: `src/style.css`

**Step 1: Write the failing test**

```typescript
test('shows hard-learning controls and triggers reset/export/import actions', async () => {
  const wrapper = mount(App, { global: { plugins: [createPinia()] } });

  expect(wrapper.text()).toContain('Hard 学习库');
  await wrapper.find('[data-action="learning-reset"]').trigger('click');
  expect(mockResetLearningData).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ControlPanel.spec.ts src/App.remote-ai.spec.ts`
Expected: FAIL because the current UI exposes no hard-learning management controls.

**Step 3: Write minimal implementation**

```vue
<LearningPanel
  :status="gameStore.learningStatus"
  :busy="gameStore.learningBusy"
  @reset="handleLearningReset"
  @export="handleLearningExport"
  @import="handleLearningImport"
/>
```

Keep the UI minimal:

- visible only when `aiDifficulty === 'hard'`
- status text
- export button
- import file picker
- reset button

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ControlPanel.spec.ts src/components/LearningPanel.spec.ts src/App.remote-ai.spec.ts`
Expected: PASS with UI behavior coverage green.

**Step 5: Commit**

```bash
git add src/App.vue src/App.remote-ai.spec.ts src/components/ControlPanel.vue src/components/ControlPanel.spec.ts src/components/LearningPanel.vue src/components/LearningPanel.spec.ts src/style.css
git commit -m "feat: add hard learning management ui"
```

### Task 5: Verify end-to-end behavior and publish to GitHub

**Files:**
- Modify if needed: `package.json`
- Modify if needed: documentation or tests touched during verification

**Step 1: Write the failing test**

```typescript
test('hard mode still falls back locally when the learning-enabled rapfi service is unavailable', async () => {
  // Extend existing remote hard AI integration coverage if verification exposes a gap.
});
```

Only add a new test if verification reveals an uncovered regression. Do not invent extra implementation work without a failing case.

**Step 2: Run verification to confirm current behavior**

Run:

```bash
npm test
npm run build
```

Expected: all tests PASS and build succeeds.

**Step 3: Verify local server flow manually**

Run:

```bash
npm run ai:server
```

Then confirm:

- `hard` move requests succeed repeatedly.
- the Rapfi database file is created or updated under `vendor/rapfi/`
- export, import, and reset endpoints behave correctly.

**Step 4: Commit final fixes**

```bash
git add package.json package-lock.json server/http-server.ts server/rapfi-service.ts server/*.spec.ts src/App.vue src/App.remote-ai.spec.ts src/components/*.vue src/components/*.spec.ts src/stores/game.ts src/stores/game.spec.ts src/types/learning.ts src/utils/remote-ai.ts src/utils/remote-ai.spec.ts src/style.css vendor/rapfi/config.toml
git commit -m "feat: add persistent rapfi hard learning"
```

**Step 5: Push to GitHub**

Run:

```bash
git remote add origin https://github.com/xiwei9871/five.git
git push -u origin main
```

If `origin` already exists, update it instead:

```bash
git remote set-url origin https://github.com/xiwei9871/five.git
git push -u origin main
```
