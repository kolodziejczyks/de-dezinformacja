/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { readStoredLanguage } from './app/services/language-service';

document.documentElement.lang = readStoredLanguage();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
