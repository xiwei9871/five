// @vitest-environment node

import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createRapfiHttpHandler, createRapfiService } from './rapfi-service';

function createMockChildProcess(outputLines: string | string[] = '9,9') {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const queuedLines = Array.isArray(outputLines) ? [...outputLines] : [outputLines];
  const stdin = {
    write: vi.fn((chunk: string) => {
      if (chunk.includes('BOARD')) {
        queueMicrotask(() => {
          stdout.emit('data', `${queuedLines.shift() ?? '9,9'}\n`);
        });
      }
    }),
  };
  const childProcess = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: typeof stdin;
    kill: ReturnType<typeof vi.fn>;
  };

  childProcess.stdout = stdout;
  childProcess.stderr = stderr;
  childProcess.stdin = stdin;
  childProcess.kill = vi.fn();

  return childProcess;
}

function createMockRapfiService() {
  return {
    getBestMove: vi.fn(async () => ({ x: 10, y: 11 })),
    getLearningStatus: vi.fn(async () => ({
      available: true,
      hasDatabase: true,
      updatedAt: '2026-03-12T00:00:00.000Z',
    })),
    exportLearningData: vi.fn(async () => new Uint8Array([1, 2, 3])),
    importLearningData: vi.fn(async () => undefined),
    resetLearningData: vi.fn(async () => undefined),
    dispose: vi.fn(),
  };
}

describe('rapfi service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('throws a clear error when the rapfi binary is missing', async () => {
    const service = createRapfiService({
      binaryPath: '/missing/rapfi',
      existsSync: () => false,
      spawn: vi.fn(),
    });

    await expect(
      service.getBestMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).rejects.toThrow('Rapfi binary not found');
  });

  test('returns a parsed move from a mocked rapfi child process', async () => {
    const childProcess = createMockChildProcess('9,9');
    const service = createRapfiService({
      binaryPath: '/tmp/rapfi',
      existsSync: () => true,
      spawn: vi.fn(() => childProcess),
    });

    await expect(
      service.getBestMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).resolves.toEqual({ x: 9, y: 9 });
  });

  test('reuses a persistent rapfi child process across move requests', async () => {
    const spawn = vi.fn(() => createMockChildProcess(['9,9', '8,8']));
    const service = createRapfiService({
      binaryPath: '/tmp/rapfi',
      existsSync: () => true,
      spawn,
    });

    await expect(
      service.getBestMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).resolves.toEqual({ x: 9, y: 9 });

    await expect(
      service.getBestMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).resolves.toEqual({ x: 8, y: 8 });

    expect(spawn).toHaveBeenCalledTimes(1);
  });

  test('tracks rapfi learning database status and supports export import reset', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'rapfi-learning-'));
    const binaryPath = join(tempDir, 'rapfi');
    const databasePath = join(tempDir, 'rapfi.db');
    writeFileSync(binaryPath, 'binary');

    try {
      const service = createRapfiService({
        binaryPath,
        databasePath,
      });

      await expect(service.getLearningStatus()).resolves.toEqual({
        available: true,
        hasDatabase: false,
        updatedAt: null,
      });

      await service.importLearningData(new Uint8Array([1, 2, 3]));
      await expect(service.exportLearningData()).resolves.toEqual(new Uint8Array([1, 2, 3]));
      await expect(service.getLearningStatus()).resolves.toMatchObject({
        available: true,
        hasDatabase: true,
      });

      await service.resetLearningData();
      await expect(service.getLearningStatus()).resolves.toEqual({
        available: true,
        hasDatabase: false,
        updatedAt: null,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('http handler returns a structured response payload', async () => {
    const handler = createRapfiHttpHandler(createMockRapfiService());

    const request = new Request('http://127.0.0.1:8787/api/ai/rapfi-move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    });

    const response = await handler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ move: { x: 10, y: 11 } });
  });

  test('http handler accepts browser preflight requests for the local frontend origin', async () => {
    const handler = createRapfiHttpHandler(createMockRapfiService());

    const request = new Request('http://127.0.0.1:8787/api/ai/rapfi-move', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    const response = await handler(request);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  test('http handler exposes a simple health endpoint', async () => {
    const handler = createRapfiHttpHandler(createMockRapfiService());

    const response = await handler(new Request('http://127.0.0.1:8787/api/ai/health', { method: 'GET' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });

  test('http handler exposes rapfi learning management endpoints', async () => {
    const service = createMockRapfiService();
    const handler = createRapfiHttpHandler(service);

    const statusResponse = await handler(
      new Request('http://127.0.0.1:8787/api/ai/learning/status', { method: 'GET' }),
    );
    const exportResponse = await handler(
      new Request('http://127.0.0.1:8787/api/ai/learning/export', { method: 'GET' }),
    );
    const importResponse = await handler(
      new Request('http://127.0.0.1:8787/api/ai/learning/import', {
        method: 'POST',
        body: new Uint8Array([4, 5, 6]),
      }),
    );
    const resetResponse = await handler(
      new Request('http://127.0.0.1:8787/api/ai/learning/reset', { method: 'POST' }),
    );

    await expect(statusResponse.json()).resolves.toEqual({
      available: true,
      hasDatabase: true,
      updatedAt: '2026-03-12T00:00:00.000Z',
    });
    await expect(exportResponse.arrayBuffer()).resolves.toEqual(new Uint8Array([1, 2, 3]).buffer);
    expect(importResponse.status).toBe(204);
    expect(resetResponse.status).toBe(204);
    expect(service.importLearningData).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]));
    expect(service.resetLearningData).toHaveBeenCalledTimes(1);
  });
});
