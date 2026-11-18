import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { readStoredLanguage } from './services/language-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTranslateService({
      lang: readStoredLanguage(),
      fallbackLang: 'en',
    }),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
  ],
};
