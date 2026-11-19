const CDX_ENDPOINT = 'https://web.archive.org/cdx/search/cdx';

export interface WaybackProxyResult {
  status: number;
  body: unknown;
}

/**
 * The CDX server does not send Access-Control-Allow-Origin, so the browser
 * cannot read it. This fetches one exact URL and returns the JSON body.
 * `limit=1` is the earliest capture that opened as a normal page, because
 * CDX lists one URL in time order.
 */
export function cdxUpstream(target: string): string {
  const parts = [
    `url=${encodeURIComponent(target)}`,
    'output=json',
    'fl=timestamp,original,statuscode',
    'filter=statuscode:200',
    'limit=1',
  ];
  return `${CDX_ENDPOINT}?${parts.join('&')}`;
}

/** A host, or a host plus a path and query. Not a full URL and not a proxy target. */
export function isWaybackTarget(target: string): boolean {
  if (target.length === 0 || target.length > 2000) {
    return false;
  }
  if (
    /[\s\\]/.test(target) ||
    target.includes('://') ||
    target.startsWith('//') ||
    target.includes('@')
  ) {
    return false;
  }
  const slash = target.indexOf('/');
  const host = slash === -1 ? target : target.slice(0, slash);
  return host.includes('.') && /^[a-z0-9.-]+$/i.test(host);
}

export async function fetchWayback(
  target: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WaybackProxyResult> {
  if (!isWaybackTarget(target)) {
    return { status: 400, body: { error: 'invalid-target' } };
  }
  try {
    const response = await fetchImpl(cdxUpstream(target), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 404) {
      return { status: 200, body: [] };
    }
    if (!response.ok) {
      return { status: 502, body: { error: 'unavailable' } };
    }
    return { status: 200, body: await response.json() };
  } catch {
    return { status: 502, body: { error: 'unavailable' } };
  }
}
