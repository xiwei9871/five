import type { Board, Player, Point } from '../types/game';

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

function collectDirection(board: Board, x: number, y: number, dx: number, dy: number, player: Player) {
  const line: Point[] = [];
  let currentX = x + dx;
  let currentY = y + dy;

  while (board[currentY]?.[currentX] === player) {
    line.push({ x: currentX, y: currentY });
    currentX += dx;
    currentY += dy;
  }

  return line;
}

export function getWinner(board: Board, x: number, y: number): { winner: Player; line: Point[] } | null {
  const player = board[y]?.[x];

  if (!player) {
    return null;
  }

  for (const { dx, dy } of DIRECTIONS) {
    const backward = collectDirection(board, x, y, -dx, -dy, player).reverse();
    const forward = collectDirection(board, x, y, dx, dy, player);
    const line = [...backward, { x, y }, ...forward];

    if (line.length >= 5) {
      return {
        winner: player,
        line: line.slice(0, 5),
      };
    }
  }

  return null;
}
