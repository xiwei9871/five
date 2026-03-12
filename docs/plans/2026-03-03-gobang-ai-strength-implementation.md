# Gobang AI Strength Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the Gobang AI so medium plays like a competent casual opponent and hard plays noticeably stronger with deeper, balanced tactical decisions.

**Architecture:** Keep the existing pure-function AI entry points and replace the weak center-heavy evaluation with pattern-based scoring shared by medium and hard. Build the upgrade incrementally: add failing tests for stronger tactical behavior, implement pattern evaluation and candidate ranking, then tune medium and hard with different search budgets and verify the full suite.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest

---

## References

- Existing AI utility: `src/utils/ai.ts`
- Existing AI tests: `src/utils/ai.spec.ts`
- Prior AI difficulty docs: `docs/plans/2026-03-03-gobang-ai-design.md`
- Strength upgrade design doc: `docs/plans/2026-03-03-gobang-ai-strength-design.md`
- Required process skill during execution: `@superpowers:executing-plans`
- Required test discipline during each task: `@superpowers:test-driven-development`
- Required final verification before claiming completion: `@superpowers:verification-before-completion`

### Task 1: Add regression tests that prove current medium and hard are too weak

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add focused tactical tests for:

```ts
test('medium prefers building an open three over a neutral center-biased move', () => {
  // Build a board where one move extends a strong line and another is merely central.
});

test('hard prefers a forcing continuation over a single-step shape extension', () => {
  // Build a board where one move creates sustained pressure and another only scores locally.
});
```

Also add at least one comparison test showing hard chooses a stronger move than medium in a curated position.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because the current evaluation treats these positions too similarly or picks the weaker move.

**Step 3: Write minimal implementation**

Do not change implementation in this task. Only adjust the test position if the failure is ambiguous. The goal is a deterministic failing spec that exposes the current weakness.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL with an assertion showing medium or hard chose the weaker move.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts
git commit -m "test: capture gobang ai strength regressions"
```

### Task 2: Implement pattern-based move scoring

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add or refine tests for scoring helpers such as:

```ts
test('scores creating an open four above creating an open two', () => {
  // Assert exact relative ordering through scoreMove.
});

test('scores blocking an opponent open four above extending a low-threat shape', () => {
  // Assert defensive urgency is reflected in scores.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because the current score model only sees immediate win/block and center distance.

**Step 3: Write minimal implementation**

In `src/utils/ai.ts`, add pattern analysis helpers that:

- inspect four directions from a candidate point
- classify open/closed sequences
- aggregate pattern counts into a weighted score

Requirements:

- keep all weights in named constants
- score both offensive and defensive value
- preserve immediate win and immediate block as top-priority shortcuts
- keep deterministic tie-breaking

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS for the new scoring tests

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add pattern-based gobang ai scoring"
```

### Task 3: Upgrade candidate ranking to emphasize tactical points

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests for candidate ordering behavior:

```ts
test('ranks shape-building moves ahead of distant neutral candidates', () => {
  // Assert the top scored candidate list starts with tactically relevant points.
});

test('keeps deterministic ordering when tactical scores tie', () => {
  // Assert stable comparePoints fallback still holds.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because candidates are still mostly ordered by weak heuristics.

**Step 3: Write minimal implementation**

Update candidate ranking so it uses:

- pattern score for the AI player
- blocking value against the opponent
- local stone density around the move
- center distance only as a final tiebreaker

Keep `getCandidateMoves` radius-based pruning, but ensure `getScoredCandidateMoves` reflects the stronger tactical ordering.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: improve gobang ai candidate ranking"
```

### Task 4: Differentiate medium and hard search behavior

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add explicit difficulty-split tests:

```ts
test('medium selects the strongest immediate tactical build-up within shallow search', () => {
  // Position tailored to medium expectations.
});

test('hard finds the stronger continuation that medium misses', () => {
  // Position where deeper search changes the best move.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because medium and hard currently use similar evaluation and produce similar decisions.

**Step 3: Write minimal implementation**

Tune the existing search configuration:

- `medium`: moderate candidate limit, shallow depth, balanced weights
- `hard`: larger candidate limit, deeper search, stronger weighting for compound threats and forcing continuations

Requirements:

- keep immediate win/block short-circuits
- keep alpha-beta on for hard
- ensure hard can diverge from medium in curated tactical cases
- do not change the public function signatures

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: differentiate medium and hard gobang ai strength"
```

### Task 5: Verify the AI upgrade against the full suite

**Files:**
- Modify: `src/utils/ai.ts` if small tuning fixes are needed
- Modify: `src/utils/ai.spec.ts` only if a test expectation is provably incorrect
- Test: full test suite

**Step 1: Run targeted AI verification**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 2: Run full verification**

Run: `npm test`
Expected: PASS with no regressions in store, component, or app tests

**Step 3: Review for accidental scope creep**

Confirm:

- no UI files changed for this task
- easy difficulty still behaves as a lightweight baseline
- only AI and AI tests changed unless a tightly justified helper extraction was required

**Step 4: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: strengthen gobang ai difficulty separation"
```
