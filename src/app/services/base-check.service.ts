import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  DomainCheckState,
  RdapDomain,
  classifyRdapError,
  extractDomain,
  mapRdapDomain,
  rdapDomainUrl,
  wwwPublicSuffixFallback,
} from './domain-check';

@Injectable({
  providedIn: 'root',
})
export class BaseCheckService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<string>();

  readonly state = signal<DomainCheckState>({ status: 'idle' });

  constructor() {
    // switchMap drops an in-flight lookup, including a suffix fallback, when a
    // newer link is submitted. catchError inside load() keeps this stream alive.
    this.requests
      .pipe(
        switchMap((raw) => this.load(raw)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  /** Look up registration data for the domain of a news link. */
  check(rawLink: string): void {
    this.requests.next(rawLink);
  }

  private load(rawLink: string): Observable<DomainCheckState> {
    let domain: string | null;
    try {
      domain = extractDomain(rawLink);
    } catch {
      domain = null;
    }
    if (!domain) {
      return of({ status: 'error', domain: rawLink.trim(), kind: 'not-found' });
    }

    const fallback = wwwPublicSuffixFallback(domain);
    return this.fetch(domain).pipe(
      switchMap((state) =>
        state.status === 'error' && state.kind === 'not-found' && fallback
          ? this.fetch(fallback)
          : of(state),
      ),
    );
  }

  private fetch(domain: string): Observable<DomainCheckState> {
    return this.http
      .get<RdapDomain>(rdapDomainUrl(domain), {
        headers: { Accept: 'application/rdap+json, application/json' },
      })
      .pipe(
        map((body): DomainCheckState => {
          if (!body || typeof body !== 'object') {
            return { status: 'error', domain, kind: 'unavailable' };
          }
          return { status: 'success', result: mapRdapDomain(body, domain) };
        }),
        catchError(
          (error: unknown): Observable<DomainCheckState> =>
            of({
              status: 'error',
              domain,
              kind: error instanceof HttpErrorResponse ? classifyRdapError(error) : 'network',
            }),
        ),
        startWith<DomainCheckState>({ status: 'loading', domain }),
      );
  }
}
