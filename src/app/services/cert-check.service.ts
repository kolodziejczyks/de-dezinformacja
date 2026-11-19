import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { CheckState, classifyCheckError } from './check-state';
import { certApiUrl, parseCertResponse, type CertResult } from './cert-check';
import { extractHostname } from './domain-check';

export type CertCheckState = CheckState<CertResult>;

@Injectable({
  providedIn: 'root',
})
export class CertCheckService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<string>();

  readonly state = signal<CertCheckState>({ status: 'idle' });

  constructor() {
    // switchMap drops an in-flight list check when a newer link is submitted.
    this.requests
      .pipe(
        switchMap((raw) => this.load(raw)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  /** Ask the local API whether this link's host is on the CERT Polska warning list. */
  check(rawLink: string): void {
    this.requests.next(rawLink);
  }

  private load(rawLink: string): Observable<CertCheckState> {
    const domain = extractHostname(rawLink);
    if (!domain) {
      return of({ status: 'error', domain: rawLink.trim(), kind: 'not-found' });
    }

    return this.http.get<unknown>(certApiUrl(domain)).pipe(
      map((body): CertCheckState => {
        const result = parseCertResponse(body, domain);
        if (!result) {
          return { status: 'error', domain, kind: 'unavailable' };
        }
        return { status: 'success', result };
      }),
      catchError(
        (error: unknown): Observable<CertCheckState> =>
          of({
            status: 'error',
            domain,
            kind: error instanceof HttpErrorResponse ? classifyCheckError(error) : 'network',
          }),
      ),
      startWith<CertCheckState>({ status: 'loading', domain }),
    );
  }
}
