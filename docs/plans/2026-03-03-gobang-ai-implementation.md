# Gobang AI Difficulty Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add medium and hard AI difficulties to the existing Gobang browser game while keeping medium responsive and allowing hard to search deeper.

**Architecture:** Extend the current pure AI utility layer instead of pushing logic into the store. Build the upgrade in slices: candidate move generation, heuristic scoring, minimax search, difficulty-specific AI entry points, then store integration and final verification. Keep `easy` behavior intact and make `medium`/`hard` share the same search infrastructure with different budgets.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest

---

## References

- Existing MVP implementation: `docs/plans/2026-03-03-gobang-implementation.md`
- AI design doc: `docs/plans/2026-03-03-gobang-ai-design.md`
- Required process skill during execution: `@superpowers:executing-plans`
- Required test discipline during each task: `@superpowers:test-driven-development`
- Required final verification before claiming completion: `@superpowers:verification-before-completion`

### Task 1: Add AI candidate-move generation

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests for:

```ts
test('returns the center point on an empty board', () => {
  expect(getCandidateMoves(createEmptyBoard(15))).toEqual([{ x: 7, y: 7 }]);
});

test('only returns empty cells near existing stones', () => {
  let board = createEmptyBoard(15);
  board = placeStone(board, 7, 7, 'black');

  const candidates = getCandidateMoves(board);

  expect(candidates).toContainEqual({ x: 6, y: 6 });
  expect(candidates).toContainEqual({ x: 8, y: 8 });
  expect(candidates).not.toContainEqual({ x: 0, y: 0 });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because `getCandidateMoves` does not exist yet.

**Step 3: Write minimal implementation**

Implement in `src/utils/ai.ts`:

```ts
export function getCandidateMoves(board: Board): Point[] {
  if (board is empty) return [{ x: 7, y: 7 }];

  // Collect empty cells within a fixed radius around existing stones.
}
```

Rules:
- never return occupied cells
- de-duplicate cells
- stable sort by center distance, then by coordinates
- keep the radius small enough to avoid full-board search

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add ai candidate move generation"
```

### Task 2: Add heuristic board and move scoring

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests for:

```ts
test('scores an immediate winning move above a non-winning move', () => {
  // Build a board where one move creates five and another only extends a line.
});

test('scores blocking an opponent threat above an unrelated move', () => {
  // Build a board with an opponent four-in-a-row threat.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because scoring helpers are missing or produce equal scores.

**Step 3: Write minimal implementation**

Implement helpers such as:

```ts
function scoreMove(board: Board, move: Point, player: Player): number {
  // Prefer win > block > open four > open three > open two > center weight.
}
```

Requirements:
- encode explicit weights for must-win and must-block patterns
- reuse current immediate win / immediate block checks where possible
- keep weights centralized as constants

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add heuristic scoring for gobang ai"
```

### Task 3: Add minimax search with difficulty budgets

**Files:**
- Modify: `src/utils/ai.ts`
- Test: `src/utils/ai.spec.ts`

**Step 1: Write the failing test**

Add tests for:

```ts
test('medium ai selects a winning move from the candidate set', () => {
  expect(chooseMediumMove(board, 'white')).toContainEqual(one_of_the_winning_ends);
});

test('hard ai prefers the stronger tactical continuation in a fork-like position', () => {
  // Build a deterministic board where the stronger move is known.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because `chooseMediumMove` and `chooseHardMove` do not exist yet.

**Step 3: Write minimal implementation**

Implement:

```ts
type SearchConfig = {
  depth: number;
  candidateLimit: number;
  useAlphaBeta: boolean;
};

function minimax(...): number {
  // Shared search routine for medium and hard.
}

export function chooseMediumMove(board: Board, aiPlayer: Player): Point {
  return chooseSearchMove(board, aiPlayer, {
    depth: 2,
    candidateLimit: small_limit,
    useAlphaBeta: false,
  });
}

export function chooseHardMove(board: Board, aiPlayer: Player): Point {
  return chooseSearchMove(board, aiPlayer, {
    depth: 3_or_4,
    candidateLimit: larger_limit,
    useAlphaBeta: true,
  });
}
```

Rules:
- short-circuit immediate win
- short-circuit immediate block
- search only within candidate limits
- stable tie-breaking for deterministic tests

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts
git commit -m "feat: add medium and hard gobang ai search"
```

### Task 4: Integrate difficulty-specific AI into the game store

**Files:**
- Modify: `src/stores/game.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

Add tests for:

```ts
test('uses medium ai when aiDifficulty is medium', () => {
  // Seed state, play human move, assert AI replies and store difficulty remains medium.
});

test('uses hard ai when aiDifficulty is hard', () => {
  // Seed state, play human move, assert AI replies and store difficulty remains hard.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/game.spec.ts`
Expected: FAIL because the store still always calls `chooseEasyMove`.

**Step 3: Write minimal implementation**

Update `src/stores/game.ts`:

```ts
function chooseAiMove(board: Board, difficulty: Difficulty, aiPlayer: Player): Point {
  switch (difficulty) {
    case 'medium':
      return chooseMediumMove(board, aiPlayer);
    case 'hard':
      return chooseHardMove(board, aiPlayer);
    default:
      return chooseEasyMove(board, aiPlayer);
  }
}
```

Requirements:
- keep current PvE undo behavior
- preserve persistence after AI turns
- preserve restored `aiDifficulty` across hydration

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/game.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/game.ts src/stores/game.spec.ts
git commit -m "feat: wire ai difficulty selection into store turns"
```

### Task 5: Final verification and regression coverage

**Files:**
- Modify: `src/utils/ai.spec.ts`
- Modify: `src/stores/game.spec.ts`
- Modify: `src/App.spec.ts`

**Step 1: Write the failing test**

Add any missing regression tests for:
- `easy` still picks immediate wins and immediate blocks
- persisted snapshots in `medium` / `hard` resume with the same difficulty
- app-level hydrated state still renders correctly after AI upgrades

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts src/stores/game.spec.ts src/App.spec.ts`
Expected: at least one targeted regression should fail before the final fix.

**Step 3: Write minimal implementation**

Make only the smallest changes needed to satisfy the final regression tests. Do not add Web Workers, iterative deepening, opening books, or new UI controls in this task.

**Step 4: Run test to verify it passes**

Run: `npm test && npm run build`
Expected: all tests PASS and the production build completes successfully.

**Step 5: Commit**

```bash
git add src/utils/ai.spec.ts src/stores/game.spec.ts src/App.spec.ts
git commit -m "test: cover ai difficulty regression cases"
```

## Notes

- Keep all AI helpers pure and colocated in `src/utils/ai.ts` unless the file becomes too large.
- If `src/utils/ai.ts` becomes unwieldy, split only after tests prove the behavior, and keep the public API stable.
- Do not add asynchronous AI in this plan. That is a separate design.
