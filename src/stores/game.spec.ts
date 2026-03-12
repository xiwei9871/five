import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useGameStore } from './game';
import { loadSnapshot } from '../utils/storage';

describe('game store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../utils/ai');
  });

  test('plays alternating moves and records history', async () => {
    const store = useGameStore();

    store.startGame('pvp');
    await store.playMove(7, 7);
    await store.playMove(8, 7);

    expect(store.board[7][7]).toBe('black');
    expect(store.board[7][8]).toBe('white');
    expect(store.currentPlayer).toBe('black');
    expect(store.moveHistory).toHaveLength(2);
    expect(store.lastMove).toEqual({ x: 8, y: 7 });
  });

  test('updates winner and game status after a five-in-a-row move', async () => {
    const store = useGameStore();

    store.startGame('pvp');
    await store.playMove(0, 0);
    await store.playMove(0, 1);
    await store.playMove(1, 0);
    await store.playMove(1, 1);
    await store.playMove(2, 0);
    await store.playMove(2, 1);
    await store.playMove(3, 0);
    await store.playMove(3, 1);
    await store.playMove(4, 0);

    expect(store.winner).toBe('black');
    expect(store.gameStatus).toBe('finished');
    expect(store.winningLine).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  test('rejects moves after the game is finished', async () => {
    const store = useGameStore();

    store.startGame('pvp');
    await store.playMove(0, 0);
    await store.playMove(0, 1);
    await store.playMove(1, 0);
    await store.playMove(1, 1);
    await store.playMove(2, 0);
    await store.playMove(2, 1);
    await store.playMove(3, 0);
    await store.playMove(3, 1);
    await store.playMove(4, 0);

    await expect(store.playMove(4, 4)).rejects.toThrow('Game is already finished');
  });

  test('undoes the last move in pvp mode', async () => {
    const store = useGameStore();

    store.startGame('pvp');
    await store.playMove(7, 7);
    await store.playMove(8, 7);

    store.undoMove();

    expect(store.board[7][8]).toBeNull();
    expect(store.currentPlayer).toBe('white');
    expect(store.moveHistory).toHaveLength(1);
    expect(store.lastMove).toEqual({ x: 7, y: 7 });
  });

  test('stores mode and difficulty changes before restarting into pve', () => {
    const store = useGameStore();

    store.setGameMode('pve');
    store.setAiDifficulty('hard');
    store.startGame(store.gameMode);

    expect(store.gameMode).toBe('pve');
    expect(store.aiDifficulty).toBe('hard');
    expect(store.gameStatus).toBe('playing');
  });

  test('undoes the last two plies in pve mode so the human reclaims the turn', async () => {
    const store = useGameStore();

    store.startGame('pve');
    await store.playMove(7, 7);

    store.undoMove();

    expect(store.moveHistory).toHaveLength(0);
    expect(store.board[7][7]).toBeNull();
    expect(store.currentPlayer).toBe('black');
    expect(store.gameStatus).toBe('ready');
  });

  test('persists successful moves to local storage', async () => {
    const store = useGameStore();

    store.startGame('pvp');
    await store.playMove(7, 7);

    expect(loadSnapshot()).toMatchObject({
      gameMode: 'pvp',
      currentPlayer: 'white',
      gameStatus: 'playing',
      lastMove: { x: 7, y: 7 },
      moveHistory: [{ x: 7, y: 7, player: 'black' }],
    });
  });

  test('hydrates store state from a saved snapshot', () => {
    localStorage.setItem(
      'gobang-game-snapshot',
      JSON.stringify({
        board: Array.from({ length: 15 }, (_, rowIndex) =>
          Array.from({ length: 15 }, (_, colIndex) =>
            rowIndex === 7 && colIndex === 7 ? 'black' : null,
          ),
        ),
        currentPlayer: 'white',
        gameMode: 'pvp',
        aiDifficulty: 'easy',
        gameStatus: 'playing',
        winner: null,
        moveHistory: [{ x: 7, y: 7, player: 'black', timestamp: '2026-03-03T00:00:00.000Z' }],
        lastMove: { x: 7, y: 7 },
        winningLine: [],
      }),
    );

    const store = useGameStore();

    store.hydrate();

    expect(store.board[7][7]).toBe('black');
    expect(store.currentPlayer).toBe('white');
    expect(store.moveHistory).toHaveLength(1);
  });

  test('falls back to a fresh game when the saved snapshot is invalid', () => {
    localStorage.setItem('gobang-game-snapshot', '{not-json');

    const store = useGameStore();

    store.hydrate();

    expect(store.moveHistory).toHaveLength(0);
    expect(store.currentPlayer).toBe('black');
    expect(store.board[7][7]).toBeNull();
  });

  test('replies automatically in pve mode after the human move', async () => {
    const store = useGameStore();

    store.startGame('pve');
    await store.playMove(7, 7);

    expect(store.moveHistory).toHaveLength(2);
    expect(store.currentPlayer).toBe('black');
    expect(store.moveHistory[0]).toMatchObject({ x: 7, y: 7, player: 'black' });
    expect(store.moveHistory[1].player).toBe('white');
  });

  test('uses medium ai when aiDifficulty is medium', async () => {
    vi.doMock('../utils/ai', async () => {
      const actual = await vi.importActual<typeof import('../utils/ai')>('../utils/ai');

      return {
        ...actual,
        chooseEasyMove: vi.fn(() => ({ x: 0, y: 0 })),
        chooseMediumMove: vi.fn(() => ({ x: 1, y: 1 })),
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { useGameStore: useMockedStore } = await import('./game');
    setActivePinia(createPinia());
    const store = useMockedStore();

    store.setGameMode('pve');
    store.setAiDifficulty('medium');
    store.startGame('pve');
    await store.playMove(7, 7);

    expect(store.aiDifficulty).toBe('medium');
    expect(store.moveHistory[1]).toMatchObject({ x: 1, y: 1, player: 'white' });
  });

  test('uses hard ai when aiDifficulty is hard', async () => {
    vi.doMock('../utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => {
        throw new Error('remote engine unavailable');
      }),
    }));

    vi.doMock('../utils/ai', async () => {
      const actual = await vi.importActual<typeof import('../utils/ai')>('../utils/ai');

      return {
        ...actual,
        chooseEasyMove: vi.fn(() => ({ x: 0, y: 0 })),
        chooseMediumMove: vi.fn(() => ({ x: 1, y: 1 })),
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { useGameStore: useMockedStore } = await import('./game');
    setActivePinia(createPinia());
    const store = useMockedStore();

    store.setGameMode('pve');
    store.setAiDifficulty('hard');
    store.startGame('pve');
    await store.playMove(7, 7);

    expect(store.aiDifficulty).toBe('hard');
    expect(store.moveHistory[1]).toMatchObject({ x: 2, y: 2, player: 'white' });
  });

  test('uses the remote engine first when aiDifficulty is hard', async () => {
    vi.doMock('../utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => ({ x: 3, y: 3 })),
    }));

    vi.doMock('../utils/ai', async () => {
      const actual = await vi.importActual<typeof import('../utils/ai')>('../utils/ai');

      return {
        ...actual,
        chooseEasyMove: vi.fn(() => ({ x: 0, y: 0 })),
        chooseMediumMove: vi.fn(() => ({ x: 1, y: 1 })),
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { useGameStore: useMockedStore } = await import('./game');
    setActivePinia(createPinia());
    const store = useMockedStore();

    store.setGameMode('pve');
    store.setAiDifficulty('hard');
    store.startGame('pve');
    await store.playMove(7, 7);

    expect(store.moveHistory[1]).toMatchObject({ x: 3, y: 3, player: 'white' });
  });

  test('falls back to the local hard ai when the remote engine request fails', async () => {
    vi.doMock('../utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => {
        throw new Error('remote engine unavailable');
      }),
    }));

    vi.doMock('../utils/ai', async () => {
      const actual = await vi.importActual<typeof import('../utils/ai')>('../utils/ai');

      return {
        ...actual,
        chooseEasyMove: vi.fn(() => ({ x: 0, y: 0 })),
        chooseMediumMove: vi.fn(() => ({ x: 1, y: 1 })),
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { useGameStore: useMockedStore } = await import('./game');
    setActivePinia(createPinia());
    const store = useMockedStore();

    store.setGameMode('pve');
    store.setAiDifficulty('hard');
    store.startGame('pve');
    await store.playMove(7, 7);

    expect(store.moveHistory[1]).toMatchObject({ x: 2, y: 2, player: 'white' });
  });

  test('preserves aiDifficulty after hydration and uses it on the next ai turn', async () => {
    localStorage.setItem(
      'gobang-game-snapshot',
      JSON.stringify({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'black',
        gameMode: 'pve',
        aiDifficulty: 'hard',
        gameStatus: 'playing',
        winner: null,
        moveHistory: [],
        lastMove: null,
        winningLine: [],
      }),
    );

    vi.doMock('../utils/ai', async () => {
      const actual = await vi.importActual<typeof import('../utils/ai')>('../utils/ai');

      return {
        ...actual,
        chooseEasyMove: vi.fn(() => ({ x: 0, y: 0 })),
        chooseMediumMove: vi.fn(() => ({ x: 1, y: 1 })),
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { useGameStore: useMockedStore } = await import('./game');
    setActivePinia(createPinia());
    const store = useMockedStore();

    store.hydrate();
    await store.playMove(7, 7);

    expect(store.aiDifficulty).toBe('hard');
    expect(store.moveHistory[1]).toMatchObject({ x: 2, y: 2, player: 'white' });
  });
});
