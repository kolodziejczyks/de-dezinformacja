import { normalizeNewsLink } from '../news-search/news-link-validator';
import { extractDomain } from './domain-check';

export interface WaybackCapture {
  timestamp: string;
  date: string;
  original: string;
  archiveUrl: string;
}

export interface WaybackResult {
  domain: string;
  pageUrl: string | null;
  domainCapture: WaybackCapture | null;
  pageCapture: WaybackCapture | null;
  pageChecked: boolean;
  pageError: boolean;
}

export type CaptureParse = { status: 'capture'; capture: WaybackCapture } | { status: 'none' };

/**
 * Same-origin proxy for the CDX API. The domain check asks for the site root
 * (`example.com/`). A scan of every captured URL under the name times out.
 */
export function waybackApiUrl(target: string): string {
  return `/api/wayback?target=${encodeURIComponent(target)}`;
}

/** Registrable domain, plus the exact URL when the link has a path. */
export function articleTargets(rawLink: string): { domain: string; pageUrl: string | null } | null {
  const normalized = normalizeNewsLink(rawLink);
  const domain = extractDomain(rawLink);
  if (!normalized || !domain) {
    return null;
  }
  const url = new URL(normalized);
  const pageUrl = url.pathname !== '/' ? `${url.hostname}${url.pathname}${url.search}` : null;
  return { domain, pageUrl };
}

export function parseCdx(body: unknown): CaptureParse | null {
  if (!Array.isArray(body)) {
    return null;
  }
  if (body.length < 2 || !Array.isArray(body[1])) {
    return { status: 'none' };
  }
  const row = body[1] as unknown[];
  const timestamp = typeof row[0] === 'string' ? row[0] : '';
  const original = typeof row[1] === 'string' ? row[1] : '';
  if (!/^\d{14}$/.test(timestamp) || !original) {
    return null;
  }
  return {
    status: 'capture',
    capture: {
      timestamp,
      date: `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`,
      original,
      archiveUrl: `https://web.archive.org/web/${timestamp}/${original}`,
    },
  };
}
