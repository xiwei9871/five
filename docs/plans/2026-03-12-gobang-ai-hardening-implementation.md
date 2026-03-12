# Gobang Hard AI Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Gobang AI so hard mode is clearly stronger than average players by adding VCF threat solving and search-engineering improvements while keeping browser-side latency acceptable.

**Architecture:** Keep existing `chooseEasyMove/chooseMediumMove/chooseHardMove` public API and refactor internals of `src/utils/ai.ts` into a layered engine: candidate generation, threat evaluation, VCF short-circuit, iterative deepening negamax with alpha-beta, and transposition table. Medium reuses the same core but with lower budgets and reduced features.

**Tech Stack:** TypeScript, Vue 3, Pinia, Vitest

---

## References

- Design doc: `docs/plans/2026-03-12-gobang-ai-hardening-design.md`
- Current AI implementation: `src/utils/ai.ts`
- Current AI tests: `src/utils/ai.spec.ts`
- Required execution skill: `@superpowers:executing-plans`
- Required test discipline: `@superpowers:test-driven-development`
- Required final verification: `@superpowers:verification-before-completion`

### Task 1: Add failing tests for threat-priority and difficulty separation

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests that currently fail on weak hard behavior:

```ts
test('hard chooses forcing threat continuation over neutral extension', () => {
  // Build a board where one move starts a forcing chain and a neutral move looks locally good.
  expect(chooseHardMove(board, 'white')).toEqual({ x: 8, y: 5 });
});

test('hard and medium diverge on a deep tactical position', () => {
  expect(chooseMediumMove(board, 'white')).toEqual({ x: 5, y: 7 });
  expect(chooseHardMove(board, 'white')).toEqual({ x: 8, y: 5 });
});

test('hard blocks high-priority threat instead of center-favored move', () => {
  expect(chooseHardMove(board, 'black')).toEqual({ x: 9, y: 6 });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on at least one new hard-behavior assertion.

**Step 3: Write minimal implementation**

No implementation changes in this task. Only adjust board setups if a failure is nondeterministic.

**Step 4: Run test to verify it still fails deterministically**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL with stable expected/actual move mismatch.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts
git commit -m "test: add hard ai tactical regression cases"
```

### Task 2: Refactor candidate generation and scoring for threat-first ordering

**Files:**
- Modify: `src/utils/ai.ts`
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add candidate quality tests:

```ts
test('candidate list includes radius-2 tactical points', () => {
  // Verify key tactical cell appears in candidate set.
});

test('threat move scores above neutral central move', () => {
  // scoreMove(threat) > scoreMove(neutral)
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because current radius and scoring are too limited.

**Step 3: Write minimal implementation**

Implement in `src/utils/ai.ts`:

- Increase/parameterize candidate radius for medium/hard contexts.
- Add threat-priority candidate enrichment for open-three/open-four defense and attack points.
- Update move scoring to weigh forcing threats and defensive urgency above center preference.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS on new candidate/scoring tests.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: prioritize tactical candidates for gobang ai"
```

### Task 3: Add Zobrist hashing and transposition table primitives

**Files:**
- Modify: `src/utils/ai.ts`
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add deterministic TT behavior tests:

```ts
test('zobrist hash is stable for equivalent board states', () => {
  expect(hashA).toBe(hashB);
});

test('tt entry with exact bound is reused at same-or-shallower depth', () => {
  expect(ttHitsAfter).toBeGreaterThan(ttHitsBefore);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because hash/TT logic does not exist.

**Step 3: Write minimal implementation**

In `src/utils/ai.ts`, add:

- Zobrist table init helper.
- Board hash computation helper.
- TT map entry structure `{ depth, score, boundType, bestMove }`.
- Read/write helpers used by search.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS for new hash/TT tests.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add zobrist hash and transposition table for ai search"
```

### Task 4: Implement iterative deepening negamax with alpha-beta and move ordering

**Files:**
- Modify: `src/utils/ai.ts`
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests validating deeper search behavior:

```ts
test('iterative deepening returns stable best move under budget', () => {
  expect(move).toEqual({ x: 8, y: 5 });
});

test('hard explores deeper tactical line than medium', () => {
  expect(hardMove).not.toEqual(mediumMove);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because current hard search is fixed shallow depth.

**Step 3: Write minimal implementation**

Implement:

- `negamax` with alpha-beta windowing.
- Iterative deepening loop with deadline cutoff.
- Move ordering from TT best move + threat score + killer/history.
- Distinct medium/hard search budgets and candidate limits.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS on deep-search behavior tests.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add iterative deepening alpha-beta for hard ai"
```

### Task 5: Add VCF short-circuit solver for forcing threat chains

**Files:**
- Modify: `src/utils/ai.ts`
- Modify: `src/utils/ai.spec.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add VCF-specific tests:

```ts
test('hard chooses vcf winning move when forcing chain exists', () => {
  expect(chooseHardMove(board, 'white')).toEqual({ x: 10, y: 7 });
});

test('vcf solver declines when no forcing chain exists', () => {
  expect(findVcfWinningMove(board, 'white', 8)).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL due to missing VCF solver.

**Step 3: Write minimal implementation**

Implement VCF module logic in `src/utils/ai.ts`:

- Generate only forcing threat moves for attacker.
- Generate minimal valid responses for defender.
- Depth-limited DFS/BFS for forcing chain detection.
- Integrate into `chooseHardMove` before main search.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS for VCF tests.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add vcf short-circuit solver to hard ai"
```

### Task 6: Add benchmark-style validation for strength and runtime envelopes

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Optional Modify: `src/utils/ai.ts` (small tuning only)
- Test: `src/utils/ai.spec.ts`, full suite

**Step 1: Write the failing test**

Add deterministic self-play subset tests with fixed seeds and move caps:

```ts
test('hard wins majority against medium in seeded mini-match', () => {
  expect(hardWins).toBeGreaterThanOrEqual(13); // out of 20
});

test('hard move selection remains within target budget envelope', () => {
  expect(avgMs).toBeLessThanOrEqual(400);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL on win-rate and/or timing thresholds.

**Step 3: Write minimal implementation**

Tune only constants and limits:

- Threat weights
- Candidate caps by depth
- Hard budget deadline
- VCF depth cap

Avoid structural rewrites here.

**Step 4: Run tests to verify pass**

Run:

- `npm test -- src/utils/ai.spec.ts`
- `npm test`

Expected: PASS with no regressions.

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "perf: tune hard ai strength and runtime balance"
```

### Task 7: Final verification and handoff summary

**Files:**
- No required code changes

**Step 1: Verify git diff scope**

Run: `git status --short`
Expected: Only intended AI files changed.

**Step 2: Re-run key verification commands**

Run:

- `npm test -- src/utils/ai.spec.ts`
- `npm test`

Expected: PASS.

**Step 3: Collect evidence for handoff**

Capture:

- Hard vs medium seeded mini-match summary
- Average hard decision time summary
- List of major algorithmic additions

**Step 4: Commit (if docs adjusted during verification)**

```bash
git add docs/plans/2026-03-12-gobang-ai-hardening-design.md docs/plans/2026-03-12-gobang-ai-hardening-implementation.md
git commit -m "docs: add gobang hard ai hardening design and implementation plan"
```

