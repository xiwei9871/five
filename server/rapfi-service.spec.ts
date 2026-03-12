// @vitest-environment node

import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createRapfiHttpHandler, createRapfiService } from './rapfi-service';

function createMockChildProcess(outputLine = '9,9') {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = {
    write: vi.fn((chunk: string) => {
      if (chunk.includes('BOARD')) {
        queueMicrotask(() => {
          stdout.emit('data', `${outputLine}\n`);
        });
      }
    }),
  };

  return {
    stdout,
    stderr,
    stdin,
    kill: vi.fn(),
    on: vi.fn(),
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

  test('http handler returns a structured response payload', async () => {
    const handler = createRapfiHttpHandler({
      getBestMove: vi.fn(async () => ({ x: 10, y: 11 })),
    });

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
    const handler = createRapfiHttpHandler({
      getBestMove: vi.fn(async () => ({ x: 10, y: 11 })),
    });

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
    const handler = createRapfiHttpHandler({
      getBestMove: vi.fn(async () => ({ x: 10, y: 11 })),
    });

    const response = await handler(new Request('http://127.0.0.1:8787/api/ai/health', { method: 'GET' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
  });
});
