# Rapfi Local Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a local Node service that wraps the Rapfi binary and make `hard` mode call it before falling back to the in-browser AI.

**Architecture:** Keep the current Vite/Vue frontend and add a small local service layer in the repository. The frontend sends the current board state to the local service, the service asks Rapfi for a move, and the store applies that move or falls back to local search if the service is unavailable.

**Tech Stack:** TypeScript, Vue, Pinia, Vitest, Node.js child processes, Rapfi binary

---

### Task 1: Add failing tests for async hard-mode engine delegation

**Files:**
- Modify: `src/stores/game.spec.ts`
- Modify: `src/stores/game.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

Add tests that assert:
- `playMove` becomes async-safe for PvE hard mode
- `hard` mode attempts a remote engine move first
- store falls back to local hard AI when remote engine request fails

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/game.spec.ts`
Expected: FAIL because store does not yet support async remote AI delegation.

**Step 3: Write minimal implementation**

Do not add final implementation in this task.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- src/stores/game.spec.ts`
Expected: FAIL with behavior mismatch, not syntax errors.

**Step 5: Commit**

```bash
git add src/stores/game.spec.ts
git commit -m "test: add hard ai remote delegation coverage"
```

### Task 2: Add failing tests for the frontend remote AI client

**Files:**
- Create: `src/utils/remote-ai.spec.ts`
- Create: `src/utils/remote-ai.ts`
- Test: `src/utils/remote-ai.spec.ts`

**Step 1: Write the failing test**

Add tests for:
- successful `POST /api/ai/rapfi-move`
- non-200 responses producing a usable error
- malformed payloads being rejected

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/remote-ai.spec.ts`
Expected: FAIL because the remote AI client does not exist yet.

**Step 3: Write minimal implementation**

Create the client API surface but leave behavior incomplete if needed to keep the test red first.

**Step 4: Run test to verify the red state is correct**

Run: `npm test -- src/utils/remote-ai.spec.ts`
Expected: FAIL on expected assertions only.

**Step 5: Commit**

```bash
git add src/utils/remote-ai.spec.ts src/utils/remote-ai.ts
git commit -m "test: add remote ai client coverage"
```

### Task 3: Implement remote AI client and async store fallback

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/stores/game.spec.ts`
- Create: `src/utils/remote-ai.ts`
- Modify: `src/utils/remote-ai.spec.ts`
- Modify: `src/App.vue`

**Step 1: Write the failing test**

Use the failing tests from Tasks 1 and 2 as the active red tests.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/game.spec.ts src/utils/remote-ai.spec.ts`
Expected: FAIL on the new async/remote expectations.

**Step 3: Write minimal implementation**

Implement:
- remote AI request helper
- async store path for `hard`
- fallback to existing local `chooseHardMove`
- front-end request locking to avoid duplicate human moves during AI thinking

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/game.spec.ts src/utils/remote-ai.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/stores/game.ts src/stores/game.spec.ts src/utils/remote-ai.ts src/utils/remote-ai.spec.ts src/App.vue
git commit -m "feat: add remote hard ai client fallback flow"
```

### Task 4: Add failing tests for the Rapfi HTTP service

**Files:**
- Create: `server/rapfi-service.spec.ts`
- Create: `server/rapfi-service.ts`
- Create: `server/http-server.ts`
- Test: `server/rapfi-service.spec.ts`

**Step 1: Write the failing test**

Add tests that assert:
- missing binary path returns a clear error
- a mocked Rapfi child process can accept a position and return a parsed move
- service returns a structured API response payload

**Step 2: Run test to verify it fails**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: FAIL because the service does not yet exist.

**Step 3: Write minimal implementation**

Create the service files and the minimal API boundary without finishing the protocol flow yet.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: FAIL on behavior gaps only.

**Step 5: Commit**

```bash
git add server/rapfi-service.spec.ts server/rapfi-service.ts server/http-server.ts
git commit -m "test: add rapfi service coverage"
```

### Task 5: Implement Rapfi process management and HTTP API

**Files:**
- Modify: `server/rapfi-service.ts`
- Modify: `server/http-server.ts`
- Modify: `server/rapfi-service.spec.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Use the failing service tests from Task 4 as the active red tests.

**Step 2: Run test to verify it fails**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: FAIL on protocol/process expectations.

**Step 3: Write minimal implementation**

Implement:
- process startup and shutdown
- board-to-command translation
- move parsing
- `POST /api/ai/rapfi-move`
- `npm run ai:server` script

**Step 4: Run test to verify it passes**

Run: `npm test -- server/rapfi-service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add server/rapfi-service.ts server/http-server.ts server/rapfi-service.spec.ts package.json
git commit -m "feat: add local rapfi ai service"
```

### Task 6: Download and stage Rapfi binary assets

**Files:**
- Create: `vendor/rapfi/` assets
- Create: `vendor/rapfi/README.md`
- Modify: `.gitignore` if needed

**Step 1: Write the failing test**

No unit test in this task. Verification is file and startup based.

**Step 2: Download assets**

Download the official Rapfi release asset that matches the local platform and place required config/weight files next to the executable.

**Step 3: Verify local startup**

Run: `npm run ai:server`
Expected: service starts and reports Rapfi is ready, or a clear actionable error if an asset is still missing.

**Step 4: Document local asset layout**

Write a short `vendor/rapfi/README.md` that states what was downloaded and how the service locates it.

**Step 5: Commit**

```bash
git add vendor/rapfi .gitignore
git commit -m "chore: add local rapfi engine assets"
```

### Task 7: Add minimal UI and integration coverage

**Files:**
- Modify: `src/App.spec.ts`
- Modify: `tests/smoke/app.smoke.spec.ts`
- Modify: `src/App.vue`
- Modify: `src/components/StatusPanel.vue` if needed

**Step 1: Write the failing test**

Add coverage that confirms:
- the board is temporarily locked while hard AI is thinking
- a remote-engine failure shows fallback behavior without breaking the game

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.spec.ts tests/smoke/app.smoke.spec.ts`
Expected: FAIL because no thinking/fallback UI exists yet.

**Step 3: Write minimal implementation**

Add the smallest UI/status changes needed to support the tests.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.spec.ts tests/smoke/app.smoke.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.vue src/App.spec.ts src/components/StatusPanel.vue tests/smoke/app.smoke.spec.ts
git commit -m "feat: show hard ai remote thinking state"
```

### Task 8: Verify full project and manual local service flow

**Files:**
- Modify: `README` docs if added
- Test: full project suite and local service startup

**Step 1: Run targeted verification**

Run: `npm test -- src/stores/game.spec.ts src/utils/remote-ai.spec.ts server/rapfi-service.spec.ts`
Expected: PASS.

**Step 2: Run full suite**

Run: `npm test`
Expected: PASS.

**Step 3: Run local service**

Run: `npm run ai:server`
Expected: the service starts cleanly with the downloaded Rapfi assets.

**Step 4: Record results**

Capture:
- test pass counts
- service startup result
- fallback behavior status

**Step 5: Commit**

```bash
git add docs/plans/2026-03-12-rapfi-local-integration-design.md docs/plans/2026-03-12-rapfi-local-integration-implementation.md
git commit -m "docs: add rapfi local integration plan"
```
