import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import EN from '../../../public/i18n/en.json';
import PL from '../../../public/i18n/pl.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'de-dezinformacja.language';
export const DEFAULT_LANGUAGE: AppLanguage = 'pl';

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'pl' || value === 'en';
}

export function readStoredLanguage(storage?: Storage | null): AppLanguage {
  const store = storage === undefined ? safeLocalStorage() : storage;
  if (!store) {
    return DEFAULT_LANGUAGE;
  }
  try {
    const stored = store.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  /** Restored from storage as soon as the service is created. */
  readonly language = signal<AppLanguage>(readStoredLanguage());

  /** Registers translations and applies the persisted language before the first render. */
  initialize(): void {
    this.translate.setTranslation('pl', PL);
    this.translate.setTranslation('en', EN);
    this.apply(this.language(), false);
  }

  setLanguage(lang: AppLanguage): void {
    this.apply(lang, true);
  }

  private apply(lang: AppLanguage, persist: boolean): void {
    this.language.set(lang);
    this.translate.use(lang);
    this.document.documentElement.lang = lang;
    const title = this.translate.instant('TITLE');
    if (title && title !== 'TITLE') {
      this.document.title = title;
    }
    if (!persist) {
      return;
    }
    try {
      safeLocalStorage()?.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Private mode or blocked storage: keep the in-memory choice.
    }
  }
}
