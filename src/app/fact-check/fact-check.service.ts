import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of, shareReplay, switchMap } from 'rxjs';

import { factCheckQueryCandidates, FactCheckQueryCandidate } from './fact-check-queries';
import {
  FactCheckClaim,
  FactCheckConfig,
  FactCheckLookup,
  FactCheckReview,
  FactCheckSearchResponse,
} from './fact-check.models';

export const FACT_CHECK_CONFIG_URL = '/config/fact-check.json';
export const FACT_CHECK_SEARCH_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

const EMPTY_LOOKUP: FactCheckLookup = {
  status: 'empty',
  reviews: [],
  matchedQuery: null,
  fellBackToDomain: false,
};

@Injectable({
  providedIn: 'root',
})
export class FactCheckService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  private readonly apiKey$ = this.http.get<FactCheckConfig>(FACT_CHECK_CONFIG_URL).pipe(
    map((config) => (typeof config?.apiKey === 'string' ? config.apiKey.trim() : '')),
    catchError(() => of('')),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  search(link: string): Observable<FactCheckLookup> {
    const candidates = factCheckQueryCandidates(link);
    if (candidates.length === 0) {
      return of({ ...EMPTY_LOOKUP, status: 'error' });
    }

    const languageCode = this.languageCode();

    return this.apiKey$.pipe(
      switchMap((apiKey) => {
        if (!apiKey) {
          return of<FactCheckLookup>({ ...EMPTY_LOOKUP, status: 'no-key' });
        }
        return this.searchCandidates(candidates, apiKey, languageCode, false);
      }),
    );
  }

  private languageCode(): 'pl' | 'en' {
    const fallback = this.translate.getFallbackLang();
    const lang = (this.translate.getCurrentLang() || fallback || 'pl').toLowerCase();
    return lang.startsWith('en') ? 'en' : 'pl';
  }

  private searchCandidates(
    candidates: readonly FactCheckQueryCandidate[],
    apiKey: string,
    languageCode: 'pl' | 'en',
    urlMissed: boolean,
  ): Observable<FactCheckLookup> {
    const [current, ...rest] = candidates;
    if (!current) {
      return of(EMPTY_LOOKUP);
    }

    return this.fetchClaims(current.query, apiKey, languageCode).pipe(
      switchMap((claims) => {
        const reviews = toReviews(claims);
        if (reviews.length > 0) {
          return of<FactCheckLookup>({
            status: 'results',
            reviews,
            matchedQuery: current.query,
            fellBackToDomain: current.kind === 'domain' && urlMissed,
          });
        }

        if (rest.length === 0) {
          return of(EMPTY_LOOKUP);
        }

        return this.searchCandidates(
          rest,
          apiKey,
          languageCode,
          urlMissed || current.kind === 'url',
        );
      }),
      catchError(() => of<FactCheckLookup>({ ...EMPTY_LOOKUP, status: 'error' })),
    );
  }

  private fetchClaims(
    query: string,
    apiKey: string,
    languageCode: 'pl' | 'en',
  ): Observable<FactCheckClaim[]> {
    const params = new HttpParams()
      .set('key', apiKey)
      .set('query', query)
      .set('languageCode', languageCode)
      .set('pageSize', '10');

    return this.http
      .get<FactCheckSearchResponse>(FACT_CHECK_SEARCH_URL, { params })
      .pipe(map((response) => response.claims ?? []));
  }
}

function toReviews(claims: FactCheckClaim[]): FactCheckReview[] {
  const reviews: FactCheckReview[] = [];
  const seen = new Set<string>();

  for (const claim of claims) {
    const claimText = claim.text?.trim() || '';
    const claimant = claim.claimant?.trim() || null;

    for (const review of claim.claimReview ?? []) {
      const reviewUrl = review.url?.trim() ?? '';
      if (!isHttpUrl(reviewUrl)) {
        continue;
      }

      const textualRating = review.textualRating?.trim() || null;
      const dedupeKey = `${reviewUrl} ${claimText} ${textualRating ?? ''}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);

      const publisherName = review.publisher?.name?.trim() || review.publisher?.site?.trim() || '';
      const text = claimText || review.title?.trim() || '';
      if (!text || !publisherName) {
        continue;
      }

      reviews.push({
        trackId: `${reviews.length}-${reviewUrl}`,
        claimText: text,
        claimant,
        publisherName,
        textualRating,
        reviewDate: review.reviewDate?.trim() || null,
        reviewUrl,
      });
    }
  }

  return reviews;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
