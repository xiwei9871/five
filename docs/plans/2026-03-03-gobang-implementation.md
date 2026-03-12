# Gobang Web Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable Gobang web game with local PvP, basic PvE, undo, move history, and local persistence from the existing design doc.

**Architecture:** Start with a Vite + Vue 3 + Pinia application and keep core game rules in pure utility modules so they can be tested independently from the UI. Build the game in vertical slices: bootstrap the app shell, implement board/rule primitives, wire the Pinia store, then add UI, persistence, and AI behavior incrementally. Defer Android packaging and stronger AI search until the browser experience is stable and tested.

**Tech Stack:** Vue 3, Vite, Pinia, Naive UI, Vitest, Vue Test Utils, Testing Library, TypeScript

---

## References

- Design doc: `docs/plans/2025-03-03-gobang-design.md`
- Required process skill during execution: `@superpowers:executing-plans`
- Required test discipline during each task: `@superpowers:test-driven-development`
- Required final verification before claiming completion: `@superpowers:verification-before-completion`

### Task 1: Bootstrap the Vue application and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`
- Create: `src/style.css`
- Create: `src/stores/index.ts`
- Create: `tests/setup.ts`
- Create: `tests/smoke/app.smoke.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/smoke/app.smoke.spec.ts
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../../src/App.vue';

test('renders the gobang app shell', () => {
  const wrapper = mount(App, {
    global: {
      plugins: [createPinia()],
    },
  });

  expect(wrapper.text()).toContain('五子棋');
  expect(wrapper.text()).toContain('开始游戏');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/smoke/app.smoke.spec.ts`
Expected: FAIL because `src/App.vue` or the test setup does not exist yet.

**Step 3: Write minimal implementation**

Create the initial Vite/Vitest project files with:

```ts
// package.json
{
  "name": "gobang-game",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```vue
<!-- src/App.vue -->
<template>
  <main class="app-shell">
    <h1>五子棋</h1>
    <button type="button">开始游戏</button>
  </main>
</template>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/smoke/app.smoke.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.ts src/App.vue src/style.css src/stores/index.ts tests/setup.ts tests/smoke/app.smoke.spec.ts
git commit -m "chore: bootstrap gobang vue app"
```

### Task 2: Implement core board and rule utilities

**Files:**
- Create: `src/types/game.ts`
- Create: `src/utils/board.ts`
- Create: `src/utils/rules.ts`
- Test: `src/utils/board.spec.ts`
- Test: `src/utils/rules.spec.ts`

**Step 1: Write the failing test**

```ts
// src/utils/rules.spec.ts
import { createEmptyBoard, placeStone } from './board';
import { getWinner } from './rules';

test('detects five stones in a horizontal row', () => {
  let board = createEmptyBoard(15);

  for (let x = 3; x < 8; x += 1) {
    board = placeStone(board, x, 7, 'black');
  }

  expect(getWinner(board, 7, 7)).toEqual({
    winner: 'black',
    line: [
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      { x: 6, y: 7 },
      { x: 7, y: 7 },
    ],
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/rules.spec.ts`
Expected: FAIL because the board helpers and winner detection are missing.

**Step 3: Write minimal implementation**

Implement:

```ts
// src/types/game.ts
export type Player = 'black' | 'white';
export type Cell = Player | null;
export type Board = Cell[][];
export type Point = { x: number; y: number };
```

```ts
// src/utils/board.ts
export function createEmptyBoard(size = 15): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function placeStone(board: Board, x: number, y: number, player: Player): Board {
  if (board[y][x] !== null) {
    throw new Error('Cell is already occupied');
  }

  return board.map((row, rowIndex) =>
    rowIndex === y ? row.map((cell, colIndex) => (colIndex === x ? player : cell)) : row,
  );
}
```

```ts
// src/utils/rules.ts
export function getWinner(board: Board, x: number, y: number): { winner: Player; line: Point[] } | null {
  // Check horizontal, vertical, diagonal-down, diagonal-up and return 5-point line.
}
```

Also add tests for:
- occupied cell rejection
- vertical win
- both diagonal wins
- non-winning move returns `null`
- full board draw helper if you expose `isBoardFull`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/board.spec.ts src/utils/rules.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/game.ts src/utils/board.ts src/utils/rules.ts src/utils/board.spec.ts src/utils/rules.spec.ts
git commit -m "feat: add gobang board and rule utilities"
```

### Task 3: Implement the game store for local PvP

**Files:**
- Create: `src/stores/game.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

```ts
// src/stores/game.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from './game';

beforeEach(() => {
  setActivePinia(createPinia());
});

test('plays alternating moves and records history', () => {
  const store = useGameStore();

  store.startGame('pvp');
  store.playMove(7, 7);
  store.playMove(8, 7);

  expect(store.board[7][7]).toBe('black');
  expect(store.board[7][8]).toBe('white');
  expect(store.currentPlayer).toBe('black');
  expect(store.moveHistory).toHaveLength(2);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/game.spec.ts`
Expected: FAIL because the store does not exist.

**Step 3: Write minimal implementation**

Implement a Pinia store with:

```ts
type GameMode = 'pvp' | 'pve';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'ready' | 'playing' | 'finished';

type Move = {
  x: number;
  y: number;
  player: Player;
  timestamp: string;
};
```

Store state and actions:
- `board`
- `gameMode`
- `aiDifficulty`
- `currentPlayer`
- `gameStatus`
- `winner`
- `lastMove`
- `winningLine`
- `moveHistory`
- `startGame(mode: GameMode)`
- `playMove(x: number, y: number)`
- `undoMove()`
- `resetGame()`

Tests must cover:
- alternating turns
- rejecting moves after game over
- storing last move
- undo in PvP removes one move and rewinds current player
- win state updates `winner`, `gameStatus`, and `winningLine`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/game.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/game.ts src/stores/game.spec.ts
git commit -m "feat: add pinia game store for local play"
```

### Task 4: Build the board UI and interactive app shell

**Files:**
- Create: `src/components/BoardGrid.vue`
- Create: `src/components/StatusPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Test: `src/components/BoardGrid.spec.ts`
- Test: `src/App.spec.ts`

**Step 1: Write the failing test**

```ts
// src/components/BoardGrid.spec.ts
import { mount } from '@vue/test-utils';
import BoardGrid from './BoardGrid.vue';

test('emits place-piece with board coordinates when an empty cell is clicked', async () => {
  const wrapper = mount(BoardGrid, {
    props: {
      board: Array.from({ length: 15 }, () => Array(15).fill(null)),
      disabled: false,
      lastMove: null,
      winningLine: [],
    },
  });

  await wrapper.find('[data-cell="7-7"]').trigger('click');

  expect(wrapper.emitted('place-piece')).toEqual([[[7, 7]]]);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/BoardGrid.spec.ts`
Expected: FAIL because the component does not exist.

**Step 3: Write minimal implementation**

Implement:
- `BoardGrid.vue` rendering a 15x15 clickable grid with `data-cell="${x}-${y}"`
- `StatusPanel.vue` showing current player and game result
- `App.vue` wiring the store to the board and status components
- responsive layout for desktop and mobile

`App.vue` should at minimum:

```vue
<template>
  <main class="layout">
    <section class="game-panel">
      <StatusPanel ... />
      <BoardGrid ... @place-piece="onPlacePiece" />
    </section>
  </main>
</template>
```

Tests must cover:
- clicking empty cells dispatches `playMove`
- occupied cells do not emit a move event
- the app displays `黑方回合` on first render

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/BoardGrid.spec.ts src/App.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/BoardGrid.vue src/components/StatusPanel.vue src/App.vue src/style.css src/components/BoardGrid.spec.ts src/App.spec.ts
git commit -m "feat: add interactive gobang board ui"
```

### Task 5: Add control panel, history panel, and undo flow

**Files:**
- Create: `src/components/ControlPanel.vue`
- Create: `src/components/HistoryPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/stores/game.ts`
- Test: `src/components/ControlPanel.spec.ts`
- Test: `src/components/HistoryPanel.spec.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

```ts
// src/components/ControlPanel.spec.ts
import { mount } from '@vue/test-utils';
import ControlPanel from './ControlPanel.vue';

test('emits restart and undo actions', async () => {
  const wrapper = mount(ControlPanel, {
    props: {
      canUndo: true,
      gameMode: 'pvp',
      aiDifficulty: 'easy',
    },
  });

  await wrapper.find('[data-action="undo"]').trigger('click');
  await wrapper.find('[data-action="restart"]').trigger('click');

  expect(wrapper.emitted('undo')).toHaveLength(1);
  expect(wrapper.emitted('restart')).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ControlPanel.spec.ts`
Expected: FAIL because the panel component does not exist.

**Step 3: Write minimal implementation**

Implement:
- `ControlPanel.vue` with game mode switch, difficulty select, restart, and undo
- `HistoryPanel.vue` listing move number, color, and coordinates
- store support for:
  - changing mode before restart
  - undoing one move in PvP
  - undoing two plies in PvE so the human reclaims the turn

Tests must cover:
- history list renders move entries like `1. 黑棋 (8, 8)`
- undo button disabled when there is no move history
- switching to PvE preserves selected difficulty in store state

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ControlPanel.spec.ts src/components/HistoryPanel.spec.ts src/stores/game.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ControlPanel.vue src/components/HistoryPanel.vue src/App.vue src/stores/game.ts src/components/ControlPanel.spec.ts src/components/HistoryPanel.spec.ts src/stores/game.spec.ts
git commit -m "feat: add controls history and undo flow"
```

### Task 6: Add local persistence for unfinished games and history

**Files:**
- Create: `src/utils/storage.ts`
- Modify: `src/stores/game.ts`
- Test: `src/utils/storage.spec.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

```ts
// src/utils/storage.spec.ts
import { loadSnapshot, saveSnapshot } from './storage';

test('round-trips a saved game snapshot', () => {
  const snapshot = {
    board: [[null]],
    currentPlayer: 'black',
    gameMode: 'pvp',
    aiDifficulty: 'easy',
    gameStatus: 'playing',
    winner: null,
    moveHistory: [],
    lastMove: null,
    winningLine: [],
  };

  saveSnapshot(snapshot);

  expect(loadSnapshot()).toEqual(snapshot);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/storage.spec.ts`
Expected: FAIL because persistence helpers are missing.

**Step 3: Write minimal implementation**

Implement `src/utils/storage.ts`:

```ts
const STORAGE_KEY = 'gobang-game-snapshot';

export function saveSnapshot(snapshot: PersistedGameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadSnapshot(): PersistedGameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}
```

Then wire the store to:
- hydrate from storage on startup
- save after each successful move, undo, restart, and setting change
- ignore corrupted JSON and fall back to a fresh game

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/storage.spec.ts src/stores/game.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/storage.spec.ts src/stores/game.ts src/stores/game.spec.ts
git commit -m "feat: persist gobang game state locally"
```

### Task 7: Add simple AI for PvE mode

**Files:**
- Create: `src/utils/ai.ts`
- Modify: `src/stores/game.ts`
- Test: `src/utils/ai.spec.ts`
- Test: `src/stores/game.spec.ts`

**Step 1: Write the failing test**

```ts
// src/utils/ai.spec.ts
import { chooseEasyMove } from './ai';
import { createEmptyBoard, placeStone } from './board';

test('easy ai plays a winning move when one is available', () => {
  let board = createEmptyBoard(15);

  for (let x = 3; x < 7; x += 1) {
    board = placeStone(board, x, 7, 'white');
  }

  expect(chooseEasyMove(board, 'white')).toEqual({ x: 7, y: 7 });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/ai.spec.ts`
Expected: FAIL because the AI module does not exist.

**Step 3: Write minimal implementation**

Implement `chooseEasyMove(board, aiPlayer)` with this order:
- play an immediate winning move if available
- block the opponent's immediate winning move if required
- otherwise score empty cells adjacent to existing stones
- prefer center proximity as a tiebreaker

Update store behavior so:
- `startGame('pve')` enables AI turns
- after a human move, the store schedules one AI reply
- undo in PvE rolls back both the human and AI move if both exist

Tests must cover:
- AI takes a winning move
- AI blocks a four-in-a-row threat
- PvE store performs an automatic AI reply after the human move

**Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/ai.spec.ts src/stores/game.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/ai.spec.ts src/stores/game.ts src/stores/game.spec.ts
git commit -m "feat: add easy ai opponent"
```

### Task 8: Polish the interface and prepare release verification

**Files:**
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Modify: `src/components/StatusPanel.vue`
- Modify: `src/components/HistoryPanel.vue`
- Modify: `package.json`
- Test: `src/App.spec.ts`

**Step 1: Write the failing test**

```ts
// src/App.spec.ts
test('shows a victory message when the game is finished', async () => {
  // Mount app with seeded store state and assert a human-readable winner banner.
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.spec.ts`
Expected: FAIL because the final messaging or polish state is missing.

**Step 3: Write minimal implementation**

Finish the MVP with:
- clear winner and draw messaging
- highlighted last move
- highlighted winning line
- mobile-safe spacing and history overflow handling
- `npm run build` working cleanly

Do not add medium/hard minimax AI or Capacitor packaging in this task. Leave those as post-MVP follow-up work after the browser game is stable.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.spec.ts && npm run build`
Expected: all tests PASS and the Vite production build completes successfully.

**Step 5: Commit**

```bash
git add src/App.vue src/style.css src/components/StatusPanel.vue src/components/HistoryPanel.vue package.json src/App.spec.ts
git commit -m "feat: polish gobang mvp for browser release"
```

## Post-MVP Follow-up

These are intentionally out of scope for the first implementation pass:
- medium AI with shallow minimax
- hard AI with alpha-beta pruning
- Capacitor Android packaging
- replay/jump-to-move interaction in history
- sound effects and richer animations

Treat each as a separate design and planning pass after the MVP is verified.
