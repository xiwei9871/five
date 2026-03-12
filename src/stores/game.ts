import { defineStore } from 'pinia';

import type { Player, Point } from '../types/game';
import { createEmptyBoard, placeStone } from '../utils/board';
import { chooseEasyMove, chooseHardMove, chooseMediumMove } from '../utils/ai';
import { checkRemoteAiHealth, requestRemoteHardMove } from '../utils/remote-ai';
import { getWinner } from '../utils/rules';
import { loadSnapshot, saveSnapshot, type PersistedGameState } from '../utils/storage';

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
    isAiThinking: false,
    aiNotice: null as string | null,
    externalEngineStatus: null as 'connected' | 'disconnected' | null,
  };
}

function toSnapshot(state: ReturnType<typeof createInitialState>): PersistedGameState {
  return {
    board: state.board,
    currentPlayer: state.currentPlayer,
    gameMode: state.gameMode,
    aiDifficulty: state.aiDifficulty,
    gameStatus: state.gameStatus,
    winner: state.winner,
    moveHistory: state.moveHistory,
    lastMove: state.lastMove,
    winningLine: state.winningLine,
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

function getAiPlayer(): Player {
  return 'white';
}

function chooseAiMove(
  board: ReturnType<typeof createInitialState>['board'],
  difficulty: Difficulty,
  aiPlayer: Player,
) {
  switch (difficulty) {
    case 'medium':
      return chooseMediumMove(board, aiPlayer);
    case 'hard':
      return chooseHardMove(board, aiPlayer);
    default:
      return chooseEasyMove(board, aiPlayer);
  }
}

async function chooseAiMoveWithFallback(
  board: ReturnType<typeof createInitialState>['board'],
  difficulty: Difficulty,
  aiPlayer: Player,
) {
  if (difficulty === 'hard') {
    try {
      const move = await requestRemoteHardMove({
        board,
        currentPlayer: aiPlayer,
      });

      return {
        move,
        source: 'remote' as const,
      };
    } catch {
      return {
        move: chooseHardMove(board, aiPlayer),
        source: 'fallback' as const,
      };
    }
  }

  return {
    move: chooseAiMove(board, difficulty, aiPlayer),
    source: 'local' as const,
  };
}

export const useGameStore = defineStore('game', {
  state: createInitialState,

  actions: {
    applyMove(x: number, y: number) {
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
        saveSnapshot(toSnapshot(this.$state));
        return;
      }

      this.winner = null;
      this.winningLine = [];
      this.currentPlayer = getNextPlayer(this.currentPlayer);
      saveSnapshot(toSnapshot(this.$state));
    },

    startGame(mode: GameMode) {
      const state = createInitialState();

      Object.assign(this, state, {
        gameMode: mode,
        aiDifficulty: this.aiDifficulty,
        gameStatus: 'playing' as GameStatus,
        isAiThinking: false,
        aiNotice: null,
        externalEngineStatus: null,
      });
      saveSnapshot(toSnapshot(this.$state));
    },

    setGameMode(mode: GameMode) {
      this.gameMode = mode;
      saveSnapshot(toSnapshot(this.$state));
    },

    setAiDifficulty(difficulty: Difficulty) {
      this.aiDifficulty = difficulty;
      saveSnapshot(toSnapshot(this.$state));
    },

    async refreshExternalEngineStatus() {
      if (this.aiDifficulty !== 'hard') {
        this.externalEngineStatus = null;
        return;
      }

      this.externalEngineStatus = (await checkRemoteAiHealth()) ? 'connected' : 'disconnected';
    },

    resetGame() {
      this.startGame(this.gameMode);
    },

    hydrate() {
      try {
        const snapshot = loadSnapshot();

        if (!snapshot) {
          return;
        }

        Object.assign(this, snapshot, {
          isAiThinking: false,
          aiNotice: null,
          externalEngineStatus: null,
        });
      } catch {
        Object.assign(this, createInitialState());
      }
    },

    async playMove(x: number, y: number) {
      if (this.gameStatus === 'finished') {
        throw new Error('Game is already finished');
      }

      if (this.gameStatus === 'ready') {
        this.gameStatus = 'playing';
      }

      this.aiNotice = null;
      this.applyMove(x, y);

      if (this.gameMode === 'pve' && this.winner === null && this.currentPlayer === getAiPlayer()) {
        this.isAiThinking = true;
        const aiResult = await chooseAiMoveWithFallback(this.board, this.aiDifficulty, getAiPlayer());
        this.isAiThinking = false;
        this.aiNotice = aiResult.source === 'fallback' ? '已回退到本地 AI' : null;
        this.externalEngineStatus =
          this.aiDifficulty === 'hard'
            ? aiResult.source === 'fallback'
              ? 'disconnected'
              : 'connected'
            : null;
        this.applyMove(aiResult.move.x, aiResult.move.y);
      }
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
      this.isAiThinking = false;
      this.aiNotice = null;
      this.externalEngineStatus = null;
      this.gameStatus = this.moveHistory.length === 0 ? 'ready' : 'playing';
      saveSnapshot(toSnapshot(this.$state));
    },
  },
});
