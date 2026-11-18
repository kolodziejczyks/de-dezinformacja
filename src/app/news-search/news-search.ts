import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DomainAge, formatUtcDate, pluralCategory } from '../services/domain-check';
import { BaseCheckService } from '../services/base-check.service';
import { newsLinkValidator, requiredNewsLink } from './news-link-validator';

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

  readonly baseCheck = inject(BaseCheckService);
  readonly formatUtcDate = formatUtcDate;

  readonly newsFormControl = new FormControl('', {
    validators: [requiredNewsLink, newsLinkValidator],
    nonNullable: true,
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    const trimmed = this.newsFormControl.value.trim();
    if (trimmed !== this.newsFormControl.value) {
      this.newsFormControl.setValue(trimmed);
    }
    if (this.newsFormControl.invalid) {
      this.newsFormControl.markAsTouched();
      return;
    }
    this.baseCheck.check(trimmed);
  }

  ageLabel(age: DomainAge): string {
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    const years = this.translate.instant(`CHECK.YEAR_${pluralCategory(age.years, lang)}`);
    const days = this.translate.instant(`CHECK.DAY_${pluralCategory(age.days, lang)}`);
    return `${age.years} ${years}, ${age.days} ${days}`;
  }
}
