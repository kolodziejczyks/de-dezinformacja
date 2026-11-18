export type FactCheckQueryKind = 'url' | 'domain';

export interface FactCheckQueryCandidate {
  query: string;
  kind: FactCheckQueryKind;
}

/**
 * Queries to try against claims:search, most specific first.
 *
 * An exact article URL matches when that URL is itself a fact-check, and usually
 * misses an ordinary news article. The bare host is used only when the link has
 * no path. A parent site such as onet.pl is not searched for a subdomain article:
 * that returns reviews about other pages on the same portal. `reviewPublisherSiteFilter`
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
    return candidates;
  }

  add(host, 'domain');
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
