import { describe, expect, it } from 'vitest';
import { domainsToCheck, matchDomains, parseDomainList } from './cert-list.ts';

const list = parseDomainList(`
Evil.Example
www.phishing.test
news.scam.example
a.b.gov.pl
żółw.pl

# not a domain
`);

describe('parseDomainList', () => {
  it('stores a lowercased host and both forms of an IDN', () => {
    expect(list.has('evil.example')).toBe(true);
    expect(list.has('żółw.pl')).toBe(true);
    expect(list.has('xn--w-uga1v8h.pl')).toBe(true);
    expect([...list].some((name) => name.startsWith('#'))).toBe(false);
  });
});

describe('domainsToCheck', () => {
  it('walks parents up to the registrable domain and stops before the public suffix', () => {
    expect(domainsToCheck('News.Evil.Example')).toEqual(['news.evil.example', 'evil.example']);
    expect(domainsToCheck('https://sport.tvn24.pl/polska')).toEqual(['sport.tvn24.pl', 'tvn24.pl']);
    expect(domainsToCheck('a.b.example.co.uk')).toEqual([
      'a.b.example.co.uk',
      'b.example.co.uk',
      'example.co.uk',
    ]);
    expect(domainsToCheck('news.example.com.pl')).toEqual([
      'news.example.com.pl',
      'example.com.pl',
    ]);
    expect(domainsToCheck('a.b.gov.pl')).toEqual(['a.b.gov.pl', 'b.gov.pl']);
    expect(domainsToCheck('www.gov.pl')).toEqual(['www.gov.pl']);
    expect(domainsToCheck('gov.pl')).toEqual(['gov.pl']);
  });

  it('accepts a unicode host and rejects a value that is not a domain', () => {
    expect(domainsToCheck('Żółw.pl')).toEqual(['xn--w-uga1v8h.pl']);
    expect(domainsToCheck('not a domain')).toEqual([]);
    expect(domainsToCheck('localhost')).toEqual([]);
    expect(domainsToCheck('')).toEqual([]);
  });
});

describe('matchDomains', () => {
  it('matches the host, a parent, the registrable domain, and a www alias', () => {
    expect(matchDomains(list, 'evil.example')?.matches).toEqual(['evil.example']);
    expect(matchDomains(list, 'a.news.scam.example')?.matches).toEqual(['news.scam.example']);
    expect(matchDomains(list, 'phishing.test')?.matches).toEqual(['www.phishing.test']);
    expect(matchDomains(list, 'www.phishing.test')?.matches).toEqual(['www.phishing.test']);
    expect(matchDomains(list, 'sub.a.b.gov.pl')?.matches).toEqual(['a.b.gov.pl']);
    expect(matchDomains(list, 'https://Żółw.pl/art')?.matches).toEqual(['xn--w-uga1v8h.pl']);
  });

  it('does not flag a parent when only a child is listed', () => {
    const found = matchDomains(list, 'example');
    expect(found).toBeNull();
    expect(matchDomains(list, 'scam.example')?.matches).toEqual([]);
    expect(matchDomains(list, 'other.example')?.matches).toEqual([]);
  });
});
