import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import {
  LANGUAGE_STORAGE_KEY,
  LanguageService,
  readStoredLanguage,
} from '../services/language-service';
import { Header } from './header';

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'pl';
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function create(stored?: string): Promise<ComponentFixture<Header>> {
    if (stored) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, stored);
    }

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({
          lang: readStoredLanguage(),
          fallbackLang: 'en',
        }),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Header);
    TestBed.inject(LanguageService).initialize();
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await create();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults the toggle to pl', async () => {
    const fixture = await create();

    expect(fixture.componentInstance.langFc.value).toBe('pl');
    expect(document.documentElement.lang).toBe('pl');
  });

  it('restores the stored language onto the toggle', async () => {
    const fixture = await create('en');

    expect(fixture.componentInstance.langFc.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists the language when the toggle changes', async () => {
    const fixture = await create();

    fixture.componentInstance.langFc.setValue('en');

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(fixture.componentInstance.langFc.value).toBe('en');
  });

  it('falls back to pl when the stored value is not a supported language', async () => {
    const fixture = await create('fr');

    expect(fixture.componentInstance.langFc.value).toBe('pl');
  });
});
