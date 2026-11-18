import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import EN from '../../../public/i18n/en.json';
import { getElementByTestId, typeInto } from '../../../testing';
import { BaseCheckService } from '../services/base-check.service';
import { DomainCheckState } from '../services/domain-check';
import { FactCheckState } from '../services/fact-check';
import { FactCheckService } from '../services/fact-check.service';
import { NewsSearch } from './news-search';

class FakeBaseCheckService {
  readonly state = signal<DomainCheckState>({ status: 'idle' });
  readonly checked: string[] = [];

  check(rawLink: string): void {
    this.checked.push(rawLink);
  }
}

class FakeFactCheckService {
  readonly state = signal<FactCheckState>({ status: 'idle' });
  readonly checked: { link: string; language: string }[] = [];

  check(link: string, language: 'pl' | 'en'): void {
    this.checked.push({ link, language });
  }
}

describe('NewsSearch', () => {
  let component: NewsSearch;
  let fixture: ComponentFixture<NewsSearch>;
  let checks: FakeBaseCheckService;
  let factChecks: FakeFactCheckService;

  beforeEach(async () => {
    checks = new FakeBaseCheckService();
    factChecks = new FakeFactCheckService();
    await TestBed.configureTestingModule({
      imports: [NewsSearch],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' }),
        { provide: BaseCheckService, useValue: checks },
        { provide: FactCheckService, useValue: factChecks },
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

  it('accepts article links with a query, fragment, uppercase host, or no scheme', () => {
    for (const link of [
      'nyt.com/weird-article',
      'https://www.BBC.co.uk/news/world-123?at_medium=RSS#top',
      'tvn24.pl/swiat/artykul,123',
      'https://example.online:8443/a-long-hyphenated-path?id=1&x=2#top',
    ]) {
      typeInto(fixture, 'news-search-input', link);

      expect(getElementByTestId(fixture, 'news-search-www-error')).not.toBeTruthy();
      expect(component.newsFormControl.valid).toBe(true);
    }
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
    expect(factChecks.checked).toEqual([{ link: 'https://www.bbc.co.uk/news', language: 'en' }]);

    typeInto(fixture, 'news-search-input', 'tvn24.pl/swiat/artykul,123');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(checks.checked).toEqual(['https://www.bbc.co.uk/news', 'tvn24.pl/swiat/artykul,123']);
    expect(factChecks.checked).toEqual([
      { link: 'https://www.bbc.co.uk/news', language: 'en' },
      { link: 'tvn24.pl/swiat/artykul,123', language: 'en' },
    ]);
  });

  it('searches fact checks again when the UI language changes', () => {
    typeInto(fixture, 'news-search-input', 'https://www.bbc.co.uk/news');
    getElementByTestId(fixture, 'news-search-submit').nativeElement.click();

    TestBed.inject(TranslateService).use('pl');

    expect(factChecks.checked).toEqual([
      { link: 'https://www.bbc.co.uk/news', language: 'en' },
      { link: 'https://www.bbc.co.uk/news', language: 'pl' },
    ]);
  });

  it('does not look up an invalid link', () => {
    typeInto(fixture, 'news-search-input', 'dupa');
    getElementByTestId(fixture, 'news-search-submit').nativeElement.click();

    expect(checks.checked).toEqual([]);
    expect(factChecks.checked).toEqual([]);
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

    expect(getElementByTestId(fixture, 'news-search-domain').nativeElement.textContent).toContain(
      'tvn24.pl',
    );
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
  });

  it('shows matching fact checks', () => {
    factChecks.state.set({
      status: 'success',
      reviews: [
        {
          claimText: 'The election was stolen.',
          claimant: 'A politician',
          publisher: 'Demagog',
          textualRating: 'Fałsz',
          reviewDate: '2024-03-01T12:00:00Z',
          reviewUrl: 'https://demagog.org.pl/wypowiedzi/example',
        },
      ],
    });
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-claim').nativeElement.textContent).toContain(
      'The election was stolen.',
    );
    expect(getElementByTestId(fixture, 'fact-check-publisher').nativeElement.textContent).toContain(
      'Demagog',
    );
    expect(getElementByTestId(fixture, 'fact-check-rating').nativeElement.textContent).toContain(
      'Fałsz',
    );
    const link = getElementByTestId(fixture, 'fact-check-link').nativeElement as HTMLAnchorElement;
    expect(link.href).toBe('https://demagog.org.pl/wypowiedzi/example');
    expect(link.target).toBe('_blank');
  });

  it('explains when the fact-check API key is missing and when nothing matches', () => {
    factChecks.state.set({ status: 'missing-key' });
    fixture.detectChanges();
    expect(
      getElementByTestId(fixture, 'fact-check-missing-key').nativeElement.textContent,
    ).toContain('API key');

    factChecks.state.set({ status: 'empty' });
    fixture.detectChanges();
    expect(getElementByTestId(fixture, 'fact-check-empty').nativeElement.textContent).toContain(
      'No fact checks were found',
    );
  });
});
