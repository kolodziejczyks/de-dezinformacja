import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AppLanguage } from './language-service';
import {
  FACT_CHECK_PAGE_SIZE,
  FACT_CHECK_SEARCH_URL,
  FactCheckReview,
  FactCheckSearchResponse,
  FactCheckState,
  classifyFactCheckError,
  factCheckQueries,
  mapFactChecks,
} from './fact-check';

export const FACT_CHECK_API_KEY = new InjectionToken<string>('FACT_CHECK_API_KEY', {
  providedIn: 'root',
  factory: () => environment.factCheckApiKey.trim(),
});

@Injectable({
  providedIn: 'root',
})
export class FactCheckService {
  private readonly http = inject(HttpClient);
  private readonly apiKey = inject(FACT_CHECK_API_KEY);
  private readonly requests = new Subject<{ rawLink: string; language: AppLanguage }>();

  readonly state = signal<FactCheckState>({ status: 'idle' });

  constructor() {
    this.requests
      .pipe(switchMap((request) => this.load(request.rawLink, request.language)))
      .subscribe((state) => this.state.set(state));
  }

  /** Search fact checks for this link in the UI language (`pl` or `en`). */
  check(rawLink: string, language: AppLanguage): void {
    this.requests.next({ rawLink, language });
  }

  private load(rawLink: string, language: AppLanguage): Observable<FactCheckState> {
    const apiKey = this.apiKey.trim();
    if (!apiKey) {
      return of({ status: 'missing-key' });
    }
    const queries = factCheckQueries(rawLink);
    if (!queries) {
      return of({ status: 'empty' });
    }

    return this.search(queries.url, language, apiKey).pipe(
      switchMap((reviews) =>
        reviews.length > 0 || queries.url === queries.domain
          ? of(reviews)
          : this.search(queries.domain, language, apiKey),
      ),
      map(
        (reviews): FactCheckState =>
          reviews.length > 0 ? { status: 'success', reviews } : { status: 'empty' },
      ),
      catchError(
        (error: unknown): Observable<FactCheckState> =>
          of({
            status: 'error',
            kind: error instanceof HttpErrorResponse ? classifyFactCheckError(error) : 'network',
          }),
      ),
      startWith<FactCheckState>({ status: 'loading' }),
    );
  }

  /**
   * `query` is the article URL, then the domain if that returns nothing.
   * `reviewPublisherSiteFilter` is the fact-checker's site (Demagog, AFP), not the article host.
   */
  private search(
    query: string,
    language: AppLanguage,
    apiKey: string,
  ): Observable<FactCheckReview[]> {
    return this.http
      .get<FactCheckSearchResponse>(FACT_CHECK_SEARCH_URL, {
        params: {
          key: apiKey,
          query,
          languageCode: language,
          pageSize: FACT_CHECK_PAGE_SIZE,
        },
      })
      .pipe(map((body) => mapFactChecks(body)));
  }
}
