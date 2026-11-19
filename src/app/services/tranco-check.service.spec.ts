import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TRANCO_MIN_INTERVAL_MS, TrancoCheckService } from './tranco-check.service';
import { trancoRankUrl } from './tranco-check';

describe('TrancoCheckService', () => {
  let service: TrancoCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TRANCO_MIN_INTERVAL_MS, useValue: 0 },
      ],
    });
    service = TestBed.inject(TrancoCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('requests the registrable domain once and shows the latest rank', () => {
    service.check('https://sport.tvn24.pl/polska/artykul');

    expect(service.state()).toEqual({ status: 'loading', domain: 'tvn24.pl' });
    const request = http.expectOne(trancoRankUrl('tvn24.pl'));
    expect(request.request.method).toBe('GET');
    http.expectNone(trancoRankUrl('sport.tvn24.pl'));
    request.flush({
      domain: 'tvn24.pl',
      ranks: [
        { date: '2026-11-17', rank: 5643 },
        { date: '2026-11-18', rank: 5669 },
      ],
    });

    expect(service.state()).toEqual({
      status: 'success',
      result: { domain: 'tvn24.pl', rank: 5669, date: '2026-11-18' },
    });
  });

  it('treats an empty rank list as outside the top million', () => {
    service.check('https://fresh.example/a');
    http.expectOne(trancoRankUrl('fresh.example')).flush({ ranks: [], domain: 'fresh.example' });

    expect(service.state()).toEqual({
      status: 'success',
      result: { domain: 'fresh.example', rank: null, date: null },
    });
  });

  it('reports a rate limit and a network failure', () => {
    service.check('https://a.example/');
    http
      .expectOne(trancoRankUrl('a.example'))
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    expect(service.state()).toEqual({ status: 'error', domain: 'a.example', kind: 'rate-limit' });

    service.check('https://b.example/');
    http.expectOne(trancoRankUrl('b.example')).error(new ProgressEvent('error'));
    expect(service.state()).toEqual({ status: 'error', domain: 'b.example', kind: 'network' });
  });

  it('cancels the previous lookup and does not send a second request for the same check', () => {
    service.check('https://a.example/one');
    service.check('https://b.example/two');

    const first = http.expectOne(trancoRankUrl('a.example'));
    const second = http.expectOne(trancoRankUrl('b.example'));
    expect(first.cancelled).toBe(true);
    second.flush({ ranks: [{ date: '2026-11-18', rank: 10 }], domain: 'b.example' });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('b.example');
      expect(state.result.rank).toBe(10);
    }
  });
});

describe('TrancoCheckService rate limit', () => {
  let service: TrancoCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TRANCO_MIN_INTERVAL_MS, useValue: 1000 },
      ],
    });
    service = TestBed.inject(TrancoCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('waits a second before a second lookup reaches the network', async () => {
    service.check('https://a.example/one');
    const first = http.expectOne(trancoRankUrl('a.example'));

    service.check('https://b.example/two');
    expect(first.cancelled).toBe(true);
    http.expectNone(trancoRankUrl('b.example'));

    await vi.advanceTimersByTimeAsync(999);
    http.expectNone(trancoRankUrl('b.example'));

    await vi.advanceTimersByTimeAsync(1);
    const second = http.expectOne(trancoRankUrl('b.example'));
    second.flush({ ranks: [], domain: 'b.example' });
    expect(service.state()).toMatchObject({
      status: 'success',
      result: { domain: 'b.example', rank: null },
    });
  });
});
