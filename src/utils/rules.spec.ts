import { describe, expect, test } from 'vitest';

import { createEmptyBoard, placeStone } from './board';
import { getWinner } from './rules';

describe('winner detection', () => {
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

  test('returns null when a move does not complete five in a row', () => {
    let board = createEmptyBoard(15);

    for (let x = 7; x < 11; x += 1) {
      board = placeStone(board, x, 6, 'white');
    }

    expect(getWinner(board, 10, 6)).toBeNull();
  });

  test('detects five stones in a vertical row', () => {
    let board = createEmptyBoard(15);

    for (let y = 4; y < 9; y += 1) {
      board = placeStone(board, 9, y, 'white');
    }

    expect(getWinner(board, 9, 8)).toEqual({
      winner: 'white',
      line: [
        { x: 9, y: 4 },
        { x: 9, y: 5 },
        { x: 9, y: 6 },
        { x: 9, y: 7 },
        { x: 9, y: 8 },
      ],
    });
  });

  test('detects five stones in a descending diagonal', () => {
    let board = createEmptyBoard(15);

    for (let offset = 0; offset < 5; offset += 1) {
      board = placeStone(board, 2 + offset, 3 + offset, 'black');
    }

    expect(getWinner(board, 6, 7)).toEqual({
      winner: 'black',
      line: [
        { x: 2, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 7 },
      ],
    });
  });

  test('detects five stones in an ascending diagonal', () => {
    let board = createEmptyBoard(15);

    for (let offset = 0; offset < 5; offset += 1) {
      board = placeStone(board, 4 + offset, 10 - offset, 'white');
    }

    expect(getWinner(board, 8, 6)).toEqual({
      winner: 'white',
      line: [
        { x: 4, y: 10 },
        { x: 5, y: 9 },
        { x: 6, y: 8 },
        { x: 7, y: 7 },
        { x: 8, y: 6 },
      ],
    });
  });
});
