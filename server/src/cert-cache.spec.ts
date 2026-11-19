import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertListCache, type CertListLogger } from './cert-cache.ts';

const silent: CertListLogger = {
  info() {},
  error() {},
};

function feedResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(status === 304 ? null : body, { status, headers });
}

describe('CertListCache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the list and reuses it when the feed replies 304', async () => {
    const calls: Array<Headers | undefined> = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
      calls.push(headers);
      if (calls.length === 1) {
        return feedResponse('evil.example\nsafe.test\n', 200, {
          etag: '"v1"',
          'last-modified': 'Thu, 01 Jan 2026 00:00:00 GMT',
        });
      }
      return feedResponse('', 304, { etag: '"v1"' });
    };

    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl,
      logger: silent,
    });

    const first = await cache.lookup('sub.evil.example');
    expect(first).toMatchObject({
      listed: true,
      domain: 'sub.evil.example',
      matches: ['evil.example'],
      listSize: 2,
    });
    expect(calls[0]?.get('If-None-Match')).toBeNull();

    await cache.reload();
    expect(calls[1]?.get('If-None-Match')).toBe('"v1"');
    expect(calls[1]?.get('If-Modified-Since')).toBe('Thu, 01 Jan 2026 00:00:00 GMT');

    const second = await cache.lookup('safe.test');
    expect(second).toMatchObject({ listed: true, matches: ['safe.test'], listSize: 2 });
  });

  it('replaces the list when the feed changes and keeps the old copy when a refresh fails', async () => {
    let mode: 'first' | 'next' | 'fail' = 'first';
    const fetchImpl: typeof fetch = async () => {
      if (mode === 'first') {
        return feedResponse('old.example\n');
      }
      if (mode === 'next') {
        return feedResponse('new.example\n');
      }
      return feedResponse('nope', 500);
    };
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl,
      logger: silent,
    });

    expect(await cache.lookup('old.example')).toMatchObject({ listed: true });
    mode = 'next';
    await cache.reload();
    expect(await cache.lookup('old.example')).toMatchObject({ listed: false, matches: [] });
    expect(await cache.lookup('new.example')).toMatchObject({ listed: true });

    mode = 'fail';
    await cache.reload();
    expect(await cache.lookup('new.example')).toMatchObject({ listed: true });
  });

  it('reports the list as unavailable when the first download fails', async () => {
    const fetchImpl: typeof fetch = async () => feedResponse('down', 503);
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl,
      logger: silent,
    });

    expect(await cache.lookup('evil.example')).toEqual({ error: 'list-unavailable' });
    expect(await cache.lookup('not a domain')).toBeNull();
  });

  it('shares one download between overlapping lookups', async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      await gate;
      return feedResponse('evil.example\n');
    };
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      fetchImpl,
      logger: silent,
    });

    const first = cache.lookup('evil.example');
    const second = cache.lookup('evil.example');
    expect(calls).toBe(1);
    release?.();
    expect(await first).toMatchObject({ listed: true });
    expect(await second).toMatchObject({ listed: true });
    expect(calls).toBe(1);
  });

  it('refreshes again when the interval elapses', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return feedResponse('evil.example\n');
    };
    const cache = new CertListCache({
      feedUrl: 'https://feed.test/domains.txt',
      refreshMs: 1_000,
      fetchImpl,
      logger: silent,
    });

    cache.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(calls).toBe(2);
    cache.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(calls).toBe(2);
  });
});
