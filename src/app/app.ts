import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Footer } from './footer/footer';
import { Header } from './header/header';
import { LanguageService } from './services/language-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, TranslatePipe],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.language.initialize();
    effect(() => {
      this.language.language();
      this.syncDocumentMeta();
    });
  }

  private syncDocumentMeta(): void {
    const title = this.translate.instant('TITLE');
    const description = this.translate.instant('META.DESCRIPTION');
    this.document.title = title;
    this.setMeta('name', 'description', description);
    this.setMeta('property', 'og:title', title);
    this.setMeta('property', 'og:description', description);
  }

  private setMeta(attr: 'name' | 'property', key: string, content: string): void {
    const tag = this.document.querySelector(`meta[${attr}="${key}"]`);
    if (tag) {
      tag.setAttribute('content', content);
    }
  }
}
