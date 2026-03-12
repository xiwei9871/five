import type { Board, Player, Point } from '../types/game';
import { placeStone } from './board';
import { getWinner } from './rules';

const BOARD_CENTER = 7;
const DEFAULT_CANDIDATE_RADIUS = 1;
const MEDIUM_CANDIDATE_RADIUS = 1;
const HARD_CANDIDATE_RADIUS = 2;
const WIN_SCORE = 1_000_000;
const BLOCK_SCORE = 700_000;
const OPEN_FOUR_SCORE = 120_000;
const BROKEN_FOUR_SCORE = 45_000;
const OPEN_THREE_SCORE = 12_000;
const BROKEN_THREE_SCORE = 3_500;
const OPEN_TWO_SCORE = 900;
const BROKEN_TWO_SCORE = 250;
const DOUBLE_OPEN_THREE_BONUS = 18_000;
const FOUR_THREE_BONUS = 24_000;
const LOCAL_DENSITY_WEIGHT = 18;
const CENTER_WEIGHT = 20;
const MEDIUM_CANDIDATE_LIMIT = 10;
const HARD_CANDIDATE_LIMIT = 20;
const MEDIUM_TIME_BUDGET_MS = 80;
const HARD_TIME_BUDGET_MS = 500;
const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
] as const;

type SearchConfig = {
  maxDepth: number;
  candidateLimit: number;
  candidateRadius: number;
  useAlphaBeta: boolean;
  threatWeight: number;
  timeBudgetMs: number;
  useVcf: boolean;
};

type PatternSummary = {
  score: number;
  openFour: number;
  brokenFour: number;
  openThree: number;
  brokenThree: number;
  openTwo: number;
  brokenTwo: number;
};

type TTEntry = {
  depth: number;
  score: number;
  bound: 'exact' | 'lower' | 'upper';
};

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

export function getCandidateMoves(board: Board, radius = DEFAULT_CANDIDATE_RADIUS): Point[] {
  if (isBoardEmpty(board)) {
    return [{ x: BOARD_CENTER, y: BOARD_CENTER }];
  }

  const candidates = new Map<string, Point>();

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === null) {
        continue;
      }

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
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

function findImmediateMove(board: Board, player: Player, radius = DEFAULT_CANDIDATE_RADIUS): Point | null {
  for (const move of getCandidateMoves(board, radius)) {
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

function getCell(board: Board, x: number, y: number, player: Player) {
  const value = board[y]?.[x];

  if (value === undefined) {
    return 'B';
  }

  if (value === null) {
    return '.';
  }

  return value === player ? 'X' : 'B';
}

function getDirectionLine(board: Board, move: Point, player: Player, deltaX: number, deltaY: number) {
  let line = '';

  for (let step = -4; step <= 4; step += 1) {
    if (step === 0) {
      line += 'X';
      continue;
    }

    line += getCell(board, move.x + deltaX * step, move.y + deltaY * step, player);
  }

  return line;
}

function countPattern(line: string, pattern: RegExp) {
  return [...line.matchAll(pattern)].length;
}

function getLocalDensity(board: Board, move: Point) {
  let density = 0;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }

      const cell = board[move.y + offsetY]?.[move.x + offsetX];

      if (cell !== null && cell !== undefined) {
        density += 1;
      }
    }
  }

  return density;
}

function getCenterPreference(move: Point) {
  return CENTER_WEIGHT - (Math.abs(move.x - BOARD_CENTER) + Math.abs(move.y - BOARD_CENTER));
}

function getPatternSummary(board: Board, move: Point, player: Player): PatternSummary {
  const nextBoard = placeStone(board, move.x, move.y, player);
  const summary: PatternSummary = {
    score: 0,
    openFour: 0,
    brokenFour: 0,
    openThree: 0,
    brokenThree: 0,
    openTwo: 0,
    brokenTwo: 0,
  };

  for (const direction of DIRECTIONS) {
    const line = getDirectionLine(nextBoard, move, player, direction.x, direction.y);

    summary.openFour += countPattern(line, /(?=(\.XXXX\.))/g);
    summary.brokenFour += countPattern(line, /(?=(\.XXX\.X|\.XX\.XX|\.X\.XXX|X\.XXX\.|XX\.XX\.|XXX\.X\.))/g);
    summary.openThree += countPattern(line, /(?=(\.XXX\.|\.XX\.X\.|\.X\.XX\.))/g);
    summary.brokenThree += countPattern(line, /(?=(BXXX\.|\.XXXB|BXX\.X\.|\.X\.XXB|BX\.XX\.|\.XX\.XB))/g);
    summary.openTwo += countPattern(line, /(?=(\.XX\.|\.X\.X\.))/g);
    summary.brokenTwo += countPattern(line, /(?=(BXX\.|\.XXB|BX\.X\.|\.X\.XB))/g);
  }

  summary.score =
    summary.openFour * OPEN_FOUR_SCORE +
    summary.brokenFour * BROKEN_FOUR_SCORE +
    summary.openThree * OPEN_THREE_SCORE +
    summary.brokenThree * BROKEN_THREE_SCORE +
    summary.openTwo * OPEN_TWO_SCORE +
    summary.brokenTwo * BROKEN_TWO_SCORE;

  if (summary.openThree >= 2) {
    summary.score += DOUBLE_OPEN_THREE_BONUS;
  }

  if ((summary.openFour + summary.brokenFour) > 0 && summary.openThree > 0) {
    summary.score += FOUR_THREE_BONUS;
  }

  return summary;
}

function isForcingThreat(summary: PatternSummary) {
  return summary.openFour > 0 || summary.brokenFour > 0 || summary.openThree > 0;
}

function getMoveScore(board: Board, move: Point, player: Player, threatWeight: number) {
  if (isImmediateWinningMove(board, move, player)) {
    return WIN_SCORE;
  }

  if (isImmediateWinningMove(board, move, getOpponent(player))) {
    return BLOCK_SCORE;
  }

  const attack = getPatternSummary(board, move, player);
  const defense = getPatternSummary(board, move, getOpponent(player));
  const localDensity = getLocalDensity(board, move) * LOCAL_DENSITY_WEIGHT;

  return (
    attack.score +
    defense.score * threatWeight +
    localDensity +
    getCenterPreference(move)
  );
}

export function scoreMove(board: Board, move: Point, player: Player): number {
  return getMoveScore(board, move, player, 0.95);
}

function getScoredCandidateMoves(
  board: Board,
  player: Player,
  config: Pick<SearchConfig, 'candidateLimit' | 'candidateRadius' | 'threatWeight'>,
) {
  return getCandidateMoves(board, config.candidateRadius)
    .map((move) => ({
      move,
      score: getMoveScore(board, move, player, config.threatWeight),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return comparePoints(left.move, right.move);
    })
    .slice(0, config.candidateLimit);
}

function evaluateBoard(board: Board, player: Player, config: Pick<SearchConfig, 'candidateRadius' | 'threatWeight'>) {
  const playerBest = getScoredCandidateMoves(board, player, {
    candidateLimit: 2,
    candidateRadius: config.candidateRadius,
    threatWeight: config.threatWeight,
  })[0]?.score ?? 0;
  const opponentBest = getScoredCandidateMoves(board, getOpponent(player), {
    candidateLimit: 2,
    candidateRadius: config.candidateRadius,
    threatWeight: config.threatWeight,
  })[0]?.score ?? 0;

  return playerBest - opponentBest;
}

function buildZobrist(boardSize: number) {
  const table: number[][][] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => [0, 0]),
  );

  let seed = 0x9e3779b9;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return (value ^ (value >>> 14)) >>> 0;
  };

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      table[y][x][0] = next();
      table[y][x][1] = next();
    }
  }

  return table;
}

const zobristCache = new Map<number, number[][][]>();

function getBoardHash(board: Board): number {
  const boardSize = board.length;
  let table = zobristCache.get(boardSize);

  if (!table) {
    table = buildZobrist(boardSize);
    zobristCache.set(boardSize, table);
  }

  let hash = 0;

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      const cell = board[y][x];
      if (cell === 'black') {
        hash ^= table[y][x][0];
      } else if (cell === 'white') {
        hash ^= table[y][x][1];
      }
    }
  }

  return hash >>> 0;
}

function getImmediateWins(board: Board, player: Player, radius: number): Point[] {
  const wins: Point[] = [];

  for (const move of getCandidateMoves(board, radius)) {
    if (isImmediateWinningMove(board, move, player)) {
      wins.push(move);
    }
  }

  return wins;
}

function getDefensiveResponses(board: Board, defender: Player, radius: number): Point[] {
  const responses = new Map<string, Point>();

  const defenderWin = findImmediateMove(board, defender, radius);
  if (defenderWin) {
    responses.set(`${defenderWin.x},${defenderWin.y}`, defenderWin);
    return [...responses.values()];
  }

  const attacker = getOpponent(defender);
  for (const winningMove of getImmediateWins(board, attacker, radius)) {
    responses.set(`${winningMove.x},${winningMove.y}`, winningMove);
  }

  if (responses.size > 0) {
    return [...responses.values()].sort(comparePoints);
  }

  const fallback = getScoredCandidateMoves(board, defender, {
    candidateLimit: 2,
    candidateRadius: radius,
    threatWeight: 1.0,
  });

  return fallback.map(({ move }) => move);
}

function findVcfWinningMoveRecursive(board: Board, player: Player, radius: number, depth: number): Point | null {
  if (depth <= 0) {
    return null;
  }

  const attackMoves = getScoredCandidateMoves(board, player, {
    candidateLimit: 10,
    candidateRadius: radius,
    threatWeight: 1.2,
  })
    .map(({ move }) => move)
    .filter((move) => {
      if (isImmediateWinningMove(board, move, player)) {
        return true;
      }

      return isForcingThreat(getPatternSummary(board, move, player));
    });

  for (const move of attackMoves) {
    const nextBoard = placeStone(board, move.x, move.y, player);

    if (getWinner(nextBoard, move.x, move.y)?.winner === player) {
      return move;
    }

    const defender = getOpponent(player);
    const responses = getDefensiveResponses(nextBoard, defender, radius);

    if (responses.length === 0) {
      return move;
    }

    let allResponsesLose = true;
    for (const response of responses) {
      const defendedBoard = placeStone(nextBoard, response.x, response.y, defender);
      const followup = findVcfWinningMoveRecursive(defendedBoard, player, radius, depth - 1);
      if (!followup) {
        allResponsesLose = false;
        break;
      }
    }

    if (allResponsesLose) {
      return move;
    }
  }

  return null;
}

export function findVcfWinningMove(board: Board, player: Player, maxDepth = 6): Point | null {
  const immediate = findImmediateMove(board, player, HARD_CANDIDATE_RADIUS);
  if (immediate) {
    return immediate;
  }

  return findVcfWinningMoveRecursive(board, player, HARD_CANDIDATE_RADIUS, maxDepth);
}

function negamax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  currentPlayer: Player,
  config: SearchConfig,
  deadline: number,
  tt: Map<number, TTEntry>,
): number {
  if (Date.now() >= deadline) {
    return evaluateBoard(board, currentPlayer, config);
  }

  if (depth === 0) {
    return evaluateBoard(board, currentPlayer, config);
  }

  const hash = getBoardHash(board);
  const cached = tt.get(hash);
  const originalAlpha = alpha;

  if (cached && cached.depth >= depth) {
    if (cached.bound === 'exact') {
      return cached.score;
    }
    if (cached.bound === 'lower') {
      alpha = Math.max(alpha, cached.score);
    } else {
      beta = Math.min(beta, cached.score);
    }

    if (alpha >= beta) {
      return cached.score;
    }
  }

  const candidateLimit = Math.max(8, config.candidateLimit - (config.maxDepth - depth));
  const candidates = getScoredCandidateMoves(board, currentPlayer, {
    candidateLimit,
    candidateRadius: config.candidateRadius,
    threatWeight: config.threatWeight,
  });

  if (candidates.length === 0) {
    return evaluateBoard(board, currentPlayer, config);
  }

  let bestScore = Number.NEGATIVE_INFINITY;

  for (const { move } of candidates) {
    const nextBoard = placeStone(board, move.x, move.y, currentPlayer);

    let score: number;
    if (getWinner(nextBoard, move.x, move.y)?.winner === currentPlayer) {
      score = WIN_SCORE - (config.maxDepth - depth);
    } else {
      score = -negamax(
        nextBoard,
        depth - 1,
        -beta,
        -alpha,
        getOpponent(currentPlayer),
        config,
        deadline,
        tt,
      );
    }

    bestScore = Math.max(bestScore, score);
    alpha = Math.max(alpha, score);

    if (config.useAlphaBeta && alpha >= beta) {
      break;
    }
  }

  let bound: TTEntry['bound'] = 'exact';
  if (bestScore <= originalAlpha) {
    bound = 'upper';
  } else if (bestScore >= beta) {
    bound = 'lower';
  }

  tt.set(hash, { depth, score: bestScore, bound });

  return bestScore;
}

function chooseSearchMove(board: Board, aiPlayer: Player, config: SearchConfig): Point {
  const winningMove = findImmediateMove(board, aiPlayer, config.candidateRadius);

  if (winningMove) {
    return winningMove;
  }

  const blockingMove = findImmediateMove(board, getOpponent(aiPlayer), config.candidateRadius);

  if (blockingMove) {
    return blockingMove;
  }

  if (config.useVcf) {
    const vcfMove = findVcfWinningMove(board, aiPlayer, 6);
    if (vcfMove) {
      return vcfMove;
    }
  }

  const deadline = Date.now() + config.timeBudgetMs;
  const tt = new Map<number, TTEntry>();
  let bestMove = getScoredCandidateMoves(board, aiPlayer, {
    candidateLimit: 1,
    candidateRadius: config.candidateRadius,
    threatWeight: config.threatWeight,
  })[0]?.move ?? getCandidateMoves(board, config.candidateRadius)[0];

  for (let depth = 1; depth <= config.maxDepth; depth += 1) {
    if (Date.now() >= deadline) {
      break;
    }

    const candidates = getScoredCandidateMoves(board, aiPlayer, {
      candidateLimit: config.candidateLimit,
      candidateRadius: config.candidateRadius,
      threatWeight: config.threatWeight,
    });

    let bestAtDepth = bestMove;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const { move } of candidates) {
      if (Date.now() >= deadline) {
        break;
      }

      const nextBoard = placeStone(board, move.x, move.y, aiPlayer);
      const score = -negamax(
        nextBoard,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        getOpponent(aiPlayer),
        { ...config, maxDepth: depth },
        deadline,
        tt,
      );

      if (score > bestScore) {
        bestScore = score;
        bestAtDepth = move;
      }
    }

    if (bestAtDepth) {
      bestMove = bestAtDepth;
    }
  }

  return bestMove ?? getEmptyCells(board)[0];
}

export function chooseEasyMove(board: Board, aiPlayer: Player): Point {
  const winningMove = findImmediateMove(board, aiPlayer, DEFAULT_CANDIDATE_RADIUS);

  if (winningMove) {
    return winningMove;
  }

  const blockingMove = findImmediateMove(board, getOpponent(aiPlayer), DEFAULT_CANDIDATE_RADIUS);

  if (blockingMove) {
    return blockingMove;
  }

  return [...getCandidateMoves(board)]
    .sort((left, right) => scoreMove(board, right, aiPlayer) - scoreMove(board, left, aiPlayer))[0]
    ?? getEmptyCells(board)[0];
}

export function chooseMediumMove(board: Board, aiPlayer: Player): Point {
  return chooseSearchMove(board, aiPlayer, {
    maxDepth: 2,
    candidateLimit: MEDIUM_CANDIDATE_LIMIT,
    candidateRadius: MEDIUM_CANDIDATE_RADIUS,
    useAlphaBeta: true,
    threatWeight: 0.95,
    timeBudgetMs: MEDIUM_TIME_BUDGET_MS,
    useVcf: false,
  });
}

export function chooseHardMove(board: Board, aiPlayer: Player): Point {
  return chooseSearchMove(board, aiPlayer, {
    maxDepth: 6,
    candidateLimit: HARD_CANDIDATE_LIMIT,
    candidateRadius: HARD_CANDIDATE_RADIUS,
    useAlphaBeta: true,
    threatWeight: 1.3,
    timeBudgetMs: HARD_TIME_BUDGET_MS,
    useVcf: true,
  });
}
