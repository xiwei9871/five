import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

import type { Board, Player, Point } from '../src/types/game.ts';

type RapfiRequest = {
  board: Board;
  currentPlayer: Player;
};

type SpawnResult = ReturnType<typeof spawn>;

type RapfiServiceOptions = {
  binaryPath: string;
  existsSync?: typeof existsSync;
  spawn?: typeof spawn;
};

type RapfiService = {
  getBestMove(request: RapfiRequest): Promise<Point>;
};

const ALLOWED_ORIGIN = 'http://localhost:5173';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function toBoardCommands(board: Board) {
  const commands: string[] = [];

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      const cell = board[y][x];

      if (cell === null) {
        continue;
      }

      commands.push(`${x},${y},${cell === 'black' ? 1 : 2}`);
    }
  }

  return commands;
}

function parseMove(line: string): Point {
  const match = line.trim().match(/^(\d+)\s*,\s*(\d+)$/);

  if (!match) {
    throw new Error(`Invalid Rapfi move response: ${line.trim()}`);
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

function wireResponseListener(childProcess: SpawnResult) {
  return new Promise<Point>((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      childProcess.stdout?.off('data', handleStdout);
      childProcess.stderr?.off('data', handleStderr);
    };

    const handleStdout = (chunk: Buffer | string) => {
      buffer += String(chunk);

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        try {
          const move = parseMove(trimmed);
          cleanup();
          resolve(move);
          return;
        } catch {
          if (trimmed === 'OK' || trimmed.startsWith('MESSAGE')) {
            continue;
          }

          cleanup();
          reject(new Error(`Invalid Rapfi move response: ${trimmed}`));
          return;
        }
      }
    };

    const handleStderr = (chunk: Buffer | string) => {
      cleanup();
      reject(new Error(String(chunk).trim() || 'Rapfi process error'));
    };

    childProcess.stdout?.on('data', handleStdout);
    childProcess.stderr?.on('data', handleStderr);
  });
}

export function createRapfiService({
  binaryPath,
  existsSync: checkExists = existsSync,
  spawn: spawnProcess = spawn,
}: RapfiServiceOptions): RapfiService {
  return {
    async getBestMove({ board, currentPlayer }: RapfiRequest) {
      if (!checkExists(binaryPath)) {
        throw new Error('Rapfi binary not found');
      }

      const childProcess = spawnProcess(binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const responsePromise = wireResponseListener(childProcess);
      childProcess.stdin?.write('START 15\n');
      childProcess.stdin?.write('INFO timeout_turn 1000\n');
      childProcess.stdin?.write('BOARD\n');

      for (const command of toBoardCommands(board)) {
        childProcess.stdin?.write(`${command}\n`);
      }

      childProcess.stdin?.write('DONE\n');

      const move = await responsePromise;
      childProcess.kill();
      return move;
    },
  };
}

export function createRapfiHttpHandler(service: Pick<RapfiService, 'getBestMove'>) {
  return async function handle(request: Request) {
    if (request.method === 'GET' && new URL(request.url).pathname === '/api/ai/health') {
      return Response.json({ ok: true }, { headers: getCorsHeaders() });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: getCorsHeaders() });
    }

    try {
      const payload = (await request.json()) as Partial<RapfiRequest>;

      if (!Array.isArray(payload.board) || (payload.currentPlayer !== 'black' && payload.currentPlayer !== 'white')) {
        return Response.json({ error: 'Invalid Rapfi request payload' }, { status: 400, headers: getCorsHeaders() });
      }

      const move = await service.getBestMove({
        board: payload.board as Board,
        currentPlayer: payload.currentPlayer,
      });

      return Response.json({ move }, { headers: getCorsHeaders() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rapfi service failed';
      return Response.json({ error: message }, { status: 503, headers: getCorsHeaders() });
    }
  };
}
