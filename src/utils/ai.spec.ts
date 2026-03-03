import { describe, expect, test } from 'vitest';

import { createEmptyBoard, placeStone } from './board';
import { chooseEasyMove, chooseHardMove, chooseMediumMove, getCandidateMoves, scoreMove } from './ai';

describe('easy ai', () => {
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
    expect(candidates).not.toContainEqual({ x: 7, y: 7 });
  });

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

  test('scores an immediate winning move above a non-winning move', () => {
    let board = createEmptyBoard(15);

    for (let x = 3; x < 7; x += 1) {
      board = placeStone(board, x, 7, 'white');
    }

    expect(scoreMove(board, { x: 7, y: 7 }, 'white')).toBeGreaterThan(
      scoreMove(board, { x: 7, y: 6 }, 'white'),
    );
  });

  test('scores blocking an opponent threat above an unrelated move', () => {
    let board = createEmptyBoard(15);

    for (let x = 4; x < 8; x += 1) {
      board = placeStone(board, x, 8, 'black');
    }

    expect(scoreMove(board, { x: 8, y: 8 }, 'white')).toBeGreaterThan(
      scoreMove(board, { x: 7, y: 7 }, 'white'),
    );
  });

  test('medium ai selects a winning move from the candidate set', () => {
    let board = createEmptyBoard(15);

    for (let x = 3; x < 7; x += 1) {
      board = placeStone(board, x, 7, 'white');
    }

    expect([{ x: 2, y: 7 }, { x: 7, y: 7 }]).toContainEqual(chooseMediumMove(board, 'white'));
  });

  test('hard ai blocks an immediate threat with deterministic tie-breaking', () => {
    let board = createEmptyBoard(15);

    for (let x = 4; x < 8; x += 1) {
      board = placeStone(board, x, 8, 'black');
    }

    expect([{ x: 3, y: 8 }, { x: 8, y: 8 }]).toContainEqual(chooseHardMove(board, 'white'));
  });
});
