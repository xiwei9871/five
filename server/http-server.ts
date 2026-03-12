import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createRapfiHttpHandler, createRapfiService } from './rapfi-service.ts';

const PORT = 8787;

export function getNodeResponseHeaders(response: Response) {
  return Object.fromEntries(response.headers.entries());
}

export function createRapfiNodeServer() {
  const service = createRapfiService({
    binaryPath: join(process.cwd(), 'vendor', 'rapfi', 'pbrain-rapfi-macos-apple-silicon'),
  });
  const handler = createRapfiHttpHandler(service);

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);

    if (url.pathname !== '/api/ai/rapfi-move' && url.pathname !== '/api/ai/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    req.on('end', async () => {
      const request = new Request(`http://127.0.0.1:${PORT}${url.pathname}`, {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
      });

      const response = await handler(request);
      const body = await response.text();

      res.writeHead(response.status, getNodeResponseHeaders(response));
      res.end(body);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createRapfiNodeServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Rapfi AI server listening on http://127.0.0.1:${PORT}`);
  });
}
