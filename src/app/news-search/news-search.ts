import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseCheckService } from '../services/base-check.service';
import {
  DomainAge,
  DomainRegistration,
  formatUtcDate,
  pluralCategory,
} from '../services/domain-check';
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
    MatButton,
    TranslatePipe,
    MatCard,
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

  /** A domain registered less than a year ago. Uses the age already on the record. */
  isYoungDomain(age: DomainAge | null): boolean {
    return age !== null && age.years === 0;
  }

  /** The registry did not publish an organization for the registrant. */
  isOwnerHidden(result: DomainRegistration): boolean {
    return result.registrantOrganization === null;
  }

  ageLabel(age: DomainAge): string {
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    const years = this.translate.instant(`CHECK.YEAR_${pluralCategory(age.years, lang)}`);
    const days = this.translate.instant(`CHECK.DAY_${pluralCategory(age.days, lang)}`);
    return `${age.years} ${years}, ${age.days} ${days}`;
  }
}
