import { HttpErrorResponse } from '@angular/common/http';
import {
  classifyRdapError,
  domainAge,
  extractDomain,
  mapRdapDomain,
  pluralCategory,
  type RdapDomain,
} from './domain-check';

const tvn24: RdapDomain = {
  ldhName: 'tvn24.pl',
  nask0_state: 'registered',
  events: [
    { eventAction: 'registration', eventDate: '2000-09-06T11:00:00Z' },
    { eventAction: 'last changed', eventDate: '2026-08-11T15:15:46Z' },
    { eventAction: 'last update of RDAP database', eventDate: '2026-11-18T20:35:16Z' },
    { eventAction: 'expiration', eventDate: '2027-09-05T12:00:00Z' },
  ],
  nameservers: [{ ldhName: 'ns-951.awsdns-54.net' }, { ldhName: 'NS-5.AWSDNS-00.COM.' }],
  entities: [
    {
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['fn', {}, 'text', 'TVN S.A.'],
          ['kind', {}, 'text', 'org'],
          ['org', {}, 'text', ''],
          ['adr', { cc: 'PL' }, 'text', ['', '', 'Wiertnicza 166', 'Warszawa', '', '02-952', '']],
        ],
      ],
    },
    {
      roles: ['registrar'],
      vcardArray: ['vcard', [['fn', {}, 'text', 'premium.pl Sp. z o.o.']]],
    },
  ],
};

describe('extractDomain', () => {
  it('reads the host from scheme-less links and strips www', () => {
    expect(extractDomain('nyt.com/weird-article')).toBe('nyt.com');
    expect(extractDomain('https://www.BBC.co.uk/news/world-123?at_medium=RSS#top')).toBe(
      'bbc.co.uk',
    );
    expect(extractDomain('tvn24.pl/swiat/artykul,123')).toBe('tvn24.pl');
    expect(extractDomain('https://news.example.com:8443/a-long-path')).toBe('news.example.com');
  });

  it('rejects links that are not news URLs', () => {
    expect(extractDomain('javascript:alert(1)')).toBeNull();
    expect(extractDomain('not a url')).toBeNull();
  });
});

describe('mapRdapDomain', () => {
  const now = new Date('2026-11-18T20:45:00Z');

  it('maps a .pl record, including NASK status and the address country code', () => {
    expect(mapRdapDomain(tvn24, 'tvn24.pl', now)).toEqual({
      domain: 'tvn24.pl',
      registrar: 'premium.pl Sp. z o.o.',
      registeredAt: '2000-09-06T11:00:00Z',
      age: domainAge('2000-09-06T11:00:00Z', now),
      expiresAt: '2027-09-05T12:00:00Z',
      updatedAt: '2026-08-11T15:15:46Z',
      registrantOrganization: 'TVN S.A.',
      registrantCountry: 'PL',
      nameservers: ['ns-951.awsdns-54.net', 'ns-5.awsdns-00.com'],
      status: ['registered'],
    });
  });

  it('leaves registrant fields empty when the registry does not publish them', () => {
    const result = mapRdapDomain(
      {
        ldhName: 'NYTIMES.COM',
        status: ['client transfer prohibited'],
        events: [{ eventAction: 'registration', eventDate: '1994-01-18T05:00:00Z' }],
        entities: [
          {
            roles: ['registrar'],
            vcardArray: ['vcard', [['fn', {}, 'text', 'MarkMonitor Inc.']]],
          },
        ],
        nameservers: [],
      },
      'nytimes.com',
      now,
    );

    expect(result.domain).toBe('nytimes.com');
    expect(result.registrar).toBe('MarkMonitor Inc.');
    expect(result.registrantOrganization).toBeNull();
    expect(result.registrantCountry).toBeNull();
    expect(result.status).toEqual(['client transfer prohibited']);
  });
});

describe('domainAge', () => {
  it('counts full years and the days since the last anniversary', () => {
    expect(domainAge('2000-09-06T11:00:00Z', new Date('2026-11-18T20:45:00Z'))).toEqual({
      years: 26,
      days: 73,
    });
  });

  it('returns null for an unparseable date', () => {
    expect(domainAge('not-a-date', new Date('2026-11-18T00:00:00Z'))).toBeNull();
  });
});

describe('pluralCategory', () => {
  it('uses Polish plural groups', () => {
    expect(pluralCategory(1, 'pl')).toBe('ONE');
    expect(pluralCategory(2, 'pl')).toBe('FEW');
    expect(pluralCategory(5, 'pl')).toBe('MANY');
    expect(pluralCategory(12, 'pl')).toBe('MANY');
    expect(pluralCategory(22, 'pl')).toBe('FEW');
  });

  it('uses English singular and plural', () => {
    expect(pluralCategory(1, 'en')).toBe('ONE');
    expect(pluralCategory(0, 'en')).toBe('MANY');
  });
});

describe('classifyRdapError', () => {
  it('distinguishes unsupported TLDs, missing domains, rate limits, and network failures', () => {
    expect(
      classifyRdapError(
        new HttpErrorResponse({
          status: 404,
          error: { title: 'No RDAP service is available for this resource' },
        }),
      ),
    ).toBe('unsupported');
    expect(classifyRdapError(new HttpErrorResponse({ status: 404, error: {} }))).toBe('not-found');
    expect(classifyRdapError(new HttpErrorResponse({ status: 429 }))).toBe('rate-limit');
    expect(classifyRdapError(new HttpErrorResponse({ status: 0 }))).toBe('network');
    expect(classifyRdapError(new HttpErrorResponse({ status: 503 }))).toBe('unavailable');
  });
});
