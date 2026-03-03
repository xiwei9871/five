import { defineStore } from 'pinia';

import type { Player, Point } from '../types/game';
import { createEmptyBoard, placeStone } from '../utils/board';
import { getWinner } from '../utils/rules';

type GameMode = 'pvp' | 'pve';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'ready' | 'playing' | 'finished';
type Winner = Player | 'draw' | null;

type Move = Point & {
  player: Player;
  timestamp: string;
};

const BOARD_SIZE = 15;

function createInitialState() {
  return {
    board: createEmptyBoard(BOARD_SIZE),
    gameMode: 'pvp' as GameMode,
    aiDifficulty: 'easy' as Difficulty,
    currentPlayer: 'black' as Player,
    gameStatus: 'ready' as GameStatus,
    winner: null as Winner,
    moveHistory: [] as Move[],
    lastMove: null as Point | null,
    winningLine: [] as Point[],
  };
}

function rebuildBoard(moveHistory: Move[]) {
  let board = createEmptyBoard(BOARD_SIZE);

  for (const move of moveHistory) {
    board = placeStone(board, move.x, move.y, move.player);
  }

  return board;
}

function getNextPlayer(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

export const useGameStore = defineStore('game', {
  state: createInitialState,

  actions: {
    startGame(mode: GameMode) {
      const state = createInitialState();

      Object.assign(this, state, {
        gameMode: mode,
        aiDifficulty: this.aiDifficulty,
        gameStatus: 'playing' as GameStatus,
      });
    },

    setGameMode(mode: GameMode) {
      this.gameMode = mode;
    },

    setAiDifficulty(difficulty: Difficulty) {
      this.aiDifficulty = difficulty;
    },

    resetGame() {
      this.startGame(this.gameMode);
    },

    playMove(x: number, y: number) {
      if (this.gameStatus === 'finished') {
        throw new Error('Game is already finished');
      }

      if (this.gameStatus === 'ready') {
        this.gameStatus = 'playing';
      }

      this.board = placeStone(this.board, x, y, this.currentPlayer);

      const move: Move = {
        x,
        y,
        player: this.currentPlayer,
        timestamp: new Date().toISOString(),
      };

      this.moveHistory.push(move);
      this.lastMove = { x, y };

      const result = getWinner(this.board, x, y);

      if (result) {
        this.winner = result.winner;
        this.winningLine = result.line;
        this.gameStatus = 'finished';
        return;
      }

      this.winner = null;
      this.winningLine = [];
      this.currentPlayer = getNextPlayer(this.currentPlayer);
    },

    undoMove() {
      const undoCount = this.gameMode === 'pve' ? Math.min(2, this.moveHistory.length) : 1;

      if (undoCount === 0) {
        return;
      }

      const removedMoves = this.moveHistory.splice(this.moveHistory.length - undoCount, undoCount);
      const lastRemovedMove = removedMoves[0];

      this.board = rebuildBoard(this.moveHistory);
      this.lastMove =
        this.moveHistory.length > 0
          ? {
              x: this.moveHistory[this.moveHistory.length - 1].x,
              y: this.moveHistory[this.moveHistory.length - 1].y,
            }
          : null;
      this.currentPlayer = lastRemovedMove.player;
      this.winner = null;
      this.winningLine = [];
      this.gameStatus = this.moveHistory.length === 0 ? 'ready' : 'playing';
    },
  },
});
