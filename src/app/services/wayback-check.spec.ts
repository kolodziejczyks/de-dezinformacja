import { articleTargets, parseCdx, waybackApiUrl } from './wayback-check';

describe('articleTargets', () => {
  it('uses the registrable domain, and the exact URL only when there is a path', () => {
    expect(articleTargets('https://www.tvn24.pl/')).toEqual({
      domain: 'tvn24.pl',
      pageUrl: null,
    });
    expect(articleTargets('tvn24.pl')).toEqual({ domain: 'tvn24.pl', pageUrl: null });
    expect(articleTargets('https://sport.tvn24.pl/polska?x=1#top')).toEqual({
      domain: 'tvn24.pl',
      pageUrl: 'sport.tvn24.pl/polska?x=1',
    });
    expect(articleTargets('not a url')).toBeNull();
  });
});

describe('waybackApiUrl', () => {
  it('asks the same-origin proxy for one URL', () => {
    expect(waybackApiUrl('tvn24.pl/')).toBe('/api/wayback?target=tvn24.pl%2F');
    expect(waybackApiUrl('sport.tvn24.pl/polska?x=1')).toBe(
      '/api/wayback?target=sport.tvn24.pl%2Fpolska%3Fx%3D1',
    );
  });
});

describe('parseCdx', () => {
  it('reads the first data row and builds an archive link', () => {
    expect(
      parseCdx([
        ['timestamp', 'original', 'statuscode'],
        ['20010923151602', 'http://www.tvn24.pl:80/', '200'],
      ]),
    ).toEqual({
      status: 'capture',
      capture: {
        timestamp: '20010923151602',
        date: '2001-09-23',
        original: 'http://www.tvn24.pl:80/',
        archiveUrl: 'https://web.archive.org/web/20010923151602/http://www.tvn24.pl:80/',
      },
    });
  });

  it('treats an empty index as no capture and a broken payload as unusable', () => {
    expect(parseCdx([])).toEqual({ status: 'none' });
    expect(parseCdx([['timestamp', 'original']])).toEqual({ status: 'none' });
    expect(parseCdx({ error: 'nope' })).toBeNull();
    expect(parseCdx([['timestamp'], ['not-a-time', 'http://example/']])).toBeNull();
  });
});
