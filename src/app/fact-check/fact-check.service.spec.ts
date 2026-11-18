import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { factCheckQueryCandidates } from './fact-check-queries';
import { FactCheckClaim, FactCheckLookup } from './fact-check.models';
import {
  FACT_CHECK_CONFIG_URL,
  FACT_CHECK_SEARCH_URL,
  FactCheckService,
} from './fact-check.service';

function isFactCheckRequest(request: HttpRequest<unknown>, query?: string): boolean {
  const url = request.urlWithParams.startsWith(FACT_CHECK_SEARCH_URL)
    ? request.urlWithParams
    : request.url;
  if (!url.startsWith(FACT_CHECK_SEARCH_URL)) {
    return false;
  }
  if (!query) {
    return true;
  }
  return request.params.get('query') === query || new URL(url).searchParams.get('query') === query;
}

const claim: FactCheckClaim = {
  text: 'Onet published an AI image.',
  claimant: 'Social media users',
  claimReview: [
    {
      publisher: { name: 'Demagog', site: 'demagog.org.pl' },
      url: 'https://demagog.org.pl/fake_news/onet-ai/',
      title: 'Onet published an AI image',
      reviewDate: '2024-03-15T12:00:00Z',
      textualRating: 'Fałsz',
      languageCode: 'pl',
    },
    {
      publisher: { name: 'AFP', site: 'factcheck.afp.com' },
      url: 'javascript:alert(1)',
      textualRating: 'False',
    },
  ],
};

describe('FactCheckService', () => {
  let service: FactCheckService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({ lang: 'pl', fallbackLang: 'en' }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(FactCheckService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('reports a missing config file without calling the fact-check API', () => {
    let lookup: FactCheckLookup | undefined;
    service.search('https://onet.pl/artykul').subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(lookup?.status).toBe('no-key');
    expect(lookup?.reviews).toEqual([]);
    http.expectNone((outgoing) => isFactCheckRequest(outgoing));
  });

  it('reports an empty api key without calling the fact-check API', () => {
    let lookup: FactCheckLookup | undefined;
    service.search('https://onet.pl/artykul').subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: '   ' });

    expect(lookup?.status).toBe('no-key');
    http.expectNone((outgoing) => isFactCheckRequest(outgoing));
  });

  it('maps a URL hit and does not fall through to the domain', () => {
    const link = 'https://demagog.org.pl/fake_news/onet-ai';
    let lookup: FactCheckLookup | undefined;
    service.search(link).subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    const request = http.expectOne((outgoing) => isFactCheckRequest(outgoing));

    expect(request.request.params.get('key')).toBe('test-key');
    expect(request.request.params.get('query')).toBe('https://demagog.org.pl/fake_news/onet-ai');
    expect(request.request.params.get('languageCode')).toBe('pl');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.has('reviewPublisherSiteFilter')).toBe(false);

    request.flush({ claims: [claim, claim] });

    expect(lookup?.status).toBe('results');
    expect(lookup?.fellBackToDomain).toBe(false);
    expect(lookup?.matchedQuery).toBe('https://demagog.org.pl/fake_news/onet-ai');
    expect(lookup?.reviews).toEqual([
      {
        trackId: '0-https://demagog.org.pl/fake_news/onet-ai/',
        claimText: 'Onet published an AI image.',
        claimant: 'Social media users',
        publisherName: 'Demagog',
        textualRating: 'Fałsz',
        reviewDate: '2024-03-15T12:00:00Z',
        reviewUrl: 'https://demagog.org.pl/fake_news/onet-ai/',
      },
    ]);
    http.expectNone((outgoing) => isFactCheckRequest(outgoing));
  });

  it('does not search the parent site when the article URL has no review', () => {
    const link = 'https://przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx';
    let lookup: FactCheckLookup | undefined;
    service.search(link).subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });

    for (const candidate of factCheckQueryCandidates(link)) {
      expect(candidate.query).not.toBe('onet.pl');
      http
        .expectOne((outgoing) => isFactCheckRequest(outgoing, candidate.query))
        .flush({ claims: [] });
    }

    expect(lookup).toEqual({
      status: 'empty',
      reviews: [],
      matchedQuery: null,
      fellBackToDomain: false,
    });
    http.expectNone((outgoing) => isFactCheckRequest(outgoing, 'onet.pl'));
  });

  it('reports nothing found when every query is empty', () => {
    const link = 'https://example.com/story';
    let lookup: FactCheckLookup | undefined;
    service.search(link).subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    for (const candidate of factCheckQueryCandidates(link)) {
      http.expectOne((outgoing) => isFactCheckRequest(outgoing, candidate.query)).flush({});
    }

    expect(lookup).toEqual({
      status: 'empty',
      reviews: [],
      matchedQuery: null,
      fellBackToDomain: false,
    });
  });

  it('reports an error when the fact-check API fails', () => {
    let lookup: FactCheckLookup | undefined;
    service.search('https://onet.pl/artykul').subscribe((result) => {
      lookup = result;
    });

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'bad-key' });
    http
      .expectOne((outgoing) => isFactCheckRequest(outgoing))
      .flush(
        { error: { message: 'API key not valid' } },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(lookup?.status).toBe('error');
    expect(lookup?.reviews).toEqual([]);
  });

  it('sends languageCode en when the UI language is English', () => {
    TestBed.inject(TranslateService).use('en');

    service.search('https://www.snopes.com/fact-check/example').subscribe();

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    const request = http.expectOne((outgoing) =>
      isFactCheckRequest(outgoing, 'https://www.snopes.com/fact-check/example'),
    );
    expect(request.request.params.get('languageCode')).toBe('en');
    request.flush({ claims: [] });

    http
      .expectOne((outgoing) =>
        isFactCheckRequest(outgoing, 'https://snopes.com/fact-check/example'),
      )
      .flush({ claims: [] });
    http
      .expectOne((outgoing) => isFactCheckRequest(outgoing, 'snopes.com/fact-check/example'))
      .flush({ claims: [claim] });
  });
});
