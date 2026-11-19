import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CertListCache } from './cert-cache.ts';
import { serveStatic } from './static-files.ts';
import { fetchWayback } from './wayback.ts';

export interface ApiDeps {
  cache: CertListCache;
  staticDir?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: ApiDeps,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/cert') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'method-not-allowed' });
      return;
    }
    const domain = url.searchParams.get('domain') ?? '';
    const result = await deps.cache.lookup(domain);
    if (result === null) {
      sendJson(res, 400, { error: 'invalid-domain' });
      return;
    }
    if ('error' in result) {
      sendJson(res, 503, result);
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (url.pathname === '/api/wayback') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'method-not-allowed' });
      return;
    }
    const target = url.searchParams.get('target') ?? '';
    const result = await fetchWayback(target, deps.fetchImpl);
    sendJson(res, result.status, result.body);
    return;
  }

  if (req.method === 'GET' && deps.staticDir) {
    if (serveStatic(deps.staticDir, url.pathname, res)) {
      return;
    }
  }

  sendJson(res, 404, { error: 'not-found' });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}
