export type FactCheckQueryKind = 'url' | 'domain';

export interface FactCheckQueryCandidate {
  query: string;
  kind: FactCheckQueryKind;
}

const MULTIPART_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'gov.uk',
  'ac.uk',
  'com.pl',
  'net.pl',
  'org.pl',
  'gov.pl',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'com.br',
]);

/**
 * Queries to try against claims:search, most specific first.
 *
 * Live checks against the Fact Check Explorer index (same corpus as this API):
 * an exact article URL matches when that URL is itself a fact-check, and usually
 * misses ordinary news articles. The bare registrable domain (no scheme, no www)
 * is what returns reviews that mention the outlet. `reviewPublisherSiteFilter`
 * only keeps reviews published by that host, so it is not used here.
 */
export function factCheckQueryCandidates(link: string): FactCheckQueryCandidate[] {
  const parsed = parseNewsLink(link);
  if (!parsed) {
    return [];
  }

  const originalHost = parsed.hostname;
  const host = originalHost.replace(/^www\./i, '');
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  const registrable = registrableDomain(host);
  const candidates: FactCheckQueryCandidate[] = [];

  const add = (query: string, kind: FactCheckQueryKind): void => {
    if (!query || candidates.some((candidate) => candidate.query === query)) {
      return;
    }
    candidates.push({ query, kind });
  };

  if (path) {
    add(`https://${originalHost}${path}`, 'url');
    add(`https://${host}${path}`, 'url');
    add(`${host}${path}`, 'url');
  }

  add(host, 'domain');
  if (registrable !== host) {
    add(registrable, 'domain');
  }

  return candidates;
}

export function parseNewsLink(link: string): URL | null {
  const trimmed = link.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (!url.hostname.includes('.')) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const labels = host.split('.').filter((label) => label.length > 0);

  if (labels.length <= 2) {
    return host;
  }

  const lastTwo = labels.slice(-2).join('.');
  if (MULTIPART_PUBLIC_SUFFIXES.has(lastTwo)) {
    return labels.slice(-3).join('.');
  }

  return lastTwo;
}
