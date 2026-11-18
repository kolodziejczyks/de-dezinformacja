import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  DomainCheckState,
  RdapDomain,
  classifyRdapError,
  extractDomain,
  mapRdapDomain,
  rdapDomainUrl,
} from './domain-check';

@Injectable({
  providedIn: 'root',
})
export class BaseCheckService {
  private readonly http = inject(HttpClient);
  private readonly requests = new Subject<string>();

  readonly state = signal<DomainCheckState>({ status: 'idle' });

  constructor() {
    this.requests
      .pipe(switchMap((raw) => this.load(raw)))
      .subscribe((state) => this.state.set(state));
  }

  /** Look up registration data for the domain of a news link. */
  check(rawLink: string): void {
    this.requests.next(rawLink);
  }

  private load(rawLink: string): Observable<DomainCheckState> {
    const domain = extractDomain(rawLink);
    if (!domain) {
      return of({ status: 'error', domain: rawLink.trim(), kind: 'not-found' });
    }

    return this.http
      .get<RdapDomain>(rdapDomainUrl(domain), {
        headers: { Accept: 'application/rdap+json, application/json' },
      })
      .pipe(
        map(
          (body): DomainCheckState => ({ status: 'success', result: mapRdapDomain(body, domain) }),
        ),
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
