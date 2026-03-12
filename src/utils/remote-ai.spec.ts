import { afterEach, describe, expect, test, vi } from 'vitest';

import { checkRemoteAiHealth, requestRemoteHardMove } from './remote-ai';

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
});
