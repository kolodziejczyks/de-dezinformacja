import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { certApiUrl } from './cert-check';
import { CertCheckService } from './cert-check.service';

describe('CertCheckService', () => {
  let service: CertCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CertCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('asks the API about the full host and reports a listing', () => {
    service.check('https://Login.Evil.Example/reset');

    expect(service.state()).toEqual({ status: 'loading', domain: 'login.evil.example' });
    const request = http.expectOne(certApiUrl('login.evil.example'));
    expect(request.request.method).toBe('GET');
    request.flush({
      domain: 'login.evil.example',
      listed: true,
      matches: ['evil.example'],
      checked: ['login.evil.example', 'evil.example'],
      listUpdatedAt: '2026-11-19T14:15:07.000Z',
      listSize: 3,
    });

    expect(service.state()).toEqual({
      status: 'success',
      result: {
        domain: 'login.evil.example',
        listed: true,
        matches: ['evil.example'],
        listUpdatedAt: '2026-11-19T14:15:07.000Z',
      },
    });
  });

  it('reports a calm miss and an unavailable list', () => {
    service.check('tvn24.pl/polska');
    http.expectOne(certApiUrl('tvn24.pl')).flush({
      domain: 'tvn24.pl',
      listed: false,
      matches: [],
      listUpdatedAt: null,
    });
    expect(service.state()).toEqual({
      status: 'success',
      result: {
        domain: 'tvn24.pl',
        listed: false,
        matches: [],
        listUpdatedAt: null,
      },
    });

    service.check('https://onet.pl/a');
    http
      .expectOne(certApiUrl('onet.pl'))
      .flush({ error: 'list-unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(service.state()).toEqual({ status: 'error', domain: 'onet.pl', kind: 'unavailable' });

    service.check('https://wyborcza.pl/a');
    http.expectOne(certApiUrl('wyborcza.pl')).error(new ProgressEvent('error'));
    expect(service.state()).toEqual({ status: 'error', domain: 'wyborcza.pl', kind: 'network' });
  });

  it('cancels an in-flight lookup when a newer link is submitted', () => {
    service.check('https://a.example/one');
    service.check('https://b.example/two');

    const first = http.expectOne(certApiUrl('a.example'));
    const second = http.expectOne(certApiUrl('b.example'));
    expect(first.cancelled).toBe(true);
    second.flush({ domain: 'b.example', listed: false, matches: [] });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('b.example');
      expect(state.result.listed).toBe(false);
    }
  });

  it('does not call the API for a value that is not a link', () => {
    service.check('not a url');
    http.expectNone(() => true);
    expect(service.state()).toEqual({ status: 'error', domain: 'not a url', kind: 'not-found' });
  });
});
