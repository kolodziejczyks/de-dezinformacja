import { factCheckQueryCandidates } from './fact-check-queries';

describe('factCheckQueryCandidates', () => {
  it('searches only the article address, not the parent site', () => {
    expect(
      factCheckQueryCandidates(
        'https://przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx?utm_source=x',
      ),
    ).toEqual([
      {
        query: 'https://przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx',
        kind: 'url',
      },
      { query: 'przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx', kind: 'url' },
    ]);
  });

  it('strips www from an article URL and does not add the bare host', () => {
    expect(factCheckQueryCandidates('https://www.news.bbc.co.uk/article/')).toEqual([
      { query: 'https://www.news.bbc.co.uk/article', kind: 'url' },
      { query: 'https://news.bbc.co.uk/article', kind: 'url' },
      { query: 'news.bbc.co.uk/article', kind: 'url' },
    ]);
  });

  it('searches a bare domain when the link has no path', () => {
    expect(factCheckQueryCandidates('onet.pl')).toEqual([{ query: 'onet.pl', kind: 'domain' }]);
    expect(factCheckQueryCandidates('https://www.wyborcza.pl/')).toEqual([
      { query: 'wyborcza.pl', kind: 'domain' },
    ]);
  });

  it('keeps commas and a fragment in an article path, without the fragment', () => {
    expect(
      factCheckQueryCandidates(
        'https://wyborcza.pl/7,75398,33136776,polska-nie-przekaze.html#s=S.TD-K.C-B.1-L.1.duzy',
      ),
    ).toEqual([
      {
        query: 'https://wyborcza.pl/7,75398,33136776,polska-nie-przekaze.html',
        kind: 'url',
      },
      { query: 'wyborcza.pl/7,75398,33136776,polska-nie-przekaze.html', kind: 'url' },
    ]);
  });

  it('returns nothing for a blank or unusable value', () => {
    expect(factCheckQueryCandidates('   ')).toEqual([]);
    expect(factCheckQueryCandidates('not a link')).toEqual([]);
  });
});
