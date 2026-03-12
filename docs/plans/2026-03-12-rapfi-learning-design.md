# Rapfi Hard Mode Learning Design

**Project Type:** Gobang browser game hard AI persistence
**Created:** 2026-03-12
**Scope:** Make `hard` mode improve over time by persisting Rapfi search knowledge locally and exposing minimal management controls in the UI.

---

## 1. Goal and Boundary

### 1.1 Goal

- Improve only `hard` mode, because it is the mode backed by Rapfi and is the only layer where sustained learning materially changes real strength.
- Preserve learned experience across browser restarts, app restarts, and machine restarts on the same device.
- Keep the current fallback path intact so the game remains playable if Rapfi or its database fails.

### 1.2 Non-goals

- No cloud sync in this iteration.
- No account system.
- No neural-network training or model fine-tuning.
- No learning changes for `easy` or `medium`.

---

## 2. Current Constraint

`hard` currently calls the local Rapfi HTTP wrapper, but the server starts a fresh Rapfi process for every move and kills it immediately afterward. That lifecycle prevents Rapfi from acting like a persistent engine session and makes its database support effectively useless for ongoing improvement.

Rapfi's bundled [vendor/rapfi/config.toml](/Users/booboo/Desktop/claude code test/five/vendor/rapfi/config.toml) already contains database settings, but the database is disabled by default. The current service in [server/rapfi-service.ts](/Users/booboo/Desktop/claude code test/five/server/rapfi-service.ts) also does not manage a long-lived process or any engine-level state.

---

## 3. Options Considered

### 3.1 Option A: Local heuristic self-learning outside Rapfi

Pros:

- Easy to implement in the browser.
- No server lifecycle changes.

Cons:

- Does not improve the real `hard` path, because `hard` is already delegated to Rapfi when available.
- Creates two unrelated learning systems with different strengths and behaviors.

### 3.2 Option B: Persist Rapfi experience through a local database and long-lived engine session (recommended)

Pros:

- Improves the actual `hard` mode path.
- Reuses Rapfi's own database mechanism instead of recreating a weaker approximation.
- Keeps all changes local and offline.

Cons:

- Requires server lifecycle changes.
- Needs clear recovery behavior if the engine process becomes unhealthy.

### 3.3 Option C: Retrain or fine-tune Rapfi model assets

Pros:

- Highest theoretical ceiling.

Cons:

- Operationally heavy and out of scope for this project.
- Not realistic for a first iteration.

### 3.4 Decision

Choose Option B.

---

## 4. Architecture

### 4.1 Server-side engine lifecycle

Replace the per-request Rapfi process model with a persistent engine manager:

- Start one Rapfi child process when the local AI service boots.
- Keep it alive across requests.
- Reuse the same configured working directory so Rapfi can read and update its local database files.
- If the process exits or produces invalid protocol output, restart it once and fail the current request cleanly.

This gives Rapfi a stable runtime environment and makes database-backed knowledge accumulation meaningful.

### 4.2 Database-backed hard mode learning

Enable Rapfi database usage in the local config with these principles:

- Database enabled by default.
- Search allowed to read and write database records.
- Database file stored under `vendor/rapfi/` for now, alongside the engine assets.
- Save-on-close preserved so shutdowns persist learned records.

The project treats this as the first form of learning: `hard` becomes stronger over repeated local play because Rapfi can reuse and extend position knowledge.

### 4.3 Frontend controls

Add a minimal hard-learning management area to the current controls:

- Show whether Rapfi learning storage is available.
- Export the current learning database.
- Import a previously exported learning database.
- Reset the learning database to a clean state.

This keeps the first iteration practical. Local-only storage is acceptable as long as the user can move the learned data between machines manually.

### 4.4 API surface

Extend the local HTTP service with a small management API:

- `GET /api/ai/health`
- `GET /api/ai/learning/status`
- `POST /api/ai/rapfi-move`
- `POST /api/ai/learning/reset`
- `GET /api/ai/learning/export`
- `POST /api/ai/learning/import`

The management endpoints should operate on the database file only and must not interfere with a move request in flight.

### 4.5 Fallback behavior

If any hard-learning feature fails:

- `hard` move generation still falls back to the existing local `chooseHardMove()`.
- UI management actions show failure state without breaking the game.
- Database corruption or missing files should trigger recreation or an explicit reset path, not an unrecoverable crash.

---

## 5. Data and File Layout

### 5.1 Existing files to change

- [server/rapfi-service.ts](/Users/booboo/Desktop/claude code test/five/server/rapfi-service.ts)
- [server/http-server.ts](/Users/booboo/Desktop/claude code test/five/server/http-server.ts)
- [src/utils/remote-ai.ts](/Users/booboo/Desktop/claude code test/five/src/utils/remote-ai.ts)
- [src/stores/game.ts](/Users/booboo/Desktop/claude code test/five/src/stores/game.ts)
- [src/components/ControlPanel.vue](/Users/booboo/Desktop/claude code test/five/src/components/ControlPanel.vue)
- [src/App.vue](/Users/booboo/Desktop/claude code test/five/src/App.vue)

### 5.2 New files likely needed

- `src/types/learning.ts`
- `src/utils/learning-remote.ts` or expansion of `src/utils/remote-ai.ts`
- `src/components/LearningPanel.vue` if the controls would otherwise overload the existing control panel
- Additional tests for server, store, and UI behavior

---

## 6. Error Handling

- A move request must never hang indefinitely waiting on Rapfi. The server should enforce an engine response timeout and recycle the process when needed.
- Import must validate that the uploaded file is non-empty and replace the current database atomically.
- Reset must recreate a usable empty database state or remove the old file and let Rapfi rebuild it.
- Export must fail with a clear message if the database has not been created yet.

---

## 7. Testing Strategy

### 7.1 Server tests

- Engine manager reuses one process across multiple move requests.
- Engine manager restarts cleanly after a process failure.
- Learning management endpoints return expected status and file behavior.

### 7.2 Frontend tests

- Hard mode still plays moves when the remote service is healthy.
- Hard mode still falls back locally when the remote service fails.
- Learning status is displayed.
- Export, import, and reset actions call the correct endpoints and surface errors.

### 7.3 Verification

- Run the local server and confirm repeated hard-mode games create and update the Rapfi database file.
- Restart the server and confirm the learned database remains available.
- Verify reset removes accumulated knowledge and import restores it.

---

## 8. GitHub Integration

- Set the repository remote to `https://github.com/xiwei9871/five.git` if `origin` is not already configured.
- Commit each milestone separately so the hard-learning work is easy to review and recover.
- Push each completed milestone to `origin/main` once local verification passes.

GitHub authentication may still be required at push time depending on local credential setup.

---

## 9. Expected Outcome

After this work:

- `hard` remains the strongest mode and is the only mode that accumulates experience.
- Learned experience survives local restarts.
- The user can export, import, and reset hard-mode knowledge without touching files manually.
- The project stays compatible with a future cloud sync layer because the first iteration isolates learning management behind explicit API endpoints.
