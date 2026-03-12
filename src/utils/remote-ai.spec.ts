import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  checkRemoteAiHealth,
  exportRemoteLearningData,
  fetchRemoteLearningStatus,
  importRemoteLearningData,
  requestRemoteHardMove,
  resetRemoteLearningData,
} from './remote-ai';

describe('remote hard ai client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('posts the board state to the local rapfi service and returns a move', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ move: { x: 9, y: 9 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const move = await requestRemoteHardMove({
      board: Array.from({ length: 15 }, () => Array(15).fill(null)),
      currentPlayer: 'white',
    });

    expect(move).toEqual({ x: 9, y: 9 });
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/api/ai/rapfi-move',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('throws a clear error when the local rapfi service returns a failure response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'rapfi missing' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      requestRemoteHardMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).rejects.toThrow('rapfi missing');
  });

  test('rejects malformed move payloads from the local rapfi service', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ move: { row: 9, col: 9 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      requestRemoteHardMove({
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        currentPlayer: 'white',
      }),
    ).rejects.toThrow('Invalid Rapfi move payload');
  });

  test('returns true when the local rapfi health endpoint reports ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(checkRemoteAiHealth()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/health', {
      method: 'GET',
    });
  });

  test('returns false when the local rapfi health endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );

    await expect(checkRemoteAiHealth()).resolves.toBe(false);
  });

  test('fetches the remote learning status from the local rapfi service', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ available: true, hasDatabase: true, updatedAt: '2026-03-12T00:00:00.000Z' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(fetchRemoteLearningStatus()).resolves.toEqual({
      available: true,
      hasDatabase: true,
      updatedAt: '2026-03-12T00:00:00.000Z',
    });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/learning/status', {
      method: 'GET',
    });
  });

  test('exports imports and resets remote learning data through the local rapfi service', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith('/export')) {
          return new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        }

        if (String(input).endsWith('/import')) {
          return new Response(null, { status: 204 });
        }

        if (String(input).endsWith('/reset')) {
          return new Response(null, { status: 204 });
        }

        return new Response(JSON.stringify({ error: 'unexpected endpoint' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    await expect(exportRemoteLearningData()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(importRemoteLearningData(new Uint8Array([4, 5, 6]))).resolves.toBeUndefined();
    await expect(resetRemoteLearningData()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/learning/import', {
      method: 'POST',
      body: new Uint8Array([4, 5, 6]),
    });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8787/api/ai/learning/reset', {
      method: 'POST',
    });
  });
});
