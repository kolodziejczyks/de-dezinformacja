import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, InjectionToken, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  TimeoutError,
  catchError,
  forkJoin,
  map,
  of,
  retry,
  startWith,
  switchMap,
  throwError,
  timeout,
  timer,
} from 'rxjs';
import { CheckErrorKind, CheckState, classifyCheckError } from './check-state';
import {
  articleTargets,
  waybackApiUrl,
  parseCdx,
  type CaptureParse,
  type WaybackCapture,
  type WaybackResult,
} from './wayback-check';

export type WaybackCheckState = CheckState<WaybackResult>;

/** One extra try. The archive often answers 503 or drops the connection. */
export const WAYBACK_RETRY_COUNT = new InjectionToken<number>('WAYBACK_RETRY_COUNT', {
  factory: () => 1,
});

export const WAYBACK_RETRY_MS = new InjectionToken<number>('WAYBACK_RETRY_MS', {
  factory: () => 1000,
});

type CaptureResult = CaptureParse | { status: 'error'; kind: CheckErrorKind };

@Injectable({
  providedIn: 'root',
})
export class WaybackCheckService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryCount = inject(WAYBACK_RETRY_COUNT);
  private readonly retryMs = inject(WAYBACK_RETRY_MS);
  private readonly requests = new Subject<string>();

  readonly state = signal<WaybackCheckState>({ status: 'idle' });

  constructor() {
    // switchMap cancels both archive calls when a newer link is submitted.
    this.requests
      .pipe(
        switchMap((raw) => this.load(raw)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  /** Look up the earliest Wayback Machine capture of this link. */
  check(rawLink: string): void {
    this.requests.next(rawLink);
  }

  private load(rawLink: string): Observable<WaybackCheckState> {
    const targets = articleTargets(rawLink);
    if (!targets) {
      return of({ status: 'error', domain: rawLink.trim(), kind: 'not-found' });
    }
    const { domain, pageUrl } = targets;

    return forkJoin({
      domain: this.fetchCapture(waybackApiUrl(`${domain}/`)),
      page: pageUrl ? this.fetchCapture(waybackApiUrl(pageUrl)) : of(null),
    }).pipe(
      map(({ domain: domainResult, page }): WaybackCheckState => {
        if (domainResult.status === 'error') {
          return { status: 'error', domain, kind: domainResult.kind };
        }
        return {
          status: 'success',
          result: {
            domain,
            pageUrl,
            domainCapture: captureOf(domainResult),
            pageCapture: page ? captureOf(page) : null,
            pageChecked: pageUrl !== null,
            pageError: page?.status === 'error',
          },
        };
      }),
      startWith<WaybackCheckState>({ status: 'loading', domain }),
    );
  }

  private fetchCapture(url: string): Observable<CaptureResult> {
    return this.http.get<unknown>(url).pipe(
      timeout(20_000),
      map((body): CaptureResult => {
        const parsed = parseCdx(body);
        if (!parsed) {
          return { status: 'error', kind: 'unavailable' };
        }
        return parsed;
      }),
      retry({
        count: this.retryCount,
        delay: (error) => (isRetryable(error) ? timer(this.retryMs) : throwError(() => error)),
      }),
      catchError((error: unknown): Observable<CaptureResult> => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of({ status: 'none' });
        }
        return of({
          status: 'error',
          kind: error instanceof HttpErrorResponse ? classifyCheckError(error) : 'network',
        });
      }),
    );
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return true;
  }
  if (error.status === 404) {
    return false;
  }
  return error.status === 0 || error.status === 429 || error.status >= 500;
}

function captureOf(result: CaptureResult): WaybackCapture | null {
  return result.status === 'capture' ? result.capture : null;
}
