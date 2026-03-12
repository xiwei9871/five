import { existsSync } from 'node:fs';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';

import type { Board, Player, Point } from '../src/types/game.ts';

type RapfiRequest = {
  board: Board;
  currentPlayer: Player;
};

type SpawnResult = ReturnType<typeof spawn>;

type RapfiServiceOptions = {
  binaryPath: string;
  databasePath?: string;
  existsSync?: typeof existsSync;
  spawn?: typeof spawn;
};

type RapfiLearningStatus = {
  available: boolean;
  hasDatabase: boolean;
  updatedAt: string | null;
};

type RapfiService = {
  getBestMove(request: RapfiRequest): Promise<Point>;
  getLearningStatus(): Promise<RapfiLearningStatus>;
  exportLearningData(): Promise<Uint8Array>;
  importLearningData(data: Uint8Array): Promise<void>;
  resetLearningData(): Promise<void>;
  dispose(): void;
};

function isMissingFileError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

const ALLOWED_ORIGIN = 'http://localhost:5173';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      childProcess.off('exit', handleExit);
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

    const handleExit = () => {
      cleanup();
      reject(new Error('Rapfi process exited unexpectedly'));
    };

    childProcess.stdout?.on('data', handleStdout);
    childProcess.stderr?.on('data', handleStderr);
    childProcess.on('exit', handleExit);
  });
}

export function createRapfiService({
  binaryPath,
  databasePath = join(dirname(binaryPath), 'rapfi.db'),
  existsSync: checkExists = existsSync,
  spawn: spawnProcess = spawn,
}: RapfiServiceOptions): RapfiService {
  let childProcess: SpawnResult | null = null;
  let requestQueue = Promise.resolve();

  function stopProcess() {
    const process = childProcess;
    childProcess = null;
    process?.kill();
  }

  function getOrStartProcess() {
    if (childProcess) {
      return childProcess;
    }

    const process = spawnProcess(binaryPath, [], {
      cwd: dirname(binaryPath),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    process.on('exit', () => {
      if (childProcess === process) {
        childProcess = null;
      }
    });
    childProcess = process;

    return process;
  }

  async function requestBestMove({ board }: RapfiRequest) {
    const process = getOrStartProcess();
    const responsePromise = wireResponseListener(process);

    process.stdin?.write('START 15\n');
    process.stdin?.write('INFO timeout_turn 1000\n');
    process.stdin?.write('BOARD\n');

    for (const command of toBoardCommands(board)) {
      process.stdin?.write(`${command}\n`);
    }

    process.stdin?.write('DONE\n');

    return responsePromise;
  }

  function runExclusive<T>(operation: () => Promise<T>) {
    const task = requestQueue.then(operation);
    requestQueue = task.then(
      () => undefined,
      () => undefined,
    );

    return task;
  }

  async function readLearningStatus() {
    try {
      const stats = await stat(databasePath);
      return {
        available: checkExists(binaryPath),
        hasDatabase: true,
        updatedAt: stats.mtime.toISOString(),
      };
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }

      return {
        available: checkExists(binaryPath),
        hasDatabase: false,
        updatedAt: null,
      };
    }
  }

  return {
    async getBestMove(request: RapfiRequest) {
      return runExclusive(async () => {
        if (!checkExists(binaryPath)) {
          throw new Error('Rapfi binary not found');
        }

        try {
          return await requestBestMove(request);
        } catch {
          stopProcess();
          return requestBestMove(request);
        }
      });
    },

    getLearningStatus() {
      return runExclusive(async () => readLearningStatus());
    },

    exportLearningData() {
      return runExclusive(async () => {
        stopProcess();

        if (!checkExists(databasePath)) {
          throw new Error('Rapfi learning database not found');
        }

        return new Uint8Array(await readFile(databasePath));
      });
    },

    importLearningData(data: Uint8Array) {
      return runExclusive(async () => {
        if (data.byteLength === 0) {
          throw new Error('Rapfi learning database is empty');
        }

        stopProcess();
        await writeFile(databasePath, data);
      });
    },

    resetLearningData() {
      return runExclusive(async () => {
        stopProcess();
        await rm(databasePath, { force: true });
      });
    },

    dispose() {
      stopProcess();
    },
  };
}

export function createRapfiHttpHandler(service: Pick<
  RapfiService,
  'getBestMove' | 'getLearningStatus' | 'exportLearningData' | 'importLearningData' | 'resetLearningData'
>) {
  return async function handle(request: Request) {
    const pathname = new URL(request.url).pathname;

    if (request.method === 'GET' && pathname === '/api/ai/health') {
      return Response.json({ ok: true }, { headers: getCorsHeaders() });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    if (request.method === 'GET' && pathname === '/api/ai/learning/status') {
      return Response.json(await service.getLearningStatus(), { headers: getCorsHeaders() });
    }

    if (request.method === 'GET' && pathname === '/api/ai/learning/export') {
      const database = await service.exportLearningData();

      return new Response(database, {
        status: 200,
        headers: {
          ...getCorsHeaders(),
          'Content-Disposition': 'attachment; filename="rapfi.db"',
          'Content-Type': 'application/octet-stream',
        },
      });
    }

    if (request.method === 'POST' && pathname === '/api/ai/learning/import') {
      await service.importLearningData(new Uint8Array(await request.arrayBuffer()));

      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    if (request.method === 'POST' && pathname === '/api/ai/learning/reset') {
      await service.resetLearningData();

      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    if (pathname !== '/api/ai/rapfi-move') {
      return Response.json({ error: 'Not found' }, { status: 404, headers: getCorsHeaders() });
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
