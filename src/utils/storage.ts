import type { Board, Player, Point } from '../types/game';

export type PersistedGameState = {
  board: Board;
  currentPlayer: Player;
  gameMode: 'pvp' | 'pve';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  gameStatus: 'ready' | 'playing' | 'finished';
  winner: Player | 'draw' | null;
  moveHistory: Array<{
    x: number;
    y: number;
    player: Player;
    timestamp: string;
  }>;
  lastMove: Point | null;
  winningLine: Point[];
};

const STORAGE_KEY = 'gobang-game-snapshot';

export function saveSnapshot(snapshot: PersistedGameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadSnapshot(): PersistedGameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  return raw ? (JSON.parse(raw) as PersistedGameState) : null;
}
