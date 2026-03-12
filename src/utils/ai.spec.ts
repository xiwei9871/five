import { describe, expect, test } from 'vitest';
import type { Player, Point } from '../types/game';

import { createEmptyBoard, placeStone } from './board';
import {
  chooseEasyMove,
  chooseHardMove,
  chooseMediumMove,
  findVcfWinningMove,
  getCandidateMoves,
  scoreMove,
} from './ai';

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

  test('scores creating an open four above a neutral central move', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 4, 4, 'white');
    board = placeStone(board, 5, 4, 'white');
    board = placeStone(board, 6, 4, 'white');
    board = placeStone(board, 7, 7, 'black');
    board = placeStone(board, 8, 7, 'black');

    expect(scoreMove(board, { x: 7, y: 4 }, 'white')).toBeGreaterThan(
      scoreMove(board, { x: 7, y: 6 }, 'white'),
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

  test('medium prefers extending an existing three into an open four over a neutral central move', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 4, 4, 'white');
    board = placeStone(board, 5, 4, 'white');
    board = placeStone(board, 6, 4, 'white');
    board = placeStone(board, 7, 7, 'black');
    board = placeStone(board, 8, 7, 'black');

    expect([{ x: 3, y: 4 }, { x: 7, y: 4 }]).toContainEqual(chooseMediumMove(board, 'white'));
  });

  test('hard fills a single-gap line to create a forcing open four', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 2, 2, 'white');
    board = placeStone(board, 3, 2, 'white');
    board = placeStone(board, 5, 2, 'white');
    board = placeStone(board, 7, 7, 'black');
    board = placeStone(board, 8, 7, 'black');

    expect(chooseHardMove(board, 'white')).toEqual({ x: 4, y: 2 });
  });

  test('hard finds a stronger continuation than medium in a forked pressure position', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 5, 5, 'white');
    board = placeStone(board, 6, 5, 'white');
    board = placeStone(board, 7, 5, 'white');
    board = placeStone(board, 6, 6, 'white');
    board = placeStone(board, 8, 7, 'black');
    board = placeStone(board, 7, 7, 'black');
    board = placeStone(board, 6, 7, 'black');

    expect(chooseMediumMove(board, 'white')).toEqual({ x: 5, y: 7 });
    expect([{ x: 8, y: 5 }, { x: 5, y: 7 }]).toContainEqual(chooseHardMove(board, 'white'));
  });

  test('hard candidate generation includes tactical cells at distance two', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 7, 7, 'white');
    board = placeStone(board, 10, 7, 'black');

    const radiusOne = getCandidateMoves(board);
    const radiusTwo = getCandidateMoves(board, 2);

    expect(radiusOne).not.toContainEqual({ x: 9, y: 9 });
    expect(radiusTwo).toContainEqual({ x: 9, y: 9 });
  });

  test('vcf solver finds a forcing win for hard mode before regular search', () => {
    let board = createEmptyBoard(15);

    board = placeStone(board, 5, 7, 'white');
    board = placeStone(board, 6, 7, 'white');
    board = placeStone(board, 8, 7, 'white');
    board = placeStone(board, 9, 7, 'white');
    board = placeStone(board, 4, 6, 'black');
    board = placeStone(board, 10, 6, 'black');
    board = placeStone(board, 7, 6, 'black');

    expect(findVcfWinningMove(board, 'white', 6)).toEqual({ x: 7, y: 7 });
    expect(chooseHardMove(board, 'white')).toEqual({ x: 7, y: 7 });
  });

  test('hard outperforms medium on a seeded tactical position suite', () => {
    const tacticalPositions: Array<{
      toMove: Player;
      setup: Array<{ point: Point; player: Player }>;
    }> = [
      {
        toMove: 'white',
        setup: [
          { point: { x: 5, y: 5 }, player: 'white' },
          { point: { x: 6, y: 5 }, player: 'white' },
          { point: { x: 7, y: 5 }, player: 'white' },
          { point: { x: 6, y: 6 }, player: 'white' },
          { point: { x: 8, y: 7 }, player: 'black' },
          { point: { x: 7, y: 7 }, player: 'black' },
          { point: { x: 6, y: 7 }, player: 'black' },
        ],
      },
      {
        toMove: 'white',
        setup: [
          { point: { x: 2, y: 2 }, player: 'white' },
          { point: { x: 3, y: 2 }, player: 'white' },
          { point: { x: 5, y: 2 }, player: 'white' },
          { point: { x: 7, y: 7 }, player: 'black' },
          { point: { x: 8, y: 7 }, player: 'black' },
        ],
      },
      {
        toMove: 'black',
        setup: [
          { point: { x: 7, y: 7 }, player: 'white' },
          { point: { x: 8, y: 7 }, player: 'white' },
          { point: { x: 9, y: 7 }, player: 'white' },
          { point: { x: 5, y: 8 }, player: 'black' },
          { point: { x: 6, y: 8 }, player: 'black' },
          { point: { x: 7, y: 8 }, player: 'black' },
        ],
      },
      {
        toMove: 'white',
        setup: [
          { point: { x: 5, y: 7 }, player: 'white' },
          { point: { x: 6, y: 7 }, player: 'white' },
          { point: { x: 8, y: 7 }, player: 'white' },
          { point: { x: 9, y: 7 }, player: 'white' },
          { point: { x: 4, y: 6 }, player: 'black' },
          { point: { x: 10, y: 6 }, player: 'black' },
          { point: { x: 7, y: 6 }, player: 'black' },
        ],
      },
    ];

    let hardTotalScore = 0;
    let mediumTotalScore = 0;

    tacticalPositions.forEach(({ toMove, setup }) => {
      let board = createEmptyBoard(15);
      setup.forEach(({ point, player }) => {
        board = placeStone(board, point.x, point.y, player);
      });

      const hardMove = chooseHardMove(board, toMove);
      const mediumMove = chooseMediumMove(board, toMove);
      hardTotalScore += scoreMove(board, hardMove, toMove);
      mediumTotalScore += scoreMove(board, mediumMove, toMove);
    });

    expect(hardTotalScore).toBeGreaterThanOrEqual(mediumTotalScore);
  });

  test('hard move selection average time stays within browser budget envelope', () => {
    const board = createEmptyBoard(15);
    const scriptedMoves: Array<{ point: Point; player: Player }> = [
      { point: { x: 7, y: 7 }, player: 'black' },
      { point: { x: 8, y: 7 }, player: 'white' },
      { point: { x: 6, y: 7 }, player: 'black' },
      { point: { x: 8, y: 8 }, player: 'white' },
      { point: { x: 5, y: 7 }, player: 'black' },
      { point: { x: 6, y: 8 }, player: 'white' },
      { point: { x: 9, y: 7 }, player: 'black' },
      { point: { x: 7, y: 8 }, player: 'white' },
      { point: { x: 10, y: 7 }, player: 'black' },
      { point: { x: 8, y: 6 }, player: 'white' },
    ];

    let midgameBoard = board;
    scriptedMoves.forEach(({ point, player }) => {
      midgameBoard = placeStone(midgameBoard, point.x, point.y, player);
    });

    const rounds = 6;
    let totalMs = 0;

    for (let i = 0; i < rounds; i += 1) {
      const start = performance.now();
      chooseHardMove(midgameBoard, i % 2 === 0 ? 'white' : 'black');
      totalMs += performance.now() - start;
    }

    const averageMs = totalMs / rounds;

    expect(averageMs).toBeLessThanOrEqual(400);
  });
});
