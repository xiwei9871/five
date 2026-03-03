import { beforeEach, describe, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useGameStore } from './game';

describe('game store', () => {
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
    expect(store.lastMove).toEqual({ x: 8, y: 7 });
  });

  test('updates winner and game status after a five-in-a-row move', () => {
    const store = useGameStore();

    store.startGame('pvp');
    store.playMove(0, 0);
    store.playMove(0, 1);
    store.playMove(1, 0);
    store.playMove(1, 1);
    store.playMove(2, 0);
    store.playMove(2, 1);
    store.playMove(3, 0);
    store.playMove(3, 1);
    store.playMove(4, 0);

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

  test('rejects moves after the game is finished', () => {
    const store = useGameStore();

    store.startGame('pvp');
    store.playMove(0, 0);
    store.playMove(0, 1);
    store.playMove(1, 0);
    store.playMove(1, 1);
    store.playMove(2, 0);
    store.playMove(2, 1);
    store.playMove(3, 0);
    store.playMove(3, 1);
    store.playMove(4, 0);

    expect(() => store.playMove(4, 4)).toThrow('Game is already finished');
  });

  test('undoes the last move in pvp mode', () => {
    const store = useGameStore();

    store.startGame('pvp');
    store.playMove(7, 7);
    store.playMove(8, 7);

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

  test('undoes the last two plies in pve mode so the human reclaims the turn', () => {
    const store = useGameStore();

    store.startGame('pve');
    store.playMove(7, 7);
    store.playMove(8, 7);

    store.undoMove();

    expect(store.moveHistory).toHaveLength(0);
    expect(store.board[7][7]).toBeNull();
    expect(store.board[7][8]).toBeNull();
    expect(store.currentPlayer).toBe('black');
    expect(store.gameStatus).toBe('ready');
  });
});
