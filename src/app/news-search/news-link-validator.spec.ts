import { FormControl } from '@angular/forms';
import { newsLinkValidator, requiredNewsLink } from './news-link-validator';

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
  'https://wyborcza.pl/7,75398,33136776,polska-nie-przekaze-dodatkowych-srodkow-na-program-purl-wspierajacy.html#s=S.TD-K.C-B.1-L.1.duzy',
  'https://przegladsportowy.onet.pl/siatkowka/tauron-liga-siatkarzy/wilfredo-leon-zmienil-zdanie-ws-transferu-taka-zaplaci-kare-znamy-kulisy/wh8ylrx',
  'https://example.com/nie-przeka%C5%BCe.html?x=1&y=2',
  'https://example.com/nie-przekaże.html',
  'https://example.com/article/',
  'example.com/article/',
  '  https://wyborcza.pl/a  ',
  'https://wyborcza.pl/a\n',
  '\thttps://example.com/path?q=ząb#frag',
  'żółw.pl',
  'HTTPS://ŻÓŁW.PL/Ścieżka',
  'https://www.żółw.pl/artykuł',
  'https://пример.рф/новость',
  'news.example.com.pl:8080/a/?q=1#top',
  'https://m.wyborcza.pl/7,75398,1.html',
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
  'http://example .com',
  'http://1.2.3.4/news',
  'http://[::1]/news',
  'https://-example.com',
  'https://example-.com',
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

  it('leaves empty and whitespace-only values to the required validator', () => {
    expect(newsLinkValidator(new FormControl(''))).toBeNull();
    expect(newsLinkValidator(new FormControl('  \n'))).toBeNull();
    expect(newsLinkValidator(new FormControl(null))).toBeNull();
    expect(requiredNewsLink(new FormControl(''))).toEqual({ required: true });
    expect(requiredNewsLink(new FormControl('   '))).toEqual({ required: true });
    expect(requiredNewsLink(new FormControl('https://example.com'))).toBeNull();
  });
});
