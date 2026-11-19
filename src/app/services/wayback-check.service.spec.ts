import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { waybackApiUrl } from './wayback-check';
import {
  WAYBACK_RETRY_COUNT,
  WAYBACK_RETRY_MS,
  WaybackCheckService,
} from './wayback-check.service';

const domainRow = [
  ['timestamp', 'original', 'statuscode'],
  ['20010923151602', 'http://www.tvn24.pl:80/', '200'],
];

const pageRow = [
  ['timestamp', 'original', 'statuscode'],
  ['20120524064506', 'http://www.tvn24.pl:80/polska', '200'],
];

describe('WaybackCheckService', () => {
  let service: WaybackCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WAYBACK_RETRY_COUNT, useValue: 0 },
      ],
    });
    service = TestBed.inject(WaybackCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the first capture of a site with no extra path', () => {
    service.check('https://www.tvn24.pl');

    expect(service.state()).toEqual({ status: 'loading', domain: 'tvn24.pl' });
    const request = http.expectOne(waybackApiUrl('tvn24.pl/'));
    expect(request.request.method).toBe('GET');
    request.flush(domainRow);

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status !== 'success') {
      return;
    }
    expect(state.result.domainCapture?.date).toBe('2001-09-23');
    expect(state.result.domainCapture?.archiveUrl).toContain('/web/20010923151602/');
    expect(state.result.pageChecked).toBe(false);
    expect(state.result.pageCapture).toBeNull();
  });

  it('also loads the exact page when the link has a path', () => {
    service.check('https://www.tvn24.pl/polska');

    http.expectOne(waybackApiUrl('tvn24.pl/')).flush(domainRow);
    http.expectOne(waybackApiUrl('www.tvn24.pl/polska')).flush(pageRow);

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status !== 'success') {
      return;
    }
    expect(state.result.pageChecked).toBe(true);
    expect(state.result.pageCapture?.date).toBe('2012-05-24');
    expect(state.result.pageError).toBe(false);
  });

  it('says there is no copy when the index is empty, including a 404', () => {
    service.check('https://fresh.example/');
    http.expectOne(waybackApiUrl('fresh.example/')).flush([]);

    expect(service.state()).toMatchObject({
      status: 'success',
      result: { domainCapture: null, pageChecked: false },
    });

    service.check('https://fresh.example/story');
    http.expectOne(waybackApiUrl('fresh.example/')).flush([]);
    http
      .expectOne(waybackApiUrl('fresh.example/story'))
      .flush(null, { status: 404, statusText: 'Not Found' });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domainCapture).toBeNull();
      expect(state.result.pageCapture).toBeNull();
      expect(state.result.pageError).toBe(false);
    }
  });

  it('keeps the domain date when the page lookup fails', () => {
    service.check('https://tvn24.pl/polska');
    http.expectOne(waybackApiUrl('tvn24.pl/')).flush(domainRow);
    http.expectOne(waybackApiUrl('tvn24.pl/polska')).error(new ProgressEvent('error'));

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domainCapture?.date).toBe('2001-09-23');
      expect(state.result.pageError).toBe(true);
    }
  });

  it('reports a network failure and cancels both calls when a newer link is submitted', () => {
    service.check('https://a.example/story');
    service.check('https://b.example/');

    const domain = http.expectOne(waybackApiUrl('a.example/'));
    const page = http.expectOne(waybackApiUrl('a.example/story'));
    expect(domain.cancelled).toBe(true);
    expect(page.cancelled).toBe(true);

    http.expectOne(waybackApiUrl('b.example/')).error(new ProgressEvent('error'));
    expect(service.state()).toEqual({ status: 'error', domain: 'b.example', kind: 'network' });
  });
});

describe('WaybackCheckService retry', () => {
  let service: WaybackCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WAYBACK_RETRY_COUNT, useValue: 1 },
        { provide: WAYBACK_RETRY_MS, useValue: 0 },
      ],
    });
    service = TestBed.inject(WaybackCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('tries the archive call once more after a 503 and keeps a 404 as no capture', async () => {
    service.check('https://tvn24.pl/polska');

    http
      .expectOne(waybackApiUrl('tvn24.pl/'))
      .flush('<html>offline</html>', { status: 503, statusText: 'Unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne(waybackApiUrl('tvn24.pl/')).flush(domainRow);

    http
      .expectOne(waybackApiUrl('tvn24.pl/polska'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    http.expectNone(waybackApiUrl('tvn24.pl/polska'));

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domainCapture?.date).toBe('2001-09-23');
      expect(state.result.pageCapture).toBeNull();
      expect(state.result.pageError).toBe(false);
    }
  });
});
