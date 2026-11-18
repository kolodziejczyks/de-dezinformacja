import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import EN from '../../../public/i18n/en.json';
import { getElementByTestId, typeInto } from '../../../testing';
import { BaseCheckService } from '../services/base-check.service';
import { DomainCheckState } from '../services/domain-check';
import { NewsSearch } from './news-search';

class FakeBaseCheckService {
  readonly state = signal<DomainCheckState>({ status: 'idle' });
  readonly checked: string[] = [];

  check(rawLink: string): void {
    this.checked.push(rawLink);
  }
}

describe('NewsSearch', () => {
  let component: NewsSearch;
  let fixture: ComponentFixture<NewsSearch>;
  let checks: FakeBaseCheckService;

  beforeEach(async () => {
    checks = new FakeBaseCheckService();
    await TestBed.configureTestingModule({
      imports: [NewsSearch],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: BaseCheckService, useValue: checks },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', EN);
    translate.use('en');

    fixture = TestBed.createComponent(NewsSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes successfully', () => {
    expect(component).toBeTruthy();
  });

  it('initially, news input is visible', () => {
    const input = getElementByTestId(fixture, 'news-search-input');

    expect(input.nativeElement).toBeTruthy();
  });

  it('initially, no errors are visible', () => {
    const reqError = getElementByTestId(fixture, 'news-search-req-error');
    const urlError = getElementByTestId(fixture, 'news-search-www-error');

    expect(reqError).not.toBeTruthy();
    expect(urlError).not.toBeTruthy();
  });

  it('given that input is touched but nothing is typed, required error is visible', () => {
    typeInto(fixture, 'news-search-input', '');

    const reqError = getElementByTestId(fixture, 'news-search-req-error');

    expect(reqError).toBeTruthy();
  });

  it('given that incorrect url is provided, www error is visible', () => {
    typeInto(fixture, 'news-search-input', 'dupa');

    const wwwError = getElementByTestId(fixture, 'news-search-www-error');

    expect(wwwError).toBeTruthy();
  });

  it('given that correct url is provided, www error is not visible', () => {
    typeInto(fixture, 'news-search-input', 'dupa.com');

    const wwwError = getElementByTestId(fixture, 'news-search-www-error');

    expect(wwwError).not.toBeTruthy();
  });

  it('accepts realistic article links, including commas, fragments, IDN, and pasted whitespace', () => {
    for (const link of [
      'nyt.com/weird-article',
      'https://www.BBC.co.uk/news/world-123?at_medium=RSS#top',
      'tvn24.pl/swiat/artykul,123',
      'https://example.online:8443/a-long-hyphenated-path?id=1&x=2#top',
      'https://wyborcza.pl/7,75398,33136776,polska-nie-przekaze-dodatkowych-srodkow-na-program-purl-wspierajacy.html#s=S.TD-K.C-B.1-L.1.duzy',
      'https://przegladsportowy.onet.pl/siatkowka/tauron-liga-siatkarzy/wilfredo-leon-zmienil-zdanie-ws-transferu-taka-zaplaci-kare-znamy-kulisy/wh8ylrx',
      '  https://wyborcza.pl/a  ',
      'żółw.pl',
      'https://пример.рф/новость',
    ]) {
      typeInto(fixture, 'news-search-input', link);

      expect(getElementByTestId(fixture, 'news-search-www-error')).not.toBeTruthy();
      expect(component.newsFormControl.valid).toBe(true);
    }
  });

  it('treats a whitespace-only value as a missing link', () => {
    typeInto(fixture, 'news-search-input', '   ');

    expect(getElementByTestId(fixture, 'news-search-req-error')).toBeTruthy();
    expect(getElementByTestId(fixture, 'news-search-www-error')).not.toBeTruthy();
  });

  it('rejects non-http schemes', () => {
    typeInto(fixture, 'news-search-input', 'javascript:alert(1)');

    expect(getElementByTestId(fixture, 'news-search-www-error')).toBeTruthy();
    expect(component.newsFormControl.hasError('newsLink')).toBe(true);
  });

  it('uses a text input so scheme-less links are not blocked by the browser URL type', () => {
    const input = getElementByTestId(fixture, 'news-search-input');

    expect(input.nativeElement.type).toBe('text');
    expect(input.nativeElement.getAttribute('inputmode')).toBe('url');
  });

  it('submits the link from the search button and the enter key', () => {
    typeInto(fixture, 'news-search-input', 'https://www.bbc.co.uk/news');

    getElementByTestId(fixture, 'news-search-submit').nativeElement.click();

    expect(checks.checked).toEqual(['https://www.bbc.co.uk/news']);

    typeInto(fixture, 'news-search-input', 'tvn24.pl/swiat/artykul,123');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(checks.checked).toEqual(['https://www.bbc.co.uk/news', 'tvn24.pl/swiat/artykul,123']);
  });

  it('trims surrounding whitespace before looking the link up', () => {
    typeInto(fixture, 'news-search-input', '  https://www.bbc.co.uk/news \n');

    getElementByTestId(fixture, 'news-search-submit').nativeElement.click();

    expect(checks.checked).toEqual(['https://www.bbc.co.uk/news']);
    expect(component.newsFormControl.value).toBe('https://www.bbc.co.uk/news');
  });

  it('does not look up an invalid link', () => {
    typeInto(fixture, 'news-search-input', 'dupa');
    getElementByTestId(fixture, 'news-search-submit').nativeElement.click();

    expect(checks.checked).toEqual([]);
  });

  it('shows registration data returned by the check', () => {
    checks.state.set({
      status: 'success',
      result: {
        domain: 'tvn24.pl',
        registrar: 'premium.pl Sp. z o.o.',
        registeredAt: '2000-09-06T11:00:00Z',
        age: { years: 26, days: 73 },
        expiresAt: '2027-09-05T12:00:00Z',
        updatedAt: '2026-08-11T15:15:46Z',
        registrantOrganization: 'TVN S.A.',
        registrantCountry: 'PL',
        nameservers: ['ns-951.awsdns-54.net'],
        status: ['registered'],
      },
    });
    fixture.detectChanges();

    const domain = getElementByTestId(fixture, 'news-search-domain');
    expect(domain.nativeElement.textContent).toContain('tvn24.pl');
    expect(domain.nativeElement.getAttribute('role')).toBe('heading');
    expect(domain.nativeElement.getAttribute('aria-level')).toBe('2');
    expect(
      getElementByTestId(fixture, 'news-search-registrar').nativeElement.textContent,
    ).toContain('premium.pl Sp. z o.o.');
    expect(
      getElementByTestId(fixture, 'news-search-registered').nativeElement.textContent,
    ).toContain('2000-09-06');
    expect(getElementByTestId(fixture, 'news-search-age').nativeElement.textContent).toContain(
      '26 years, 73 days',
    );
    expect(
      getElementByTestId(fixture, 'news-search-organization').nativeElement.textContent,
    ).toContain('TVN S.A.');
    expect(getElementByTestId(fixture, 'news-search-country').nativeElement.textContent).toContain(
      'PL',
    );
    expect(
      getElementByTestId(fixture, 'news-search-nameservers').nativeElement.textContent,
    ).toContain('ns-951.awsdns-54.net');
    expect(getElementByTestId(fixture, 'news-search-young')).not.toBeTruthy();
    expect(getElementByTestId(fixture, 'news-search-owner-hidden')).not.toBeTruthy();
  });

  it('marks a domain under a year old and a registrant with no published organization', () => {
    checks.state.set({
      status: 'success',
      result: {
        domain: 'fresh.example',
        registrar: null,
        registeredAt: '2026-11-01T00:00:00Z',
        age: { years: 0, days: 17 },
        expiresAt: null,
        updatedAt: null,
        registrantOrganization: null,
        registrantCountry: null,
        nameservers: [],
        status: [],
      },
    });
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'news-search-young').nativeElement.textContent).toContain(
      'less than a year',
    );
    expect(
      getElementByTestId(fixture, 'news-search-owner-hidden').nativeElement.textContent,
    ).toContain('Owner not published');
    expect(getElementByTestId(fixture, 'news-search-age').nativeElement.textContent).toContain(
      '0 years, 17 days',
    );
  });

  it('shows a message when the TLD has no registration service', () => {
    checks.state.set({ status: 'error', domain: 'example.zzz', kind: 'unsupported' });
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'news-search-error').nativeElement.textContent).toContain(
      'No registration service is available',
    );
  });

  it('shows a loading state', () => {
    checks.state.set({ status: 'loading', domain: 'bbc.co.uk' });
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'news-search-loading').nativeElement.textContent).toContain(
      'Looking up registration data',
    );
    expect(
      getElementByTestId(fixture, 'news-search-result').nativeElement.getAttribute('aria-busy'),
    ).toBe('true');
  });
});
