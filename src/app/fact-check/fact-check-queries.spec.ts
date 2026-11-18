import { factCheckQueryCandidates } from './fact-check-queries';

describe('factCheckQueryCandidates', () => {
  it('tries the article URL before the registrable domain', () => {
    expect(factCheckQueryCandidates('https://wiadomosci.onet.pl/swiat/story?utm_source=x')).toEqual(
      [
        { query: 'https://wiadomosci.onet.pl/swiat/story', kind: 'url' },
        { query: 'wiadomosci.onet.pl/swiat/story', kind: 'url' },
        { query: 'wiadomosci.onet.pl', kind: 'domain' },
        { query: 'onet.pl', kind: 'domain' },
      ],
    );
  });

  it('strips www and keeps a co.uk registrable domain', () => {
    expect(factCheckQueryCandidates('https://www.news.bbc.co.uk/article/')).toEqual([
      { query: 'https://www.news.bbc.co.uk/article', kind: 'url' },
      { query: 'https://news.bbc.co.uk/article', kind: 'url' },
      { query: 'news.bbc.co.uk/article', kind: 'url' },
      { query: 'news.bbc.co.uk', kind: 'domain' },
      { query: 'bbc.co.uk', kind: 'domain' },
    ]);
  });

  it('searches a bare domain when the link has no path', () => {
    expect(factCheckQueryCandidates('onet.pl')).toEqual([{ query: 'onet.pl', kind: 'domain' }]);
    expect(factCheckQueryCandidates('https://www.wyborcza.pl/')).toEqual([
      { query: 'wyborcza.pl', kind: 'domain' },
    ]);
  });

  it('returns nothing for a blank or unusable value', () => {
    expect(factCheckQueryCandidates('   ')).toEqual([]);
    expect(factCheckQueryCandidates('not a link')).toEqual([]);
  });
});
