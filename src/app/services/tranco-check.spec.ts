import { parseTrancoResponse, trancoRankUrl } from './tranco-check';

describe('parseTrancoResponse', () => {
  it('keeps the newest rank when the days are not sorted', () => {
    expect(
      parseTrancoResponse(
        {
          domain: 'tvn24.pl',
          ranks: [
            { date: '2026-11-17', rank: 5643 },
            { date: '2026-11-18', rank: 5669 },
            { date: '2026-11-16', rank: 5638 },
          ],
        },
        'tvn24.pl',
      ),
    ).toEqual({ domain: 'tvn24.pl', rank: 5669, date: '2026-11-18' });
  });

  it('treats a rank past the top million as unlisted', () => {
    expect(
      parseTrancoResponse({ ranks: [{ date: '2026-10-22', rank: 4_514_372 }] }, '020km.com'),
    ).toEqual({ domain: '020km.com', rank: null, date: null });
    expect(
      parseTrancoResponse({ ranks: [{ date: '2026-11-18', rank: 1_000_000 }] }, 'edge.example'),
    ).toEqual({ domain: 'edge.example', rank: 1_000_000, date: '2026-11-18' });
  });

  it('treats an empty list as unlisted and rejects a broken payload', () => {
    expect(parseTrancoResponse({ ranks: [] }, 'example.test')).toEqual({
      domain: 'example.test',
      rank: null,
      date: null,
    });
    expect(parseTrancoResponse({ ranks: [{ date: '2026-11-18' }] }, 'example.test')).toEqual({
      domain: 'example.test',
      rank: null,
      date: null,
    });
    expect(parseTrancoResponse(null, 'example.test')).toBeNull();
    expect(parseTrancoResponse({ domain: 'example.test' }, 'example.test')).toBeNull();
  });
});

describe('trancoRankUrl', () => {
  it('asks for one domain', () => {
    expect(trancoRankUrl('tvn24.pl')).toBe('https://tranco-list.eu/api/ranks/domain/tvn24.pl');
  });
});
