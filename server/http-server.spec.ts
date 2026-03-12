// @vitest-environment node

import { describe, expect, test } from 'vitest';

import { getNodeResponseHeaders } from './http-server.ts';

describe('http server header forwarding', () => {
  test('preserves cors headers from the fetch-style handler response', () => {
    const response = new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

    expect(getNodeResponseHeaders(response)).toMatchObject({
      'access-control-allow-origin': 'http://localhost:5173',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    });
  });
});
