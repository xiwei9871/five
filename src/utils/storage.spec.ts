import { beforeEach, describe, expect, test } from 'vitest';

import { loadSnapshot, saveSnapshot } from './storage';

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

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
});
