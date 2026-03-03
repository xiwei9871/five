import { beforeEach, describe, expect, test } from 'vitest';

import { loadSnapshot, saveSnapshot, type PersistedGameState } from './storage';

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('round-trips a saved game snapshot', () => {
    const snapshot: PersistedGameState = {
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
