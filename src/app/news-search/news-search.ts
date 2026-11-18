import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseCheckService } from '../services/base-check.service';
import { DomainAge, formatUtcDate, pluralCategory } from '../services/domain-check';
import { FactCheckService } from '../services/fact-check.service';
import { AppLanguage } from '../services/language-service';
import { newsLinkValidator } from './news-link-validator';

@Component({
  selector: 'app-news-search',
  imports: [
    MatInput,
    MatFormField,
    MatLabel,
    MatError,
    ReactiveFormsModule,
    MatIcon,
    MatIconButton,
    MatSuffix,
    TranslatePipe,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatProgressBar,
  ],
  templateUrl: './news-search.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './news-search.scss',
})
export class NewsSearch {
  private readonly translate = inject(TranslateService);
  private searchedLink: string | null = null;

  readonly baseCheck = inject(BaseCheckService);
  readonly factCheck = inject(FactCheckService);
  readonly formatUtcDate = formatUtcDate;

  readonly newsFormControl = new FormControl('', {
    validators: [Validators.required, newsLinkValidator],
    nonNullable: true,
  });

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.searchedLink) {
        this.factCheck.check(this.searchedLink, this.uiLanguage());
      }
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.newsFormControl.invalid) {
      this.newsFormControl.markAsTouched();
      return;
    }
    this.searchedLink = this.newsFormControl.value;
    this.baseCheck.check(this.searchedLink);
    this.factCheck.check(this.searchedLink, this.uiLanguage());
  }

  private uiLanguage(): AppLanguage {
    return this.translate.getCurrentLang() === 'en' ? 'en' : 'pl';
  }

  ageLabel(age: DomainAge): string {
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    const years = this.translate.instant(`CHECK.YEAR_${pluralCategory(age.years, lang)}`);
    const days = this.translate.instant(`CHECK.DAY_${pluralCategory(age.days, lang)}`);
    return `${age.years} ${years}, ${age.days} ${days}`;
  }
}
