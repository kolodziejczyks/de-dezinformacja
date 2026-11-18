import { HttpErrorResponse } from '@angular/common/http';
import { extractDomain } from './domain-check';

export const FACT_CHECK_SEARCH_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

export const FACT_CHECK_PAGE_SIZE = 10;

export interface FactCheckReview {
  claimText: string;
  claimant: string | null;
  publisher: string | null;
  textualRating: string | null;
  reviewDate: string | null;
  reviewUrl: string | null;
}

export type FactCheckErrorKind = 'network' | 'rate-limit' | 'unauthorized' | 'unavailable';

export type FactCheckState =
  | { status: 'idle' }
  | { status: 'missing-key' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; reviews: FactCheckReview[] }
  | { status: 'error'; kind: FactCheckErrorKind };

export interface FactCheckSearchResponse {
  claims?: FactCheckClaim[];
}

interface FactCheckClaim {
  text?: string;
  claimant?: string;
  claimReview?: FactCheckClaimReview[];
}

interface FactCheckClaimReview {
  url?: string;
  reviewDate?: string;
  textualRating?: string;
  publisher?: { name?: string; site?: string };
}

/** Absolute article URL (hash stripped) and the registrable host used as the fallback query. */
export function factCheckQueries(rawLink: string): { url: string; domain: string } | null {
  const domain = extractDomain(rawLink);
  if (!domain) {
    return null;
  }
  const trimmed = rawLink.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    url.hash = '';
    return { url: url.toString(), domain };
  } catch {
    return null;
  }
}

export function mapFactChecks(body: FactCheckSearchResponse | null): FactCheckReview[] {
  const reviews: FactCheckReview[] = [];
  const seen = new Set<string>();
  for (const claim of body?.claims ?? []) {
    const claimText = clean(claim.text);
    if (!claimText) {
      continue;
    }
    const claimReviews = claim.claimReview?.length ? claim.claimReview : [{}];
    for (const review of claimReviews) {
      const reviewUrl = clean(review.url);
      const key = reviewUrl ?? `${claimText}\n${clean(review.textualRating) ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      reviews.push({
        claimText,
        claimant: clean(claim.claimant),
        publisher: clean(review.publisher?.name) ?? clean(review.publisher?.site),
        textualRating: clean(review.textualRating),
        reviewDate: clean(review.reviewDate),
        reviewUrl,
      });
    }
  }
  return reviews;
}

export function classifyFactCheckError(error: HttpErrorResponse): FactCheckErrorKind {
  if (error.status === 0) {
    return 'network';
  }
  if (error.status === 429) {
    return 'rate-limit';
  }
  if (error.status === 401 || error.status === 403) {
    return 'unauthorized';
  }
  return 'unavailable';
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
