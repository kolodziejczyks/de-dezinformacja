import { createServer, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { handleRequest } from './api.ts';
import { CertListCache, type CertListLogger } from './cert-cache.ts';

const silent: CertListLogger = { info() {}, error() {} };

describe('GET /api/cert', () => {
  let server: Server | null = null;

  afterEach(async () => {
    if (!server) {
      return;
    }
    const closing = server;
    server = null;
    await new Promise<void>((resolve, reject) => {
      closing.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('returns a parent match and rejects a bad query', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('evil.example\n', {
        status: 200,
        headers: { etag: '"v1"' },
      });
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl,
      logger: silent,
    });
    const base = await listen(cache);

    const hit = await fetch(`${base}/api/cert?domain=login.evil.example`);
    expect(hit.status).toBe(200);
    const body = (await hit.json()) as { listed: boolean; matches: string[]; checked: string[] };
    expect(body.listed).toBe(true);
    expect(body.matches).toEqual(['evil.example']);
    expect(body.checked).toEqual(['login.evil.example', 'evil.example']);

    const miss = await fetch(`${base}/api/cert?domain=tvn24.pl`);
    expect(miss.status).toBe(200);
    expect(await miss.json()).toMatchObject({ listed: false, matches: [] });

    const bad = await fetch(`${base}/api/cert?domain=not%20a%20domain`);
    expect(bad.status).toBe(400);

    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
  });

  it('does not serve a file outside the static folder', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cert-static-'));
    writeFileSync(join(root, 'index.html'), '<p>app</p>');
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl: async () => new Response('evil.example\n', { status: 200 }),
      logger: silent,
    });
    const base = await listen(cache, root);

    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('app');

    const escaped = await fetch(`${base}/..%2f..%2fetc/passwd`);
    expect(escaped.status).toBe(400);
    const body = await escaped.text();
    expect(body).not.toContain('root:');
  });

  async function listen(cache: CertListCache, staticDir?: string): Promise<string> {
    server = createServer((req, res) => {
      void handleRequest(req, res, { cache, staticDir });
    });
    await new Promise<void>((resolve) => {
      server?.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }
});
