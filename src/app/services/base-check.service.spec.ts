import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseCheckService } from './base-check.service';
import { rdapDomainUrl, type RdapDomain } from './domain-check';

const sample: RdapDomain = {
  ldhName: 'bbc.co.uk',
  status: ['server transfer prohibited'],
  events: [
    { eventAction: 'registration', eventDate: '1994-12-13T03:49:48Z' },
    { eventAction: 'expiration', eventDate: '2034-12-13T03:49:48Z' },
    { eventAction: 'last changed', eventDate: '2025-10-29T03:51:11Z' },
  ],
  nameservers: [{ ldhName: 'dns0.bbc.co.uk' }],
  entities: [
    {
      roles: ['registrar'],
      vcardArray: ['vcard', [['fn', {}, 'text', 'British Broadcasting Corporation']]],
    },
  ],
};

describe('BaseCheckService', () => {
  let service: BaseCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BaseCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.state()).toEqual({ status: 'idle' });
  });

  it('loads registration data for a scheme-less www link', () => {
    service.check('https://www.BBC.co.uk/news/world-123?at_medium=RSS#top');

    expect(service.state()).toEqual({ status: 'loading', domain: 'bbc.co.uk' });

    const request = http.expectOne(rdapDomainUrl('bbc.co.uk'));
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Accept')).toContain('application/rdap+json');
    request.flush(sample);

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status !== 'success') {
      return;
    }
    expect(state.result.domain).toBe('bbc.co.uk');
    expect(state.result.registrar).toBe('British Broadcasting Corporation');
    expect(state.result.registeredAt).toBe('1994-12-13T03:49:48Z');
    expect(state.result.expiresAt).toBe('2034-12-13T03:49:48Z');
    expect(state.result.nameservers).toEqual(['dns0.bbc.co.uk']);
    expect(state.result.age).not.toBeNull();
  });

  it('reports an unsupported TLD, a rate limit, and a network failure', () => {
    service.check('example.zzz');
    http
      .expectOne(rdapDomainUrl('example.zzz'))
      .flush(
        { title: 'No RDAP service is available for this resource' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(service.state()).toEqual({
      status: 'error',
      domain: 'example.zzz',
      kind: 'unsupported',
    });

    service.check('nytimes.com/article');
    http
      .expectOne(rdapDomainUrl('nytimes.com'))
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    expect(service.state()).toEqual({ status: 'error', domain: 'nytimes.com', kind: 'rate-limit' });

    service.check('tvn24.pl/swiat');
    http.expectOne(rdapDomainUrl('tvn24.pl')).error(new ProgressEvent('error'));
    expect(service.state()).toEqual({ status: 'error', domain: 'tvn24.pl', kind: 'network' });
  });

  it('looks up the registered domain of a subdomain', () => {
    service.check(
      'https://przegladsportowy.onet.pl/siatkowka/tauron-liga-siatkarzy/wilfredo-leon/wh8ylrx',
    );

    expect(service.state()).toEqual({ status: 'loading', domain: 'onet.pl' });
    http.expectOne(rdapDomainUrl('onet.pl')).flush({ ...sample, ldhName: 'onet.pl' });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('onet.pl');
    }
  });

  it('keeps a separate www registration under a public suffix', () => {
    service.check('https://www.gov.pl/web/cyfryzacja');

    const request = http.expectOne(rdapDomainUrl('www.gov.pl'));
    request.flush({ ...sample, ldhName: 'www.gov.pl', unicodeName: 'www.gov.pl' });
    http.expectNone(rdapDomainUrl('gov.pl'));

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('www.gov.pl');
    }
  });

  it('retries the public suffix when www plus that suffix has no record', () => {
    service.check('https://www.nhs.uk/news');

    expect(service.state()).toEqual({ status: 'loading', domain: 'www.nhs.uk' });
    http
      .expectOne(rdapDomainUrl('www.nhs.uk'))
      .flush({ title: 'Domain www.nhs.uk not found' }, { status: 404, statusText: 'Not Found' });

    expect(service.state()).toEqual({ status: 'loading', domain: 'nhs.uk' });
    http.expectOne(rdapDomainUrl('nhs.uk')).flush({ ...sample, ldhName: 'nhs.uk' });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('nhs.uk');
    }
  });

  it('cancels a public-suffix fallback when a newer link is submitted', () => {
    service.check('https://www.nhs.uk/news');
    http
      .expectOne(rdapDomainUrl('www.nhs.uk'))
      .flush({ title: 'Domain www.nhs.uk not found' }, { status: 404, statusText: 'Not Found' });

    const fallback = http.expectOne(rdapDomainUrl('nhs.uk'));
    service.check('https://wyborcza.pl/a');
    expect(fallback.cancelled).toBe(true);

    http.expectOne(rdapDomainUrl('wyborcza.pl')).flush({ ...sample, ldhName: 'wyborcza.pl' });
    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('wyborcza.pl');
    }
  });

  it('cancels an in-flight lookup when a new link is submitted', () => {
    service.check('https://a.example.com/one');
    service.check('https://b.example.org/two');

    const first = http.expectOne(rdapDomainUrl('example.com'));
    const second = http.expectOne(rdapDomainUrl('example.org'));
    expect(first.cancelled).toBe(true);
    expect(() => first.flush(sample)).toThrow();

    second.flush(sample);
    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('bbc.co.uk');
    }
  });

  it('cancels the previous request when two articles share a registered domain', () => {
    service.check('https://sport.example.com/one');
    service.check('https://news.example.com/two');

    const requests = http.match(rdapDomainUrl('example.com'));
    expect(requests.map((request) => request.cancelled)).toEqual([true, false]);

    requests[1].flush({ ...sample, ldhName: 'example.com' });
    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('example.com');
    }
  });

  it('drops an in-flight lookup when the next value is not a link', () => {
    service.check('https://onet.pl/artykul');
    service.check('not a url');

    const request = http.expectOne(rdapDomainUrl('onet.pl'));
    expect(request.cancelled).toBe(true);
    expect(service.state()).toEqual({ status: 'error', domain: 'not a url', kind: 'not-found' });
  });

  it('keeps accepting lookups after a response that cannot be mapped', () => {
    service.check('https://example.com/broken');
    http.expectOne(rdapDomainUrl('example.com')).flush({ nameservers: 1 });
    expect(service.state()).toEqual({
      status: 'error',
      domain: 'example.com',
      kind: 'network',
    });

    service.check('https://example.org/ok');
    http.expectOne(rdapDomainUrl('example.org')).flush(sample);
    expect(service.state().status).toBe('success');
  });

  it('reports an empty payload as unavailable', () => {
    service.check('https://example.com/empty');
    http.expectOne(rdapDomainUrl('example.com')).flush(null);
    expect(service.state()).toEqual({
      status: 'error',
      domain: 'example.com',
      kind: 'unavailable',
    });
  });
});
