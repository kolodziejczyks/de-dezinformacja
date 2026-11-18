import { HttpErrorResponse } from '@angular/common/http';
import {
  classifyFactCheckError,
  factCheckQueries,
  mapFactChecks,
  type FactCheckSearchResponse,
} from './fact-check';

const sample: FactCheckSearchResponse = {
  claims: [
    {
      text: ' The election was stolen. ',
      claimant: 'A politician',
      claimReview: [
        {
          publisher: { name: 'Demagog', site: 'demagog.org.pl' },
          url: 'https://demagog.org.pl/wypowiedzi/example',
          textualRating: 'Fałsz',
          reviewDate: '2024-03-01T12:00:00Z',
        },
        {
          publisher: { name: 'AFP', site: 'faktencheck.afp.com' },
          url: 'https://faktencheck.afp.com/example',
          textualRating: 'False',
          reviewDate: '2024-03-02T00:00:00Z',
        },
      ],
    },
    {
      text: 'The election was stolen.',
      claimReview: [
        {
          url: 'https://demagog.org.pl/wypowiedzi/example',
          textualRating: 'Fałsz',
        },
      ],
    },
  ],
};

describe('factCheckQueries', () => {
  it('uses the absolute article URL and the www-stripped domain', () => {
    expect(factCheckQueries('https://www.BBC.co.uk/news/world-123?at_medium=RSS#top')).toEqual({
      url: 'https://www.bbc.co.uk/news/world-123?at_medium=RSS',
      domain: 'bbc.co.uk',
    });
    expect(factCheckQueries('nyt.com/weird-article')).toEqual({
      url: 'https://nyt.com/weird-article',
      domain: 'nyt.com',
    });
  });

  it('rejects links that are not news URLs', () => {
    expect(factCheckQueries('javascript:alert(1)')).toBeNull();
  });
});

describe('mapFactChecks', () => {
  it('maps claim text, claimant, publisher, rating, date, and review URL', () => {
    expect(mapFactChecks(sample)).toEqual([
      {
        claimText: 'The election was stolen.',
        claimant: 'A politician',
        publisher: 'Demagog',
        textualRating: 'Fałsz',
        reviewDate: '2024-03-01T12:00:00Z',
        reviewUrl: 'https://demagog.org.pl/wypowiedzi/example',
      },
      {
        claimText: 'The election was stolen.',
        claimant: 'A politician',
        publisher: 'AFP',
        textualRating: 'False',
        reviewDate: '2024-03-02T00:00:00Z',
        reviewUrl: 'https://faktencheck.afp.com/example',
      },
    ]);
  });

  it('returns an empty list when the API has no claims', () => {
    expect(mapFactChecks({})).toEqual([]);
    expect(mapFactChecks(null)).toEqual([]);
  });
});

describe('classifyFactCheckError', () => {
  it('separates a rejected key, rate limit, and network failure', () => {
    expect(classifyFactCheckError(new HttpErrorResponse({ status: 403 }))).toBe('unauthorized');
    expect(classifyFactCheckError(new HttpErrorResponse({ status: 401 }))).toBe('unauthorized');
    expect(classifyFactCheckError(new HttpErrorResponse({ status: 429 }))).toBe('rate-limit');
    expect(classifyFactCheckError(new HttpErrorResponse({ status: 0 }))).toBe('network');
    expect(classifyFactCheckError(new HttpErrorResponse({ status: 500 }))).toBe('unavailable');
  });
});
