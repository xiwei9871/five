import type { Board, Player, Point } from '../types/game';
import { placeStone } from './board';
import { getWinner } from './rules';

const BOARD_CENTER = 7;
const CANDIDATE_RADIUS = 1;
const WIN_SCORE = 1_000_000;
const BLOCK_SCORE = 500_000;
const CENTER_WEIGHT = 100;

function getOpponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

function getEmptyCells(board: Board): Point[] {
  const moves: Point[] = [];

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === null) {
        moves.push({ x, y });
      }
    }
  }

  return moves;
}

function isBoardEmpty(board: Board) {
  return board.every((row) => row.every((cell) => cell === null));
}

function comparePoints(left: Point, right: Point) {
  const leftDistance = Math.abs(left.x - BOARD_CENTER) + Math.abs(left.y - BOARD_CENTER);
  const rightDistance = Math.abs(right.x - BOARD_CENTER) + Math.abs(right.y - BOARD_CENTER);

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  if (left.y !== right.y) {
    return left.y - right.y;
  }

  return left.x - right.x;
}

export function getCandidateMoves(board: Board): Point[] {
  if (isBoardEmpty(board)) {
    return [{ x: BOARD_CENTER, y: BOARD_CENTER }];
  }

  const candidates = new Map<string, Point>();

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === null) {
        continue;
      }

      for (let offsetY = -CANDIDATE_RADIUS; offsetY <= CANDIDATE_RADIUS; offsetY += 1) {
        for (let offsetX = -CANDIDATE_RADIUS; offsetX <= CANDIDATE_RADIUS; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;

          if (board[nextY]?.[nextX] !== null) {
            continue;
          }

          if (board[nextY]?.[nextX] === undefined) {
            continue;
          }

          candidates.set(`${nextX},${nextY}`, { x: nextX, y: nextY });
        }
      }
    }
  }

  return [...candidates.values()].sort(comparePoints);
}

function findImmediateMove(board: Board, player: Player): Point | null {
  for (const move of getCandidateMoves(board)) {
    const nextBoard = placeStone(board, move.x, move.y, player);

    if (getWinner(nextBoard, move.x, move.y)?.winner === player) {
      return move;
    }
  }

  return null;
}

function isImmediateWinningMove(board: Board, move: Point, player: Player) {
  const nextBoard = placeStone(board, move.x, move.y, player);

  return getWinner(nextBoard, move.x, move.y)?.winner === player;
}

function getCenterPreference(move: Point) {
  return CENTER_WEIGHT - (Math.abs(move.x - BOARD_CENTER) + Math.abs(move.y - BOARD_CENTER));
}

export function scoreMove(board: Board, move: Point, player: Player): number {
  if (isImmediateWinningMove(board, move, player)) {
    return WIN_SCORE;
  }

  if (isImmediateWinningMove(board, move, getOpponent(player))) {
    return BLOCK_SCORE;
  }

  return getCenterPreference(move);
}

export function chooseEasyMove(board: Board, aiPlayer: Player): Point {
  const winningMove = findImmediateMove(board, aiPlayer);

  if (winningMove) {
    return winningMove;
  }

  const blockingMove = findImmediateMove(board, getOpponent(aiPlayer));

  if (blockingMove) {
    return blockingMove;
  }

  return [...getCandidateMoves(board)].sort((left, right) => scoreMove(board, right, aiPlayer) - scoreMove(board, left, aiPlayer))[0]
    ?? getEmptyCells(board)[0];
}
