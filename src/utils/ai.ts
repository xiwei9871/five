import type { Board, Player, Point } from '../types/game';
import { placeStone } from './board';
import { getWinner } from './rules';

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

function findImmediateMove(board: Board, player: Player): Point | null {
  for (const move of getEmptyCells(board)) {
    const nextBoard = placeStone(board, move.x, move.y, player);

    if (getWinner(nextBoard, move.x, move.y)?.winner === player) {
      return move;
    }
  }

  return null;
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

  return [...getEmptyCells(board)].sort((left, right) => {
    const leftDistance = Math.abs(left.x - 7) + Math.abs(left.y - 7);
    const rightDistance = Math.abs(right.x - 7) + Math.abs(right.y - 7);

    return leftDistance - rightDistance;
  })[0];
}
