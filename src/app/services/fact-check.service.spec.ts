import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FACT_CHECK_SEARCH_URL } from './fact-check';
import { FACT_CHECK_API_KEY, FactCheckService } from './fact-check.service';

describe('FactCheckService', () => {
  let service: FactCheckService;
  let http: HttpTestingController;

  function setup(apiKey: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FACT_CHECK_API_KEY, useValue: apiKey },
      ],
    });
    service = TestBed.inject(FactCheckService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
  });

  it('does not call Google when no API key is configured', () => {
    setup('');

    service.check('https://www.bbc.co.uk/news/world-123', 'en');

    expect(service.state()).toEqual({ status: 'missing-key' });
    http.expectNone(() => true);
  });

  it('searches by article URL in the UI language and skips the publisher-site filter', () => {
    setup('test-key');

    service.check('https://www.BBC.co.uk/news/world-123?at_medium=RSS#top', 'pl');

    expect(service.state()).toEqual({ status: 'loading' });
    const request = http.expectOne((candidate) => candidate.url === FACT_CHECK_SEARCH_URL);
    expect(request.request.params.get('query')).toBe(
      'https://www.bbc.co.uk/news/world-123?at_medium=RSS',
    );
    expect(request.request.params.get('languageCode')).toBe('pl');
    expect(request.request.params.get('key')).toBe('test-key');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.has('reviewPublisherSiteFilter')).toBe(false);
    request.flush({
      claims: [
        {
          text: 'A claim about the article',
          claimant: 'Someone',
          claimReview: [
            {
              publisher: { name: 'Demagog', site: 'demagog.org.pl' },
              url: 'https://demagog.org.pl/review',
              textualRating: 'Fałsz',
              reviewDate: '2024-05-01T00:00:00Z',
            },
          ],
        },
      ],
    });

    expect(service.state()).toEqual({
      status: 'success',
      reviews: [
        {
          claimText: 'A claim about the article',
          claimant: 'Someone',
          publisher: 'Demagog',
          textualRating: 'Fałsz',
          reviewDate: '2024-05-01T00:00:00Z',
          reviewUrl: 'https://demagog.org.pl/review',
        },
      ],
    });
  });

  it('falls back to the domain when the article URL has no fact checks', () => {
    setup('test-key');

    service.check('nyt.com/weird-article', 'en');

    const byUrl = http.expectOne(
      (candidate) => candidate.params.get('query') === 'https://nyt.com/weird-article',
    );
    expect(byUrl.request.params.get('languageCode')).toBe('en');
    byUrl.flush({ claims: [] });

    const byDomain = http.expectOne((candidate) => candidate.params.get('query') === 'nyt.com');
    byDomain.flush({
      claims: [
        {
          text: 'A claim mentioning the site',
          claimReview: [
            {
              publisher: { name: 'AFP' },
              url: 'https://factcheck.afp.com/example',
              textualRating: 'Misleading',
              reviewDate: '2023-01-01T00:00:00Z',
            },
          ],
        },
      ],
    });

    const state = service.state();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.reviews[0]?.publisher).toBe('AFP');
      expect(state.reviews[0]?.reviewUrl).toBe('https://factcheck.afp.com/example');
    }
  });

  it('says nothing was found when both queries are empty', () => {
    setup('test-key');

    service.check('https://example.com/story', 'en');
    http
      .expectOne((candidate) => candidate.params.get('query') === 'https://example.com/story')
      .flush({});
    http.expectOne((candidate) => candidate.params.get('query') === 'example.com').flush({});

    expect(service.state()).toEqual({ status: 'empty' });
  });

  it('reports a rejected key, a rate limit, and a network failure', () => {
    setup('test-key');

    service.check('https://example.com/a', 'en');
    http
      .expectOne((candidate) => candidate.params.get('query') === 'https://example.com/a')
      .flush({ error: { status: 'PERMISSION_DENIED' } }, { status: 403, statusText: 'Forbidden' });
    expect(service.state()).toEqual({ status: 'error', kind: 'unauthorized' });

    service.check('https://example.com/b', 'pl');
    http
      .expectOne((candidate) => candidate.params.get('query') === 'https://example.com/b')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    expect(service.state()).toEqual({ status: 'error', kind: 'rate-limit' });

    service.check('https://example.com/c', 'en');
    http
      .expectOne((candidate) => candidate.params.get('query') === 'https://example.com/c')
      .error(new ProgressEvent('error'));
    expect(service.state()).toEqual({ status: 'error', kind: 'network' });
  });
});
