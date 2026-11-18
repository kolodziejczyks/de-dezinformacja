import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { getElementByTestId } from '../../../../testing';
import { LANGUAGE_STORAGE_KEY } from '../../services/language-service';
import en from '../../../../public/i18n/en.json';
import pl from '../../../../public/i18n/pl.json';
import { FACT_CHECK_CONFIG_URL, FACT_CHECK_SEARCH_URL } from '../fact-check.service';
import { FactCheckResults } from './fact-check-results';

function isFactCheckRequest(request: HttpRequest<unknown>, query?: string): boolean {
  const url = request.urlWithParams.startsWith(FACT_CHECK_SEARCH_URL)
    ? request.urlWithParams
    : request.url;
  if (!url.startsWith(FACT_CHECK_SEARCH_URL)) {
    return false;
  }
  if (!query) {
    return true;
  }
  return request.params.get('query') === query || new URL(url).searchParams.get('query') === query;
}

const requiredKeys = [
  'FACT_CHECK.HEADING',
  'FACT_CHECK.LOADING',
  'FACT_CHECK.NO_KEY',
  'FACT_CHECK.EMPTY',
  'FACT_CHECK.ERROR',
  'FACT_CHECK.MATCHED_DOMAIN',
  'FACT_CHECK.CLAIMANT',
  'FACT_CHECK.PUBLISHER',
  'FACT_CHECK.RATING',
  'FACT_CHECK.REVIEW_DATE',
  'FACT_CHECK.READ_REVIEW',
  'FACT_CHECK.SEARCH',
] as const;

describe('FactCheckResults', () => {
  let fixture: ComponentFixture<FactCheckResults>;
  let http: HttpTestingController;
  let translate: TranslateService;

  beforeEach(async () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [FactCheckResults],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({ lang: 'pl', fallbackLang: 'en' }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    translate = TestBed.inject(TranslateService);
    translate.setTranslation('pl', pl, true);
    translate.setTranslation('en', en, true);
    translate.use('pl');

    fixture = TestBed.createComponent(FactCheckResults);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  async function search(link: string): Promise<void> {
    fixture.componentRef.setInput('submission', { link, id: 1 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('ships the same fact-check copy in Polish and English', () => {
    for (const key of requiredKeys) {
      expect(pl[key]?.trim()).toBeTruthy();
      expect(en[key]?.trim()).toBeTruthy();
    }
  });

  it('shows a message when no API key is configured', async () => {
    await search('https://onet.pl/artykul');

    expect(getElementByTestId(fixture, 'fact-check-loading')).toBeTruthy();

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: '' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-no-key').nativeElement.textContent).toContain(
      pl['FACT_CHECK.NO_KEY'],
    );
    http.expectNone((outgoing) => isFactCheckRequest(outgoing));
  });

  it('shows claim, claimant, publisher, rating, date, and review link', async () => {
    await search('https://demagog.org.pl/fake_news/example');

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    http
      .expectOne((outgoing) => isFactCheckRequest(outgoing))
      .flush({
        claims: [
          {
            text: 'A claim about the article.',
            claimant: 'Jan Kowalski',
            claimReview: [
              {
                publisher: { name: 'Demagog', site: 'demagog.org.pl' },
                url: 'https://demagog.org.pl/fake_news/example/',
                reviewDate: '2024-03-15T12:00:00Z',
                textualRating: 'Fałsz',
              },
            ],
          },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-claim').nativeElement.textContent).toContain(
      'A claim about the article.',
    );
    expect(getElementByTestId(fixture, 'fact-check-claimant').nativeElement.textContent).toContain(
      'Jan Kowalski',
    );
    expect(getElementByTestId(fixture, 'fact-check-publisher').nativeElement.textContent).toContain(
      'Demagog',
    );
    expect(getElementByTestId(fixture, 'fact-check-rating').nativeElement.textContent).toContain(
      'Fałsz',
    );
    const expectedDate = new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date('2024-03-15T12:00:00Z'));
    expect(getElementByTestId(fixture, 'fact-check-date').nativeElement.textContent).toContain(
      expectedDate,
    );
    const link = getElementByTestId(fixture, 'fact-check-link').nativeElement as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://demagog.org.pl/fake_news/example/');
    expect(link.target).toBe('_blank');
    expect(getElementByTestId(fixture, 'fact-check-domain-note')).not.toBeTruthy();
  });

  it('shows a message when nothing is found', async () => {
    await search('https://example.com/only-domain');

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    const requests = ['https://example.com/only-domain', 'example.com/only-domain'];
    requests.forEach((query, index) => {
      const request = http.expectOne((outgoing) => isFactCheckRequest(outgoing, query));
      if (index < requests.length - 1) {
        request.flush({ claims: [] });
        return;
      }
      request.flush({ claims: [] });
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-empty').nativeElement.textContent).toContain(
      pl['FACT_CHECK.EMPTY'],
    );
  });

  it('shows the API error message', async () => {
    await search('https://onet.pl/artykul');

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    http
      .expectOne((outgoing) => isFactCheckRequest(outgoing))
      .flush({}, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-error').nativeElement.textContent).toContain(
      pl['FACT_CHECK.ERROR'],
    );
  });

  it('shows nothing found instead of reviews about the parent site', async () => {
    await search('https://przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx');

    http.expectOne(FACT_CHECK_CONFIG_URL).flush({ apiKey: 'test-key' });
    for (const query of [
      'https://przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx',
      'przegladsportowy.onet.pl/siatkowka/wilfredo-leon/wh8ylrx',
    ]) {
      http.expectOne((outgoing) => isFactCheckRequest(outgoing, query)).flush({ claims: [] });
    }
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getElementByTestId(fixture, 'fact-check-empty')).toBeTruthy();
    expect(getElementByTestId(fixture, 'fact-check-domain-note')).not.toBeTruthy();
    http.expectNone((outgoing) => isFactCheckRequest(outgoing, 'onet.pl'));
  });
});
