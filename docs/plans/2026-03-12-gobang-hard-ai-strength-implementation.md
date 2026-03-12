# Gobang Hard AI Strength-First Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen `hard` mode so it applies sustained midgame pressure and searches deeper, accepting slower move times.

**Architecture:** Keep the current Vite/Vue browser game architecture and strengthen only the search engine in `src/utils/ai.ts`. Improve `hard` by adding stronger move ordering, richer transposition-table reuse, and a bounded threat extension while leaving `easy` and `medium` behavior intact.

**Tech Stack:** TypeScript, Vitest, Vue, Pinia, Vite

---

### Task 1: Add failing tests for stronger hard-mode move selection

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add a test that builds a representative midgame pressure position where current `hard` chooses a passive move, and assert the strengthened `hard` chooses one of the forcing continuation points instead.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on the new hard-mode tactical assertion.

**Step 3: Write minimal implementation**

Do not change implementation in this task.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL with the new expectation mismatch, not with syntax or type errors.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts
git commit -m "test: add hard ai pressure regression"
```

### Task 2: Add failing tests for transposition-table best-move reuse and threat extension

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add focused tests that validate:
- a high-threat leaf position is extended far enough for `hard` to prefer the tactical continuation
- a TT-guided or PV-guided ordering path preserves deterministic best-move selection on repeated search

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on one or more new assertions because search quality is not yet sufficient.

**Step 3: Write minimal implementation**

Do not change implementation in this task.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL with behavioral mismatches only.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts
git commit -m "test: add hard ai search-ordering regressions"
```

### Task 3: Extend search data structures for best-move caching

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Use the tests from Tasks 1-2 as the active failing coverage. Do not add new tests in this step.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on the new hard-mode regression coverage.

**Step 3: Write minimal implementation**

Update the transposition-table entry type to cache `bestMove`, and thread that value through `negamax` and iterative deepening so later searches can prioritize the cached move.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: Some tests may still fail if ordering is still incomplete; if so, confirm the failures have narrowed to move-ordering or extension behavior.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: cache best moves in hard ai transposition table"
```

### Task 4: Add killer/history ordering and PV-first search for hard mode

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Use the existing failing tests. If needed, add one small deterministic test showing repeated hard searches keep selecting the same forcing move after ordering enhancements.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on hard tactical choice or deterministic ordering behavior.

**Step 3: Write minimal implementation**

Implement move ordering layers for `hard`:
- TT/PV best move first
- killer moves near cutoffs
- history heuristic scoring
- static move score fallback

Keep `easy` and `medium` paths unchanged.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: Newly added hard-mode tactical tests pass or reduce to only the threat-extension gap.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: improve hard ai move ordering"
```

### Task 5: Add bounded threat extension and raise hard-mode search budget

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Use the remaining failing threat-regression test from earlier tasks as the active red test.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on the high-threat continuation assertion.

**Step 3: Write minimal implementation**

Add a 1-ply threat extension for high-danger leaf positions and raise `hard` configuration values to the approved strength-first envelope:
- larger candidate limit
- larger time budget
- unchanged `easy` and `medium`

Ensure the extension is bounded by time budget and threat classification.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS for the new hard-mode regression tests.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: strengthen hard ai tactical extensions"
```

### Task 6: Re-baseline performance expectations for strength-first hard mode

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Adjust the hard-mode runtime expectation so it reflects the approved stronger budget rather than the older `<= 400ms` target.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because the existing runtime expectation is tighter than the new approved envelope.

**Step 3: Write minimal implementation**

Update the performance assertion to a realistic strength-first threshold and keep the scripted midgame benchmark deterministic.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts
git commit -m "test: rebaseline hard ai performance budget"
```

### Task 7: Verify targeted and full test suites

**Files:**
- Modify: `none`
- Test: `src/utils/ai.spec.ts`, project test suite

**Step 1: Write the failing test**

No new test in this task.

**Step 2: Run test to verify targeted coverage passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS.

**Step 3: Run broader verification**

Run: `npm test`
Expected: PASS for the full Vitest suite.

**Step 4: Record results**

Capture the important outcomes: new hard-mode regressions pass, no unrelated test regressions, runtime within the new envelope.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts docs/plans/2026-03-12-gobang-hard-ai-strength-design.md docs/plans/2026-03-12-gobang-hard-ai-strength-implementation.md
git commit -m "docs: add hard ai strength-first plan"
```
