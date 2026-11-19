import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, InjectionToken, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, startWith, switchMap, timer } from 'rxjs';
import { CheckState, classifyCheckError } from './check-state';
import { extractDomain } from './domain-check';
import { RequestSpacing } from './request-spacing';
import { parseTrancoResponse, trancoRankUrl, type TrancoResult } from './tranco-check';

export type TrancoCheckState = CheckState<TrancoResult>;

/** Tranco allows one request per second. One lookup sends one request. */
export const TRANCO_MIN_INTERVAL_MS = new InjectionToken<number>('TRANCO_MIN_INTERVAL_MS', {
  factory: () => 1000,
});

@Injectable({
  providedIn: 'root',
})
export class TrancoCheckService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<string>();
  private readonly spacing = new RequestSpacing(inject(TRANCO_MIN_INTERVAL_MS));

  readonly state = signal<TrancoCheckState>({ status: 'idle' });

  constructor() {
    this.requests
      .pipe(
        switchMap((raw) => this.load(raw)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  /** Look up the latest Tranco rank of the registrable domain. One request per call. */
  check(rawLink: string): void {
    this.requests.next(rawLink);
  }

  private load(rawLink: string): Observable<TrancoCheckState> {
    const domain = extractDomain(rawLink);
    if (!domain) {
      return of({ status: 'error', domain: rawLink.trim(), kind: 'not-found' });
    }

    const loading: TrancoCheckState = { status: 'loading', domain };
    const waitMs = this.spacing.reserve();
    const request = this.fetch(domain);
    if (waitMs <= 0) {
      return request.pipe(startWith(loading));
    }
    return timer(waitMs).pipe(
      switchMap(() => this.fetch(domain)),
      startWith(loading),
    );
  }

  private fetch(domain: string): Observable<TrancoCheckState> {
    return this.http.get<unknown>(trancoRankUrl(domain)).pipe(
      map((body): TrancoCheckState => {
        const result = parseTrancoResponse(body, domain);
        if (!result) {
          return { status: 'error', domain, kind: 'unavailable' };
        }
        return { status: 'success', result };
      }),
      catchError(
        (error: unknown): Observable<TrancoCheckState> =>
          of({
            status: 'error',
            domain,
            kind: error instanceof HttpErrorResponse ? classifyCheckError(error) : 'network',
          }),
      ),
    );
  }
}
