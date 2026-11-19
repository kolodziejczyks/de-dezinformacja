import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRequest } from './api.ts';
import { CertListCache, type CertListLogger } from './cert-cache.ts';
import { cdxUpstream, fetchWayback, isWaybackTarget } from './wayback.ts';

const silent: CertListLogger = { info() {}, error() {} };
const domainRow = [
  ['timestamp', 'original', 'statuscode'],
  ['20010923151602', 'http://www.tvn24.pl:80/', '200'],
];

describe('isWaybackTarget', () => {
  it('accepts a host or a host with a path and rejects a full URL', () => {
    expect(isWaybackTarget('tvn24.pl/')).toBe(true);
    expect(isWaybackTarget('sport.tvn24.pl/polska?x=1')).toBe(true);
    expect(isWaybackTarget('https://tvn24.pl/')).toBe(false);
    expect(isWaybackTarget('//tvn24.pl/')).toBe(false);
    expect(isWaybackTarget('user@tvn24.pl')).toBe(false);
    expect(isWaybackTarget('localhost')).toBe(false);
  });
});

describe('cdxUpstream', () => {
  it('asks for the earliest successful capture of one URL', () => {
    expect(cdxUpstream('tvn24.pl/')).toBe(
      'https://web.archive.org/cdx/search/cdx?url=tvn24.pl%2F&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=1',
    );
  });
});

describe('fetchWayback', () => {
  it('returns the CDX body, an empty index for 404, and 502 when the archive fails', async () => {
    const ok = await fetchWayback(
      'tvn24.pl/',
      vi.fn(async () => new Response(JSON.stringify(domainRow), { status: 200 })),
    );
    expect(ok).toEqual({ status: 200, body: domainRow });

    const missing = await fetchWayback(
      'fresh.example/',
      vi.fn(async () => new Response('missing', { status: 404 })),
    );
    expect(missing).toEqual({ status: 200, body: [] });

    const down = await fetchWayback(
      'tvn24.pl/',
      vi.fn(async () => new Response('offline', { status: 503 })),
    );
    expect(down.status).toBe(502);

    const bad = await fetchWayback('https://tvn24.pl/', vi.fn());
    expect(bad.status).toBe(400);
  });
});

describe('GET /api/wayback', () => {
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

  it('forwards the CDX JSON for the target and nothing else', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(cdxUpstream('tvn24.pl/'));
      return new Response(JSON.stringify(domainRow), { status: 200 });
    });
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl: async () => new Response('evil.example\n', { status: 200 }),
      logger: silent,
    });
    server = createServer((req, res) => {
      void handleRequest(req, res, { cache, fetchImpl });
    });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()));
    const { port } = server.address() as AddressInfo;

    const hit = await fetch(
      `http://127.0.0.1:${port}/api/wayback?target=${encodeURIComponent('tvn24.pl/')}`,
    );
    expect(hit.status).toBe(200);
    expect(await hit.json()).toEqual(domainRow);
    expect(hit.headers.get('access-control-allow-origin')).toBe('*');

    const rejected = await fetch(
      `http://127.0.0.1:${port}/api/wayback?target=https://evil.example/`,
    );
    expect(rejected.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
