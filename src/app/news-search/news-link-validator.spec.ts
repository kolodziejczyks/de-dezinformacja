import { FormControl } from '@angular/forms';
import { newsLinkValidator } from './news-link-validator';

const validLinks = [
  'nyt.com/weird-article',
  'https://www.BBC.co.uk/news/world-123?at_medium=RSS#top',
  'http://www.BBC.co.uk/news/world-123?id=1&x=2#top',
  'tvn24.pl/swiat/artykul,123',
  'HTTPS://Example.COM/A-Very-Long-Hyphenated-Path',
  'https://example.online/story',
  'https://example.museum/exhibit',
  'news.example.com:8443/section/article-name',
  'https://sub.domain.example.co.uk/path',
  'dupa.com',
];

const invalidLinks = [
  'dupa',
  'hello world',
  'not a url',
  'http://foo',
  'https://localhost/news',
  'javascript:alert(1)',
  'JavaScript:alert(1)',
  'ftp://example.com/file',
  'mailto:editor@example.com',
  'data:text/html,hi',
  'http://',
  'https://',
  '.com',
  'example.',
  'example..com',
  'just.x',
  ' http://example.com',
  'http://example.com ',
  'http://1.2.3.4/news',
];

describe('newsLinkValidator', () => {
  it('accepts realistic article links', () => {
    expect(validLinks.map((value) => [value, newsLinkValidator(new FormControl(value))])).toEqual(
      validLinks.map((value) => [value, null]),
    );
  });

  it('rejects junk, missing TLDs, spaces, and non-http schemes', () => {
    expect(invalidLinks.map((value) => [value, newsLinkValidator(new FormControl(value))])).toEqual(
      invalidLinks.map((value) => [value, { newsLink: true }]),
    );
  });

  it('leaves empty values to the required validator', () => {
    expect(newsLinkValidator(new FormControl(''))).toBeNull();
    expect(newsLinkValidator(new FormControl(null))).toBeNull();
  });
});
