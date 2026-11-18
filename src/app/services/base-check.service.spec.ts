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

  it('cancels an in-flight lookup when a new link is submitted', () => {
    service.check('https://a.example.com/one');
    service.check('https://b.example.com/two');

    const first = http.expectOne(rdapDomainUrl('a.example.com'));
    const second = http.expectOne(rdapDomainUrl('b.example.com'));
    expect(first.cancelled).toBe(true);

    second.flush(sample);
    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.result.domain).toBe('bbc.co.uk');
    }
  });
});
