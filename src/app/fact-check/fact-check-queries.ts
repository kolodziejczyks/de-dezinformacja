import { normalizeNewsLink } from '../news-search/news-link-validator';

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
 * no path. `extractDomain` is not used: it returns the registrable site
 * (`przegladsportowy.onet.pl` becomes `onet.pl`), and that search returns reviews
 * of other pages on the same portal. Parsing uses `normalizeNewsLink`, the same
 * check as the news-link field. `reviewPublisherSiteFilter` only keeps reviews
 * published by that host, so it is not used here.
 */
export function factCheckQueryCandidates(link: string): FactCheckQueryCandidate[] {
  const normalized = normalizeNewsLink(link);
  if (!normalized) {
    return [];
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
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
