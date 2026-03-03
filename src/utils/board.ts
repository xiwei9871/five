import type { Board, Cell, Player } from '../types/game';

export function createEmptyBoard(size = 15): Board {
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function placeStone(board: Board, x: number, y: number, player: Player): Board {
  if (board[y]?.[x] === undefined) {
    throw new Error('Cell is out of bounds');
  }

  if (board[y][x] !== null) {
    throw new Error('Cell is already occupied');
  }

  return board.map((row, rowIndex) =>
    rowIndex === y ? row.map((cell, colIndex) => (colIndex === x ? player : cell)) : [...row],
  );
}
