import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LanguageService,
  readStoredLanguage,
} from './language-service';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'pl';
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService({
          lang: readStoredLanguage(),
          fallbackLang: 'en',
        }),
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function setup(): { service: LanguageService; translate: TranslateService } {
    return {
      service: TestBed.inject(LanguageService),
      translate: TestBed.inject(TranslateService),
    };
  }

  it('initializes successfully', () => {
    expect(setup().service).toBeTruthy();
  });

  it('falls back to pl when nothing is stored', () => {
    const { service, translate } = setup();

    service.initialize();

    expect(service.language()).toBe(DEFAULT_LANGUAGE);
    expect(translate.getCurrentLang()).toBe('pl');
    expect(translate.instant('TITLE')).toBe('De-Dezinformacja');
    expect(document.documentElement.lang).toBe('pl');
    expect(document.title).toBe('De-Dezinformacja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('restores en from localStorage and applies it before translations are read', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const { service, translate } = setup();

    service.initialize();

    expect(service.language()).toBe('en');
    expect(translate.getCurrentLang()).toBe('en');
    expect(translate.instant('TITLE')).toBe('De-Disinformation');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('De-Disinformation');
  });

  it('ignores an unsupported stored value', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
    const { service, translate } = setup();

    service.initialize();

    expect(service.language()).toBe('pl');
    expect(translate.getCurrentLang()).toBe('pl');
  });

  it('persists a language change and updates the document language', () => {
    const { service, translate } = setup();
    service.initialize();

    service.setLanguage('en');

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(service.language()).toBe('en');
    expect(translate.getCurrentLang()).toBe('en');
    expect(translate.instant('TITLE')).toBe('De-Disinformation');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('De-Disinformation');
  });

  it('keeps the selected language when storage writes fail', () => {
    const { service } = setup();
    service.initialize();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => service.setLanguage('en')).not.toThrow();
    expect(service.language()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('readStoredLanguage falls back to pl for missing storage or read errors', () => {
    expect(readStoredLanguage(null)).toBe('pl');

    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;

    expect(readStoredLanguage(storage)).toBe('pl');
  });
});
