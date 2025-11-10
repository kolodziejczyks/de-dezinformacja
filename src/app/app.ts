import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Header } from './header/header';
import { NewsSearch } from './news-search/news-search';

import EN from '../../public/i18n/en.json';
import PL from '../../public/i18n/pl.json';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, NewsSearch],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private translate = inject(TranslateService);

  constructor() {
    this.translate.setTranslation('pl', PL);
    this.translate.setTranslation('en', EN);
  }
}
