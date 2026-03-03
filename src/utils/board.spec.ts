import { describe, expect, test } from 'vitest';

import { createEmptyBoard, placeStone } from './board';

describe('board helpers', () => {
  test('creates an empty square board', () => {
    const board = createEmptyBoard(15);

    expect(board).toHaveLength(15);
    expect(board.every((row) => row.length === 15)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  test('throws when placing a stone on an occupied cell', () => {
    const board = placeStone(createEmptyBoard(15), 7, 7, 'black');

    expect(() => placeStone(board, 7, 7, 'white')).toThrow('Cell is already occupied');
  });
});
