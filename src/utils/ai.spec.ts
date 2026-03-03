import { describe, expect, test } from 'vitest';

import { createEmptyBoard, placeStone } from './board';
import { chooseEasyMove } from './ai';

describe('easy ai', () => {
  test('plays a winning move when one is available', () => {
    let board = createEmptyBoard(15);

    for (let x = 3; x < 7; x += 1) {
      board = placeStone(board, x, 7, 'white');
    }

    expect([{ x: 2, y: 7 }, { x: 7, y: 7 }]).toContainEqual(chooseEasyMove(board, 'white'));
  });

  test('blocks an opponent winning move', () => {
    let board = createEmptyBoard(15);

    for (let x = 4; x < 8; x += 1) {
      board = placeStone(board, x, 8, 'black');
    }

    expect([{ x: 3, y: 8 }, { x: 8, y: 8 }]).toContainEqual(chooseEasyMove(board, 'white'));
  });
});
