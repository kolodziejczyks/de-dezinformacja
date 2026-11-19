export interface CertResult {
  domain: string;
  listed: boolean;
  matches: string[];
  listUpdatedAt: string | null;
}

export function certApiUrl(domain: string): string {
  return `/api/cert?domain=${encodeURIComponent(domain)}`;
}

export function parseCertResponse(body: unknown, fallbackDomain: string): CertResult | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record['listed'] !== 'boolean') {
    return null;
  }
  const domain = typeof record['domain'] === 'string' ? record['domain'] : fallbackDomain;
  const matches = Array.isArray(record['matches'])
    ? record['matches'].filter((item): item is string => typeof item === 'string')
    : [];
  const listUpdatedAt =
    typeof record['listUpdatedAt'] === 'string' ? record['listUpdatedAt'] : null;
  return { domain, listed: record['listed'], matches, listUpdatedAt };
}
