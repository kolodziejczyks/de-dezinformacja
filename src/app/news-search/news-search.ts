import { ChangeDetectionStrategy, Component, Directive, HostListener, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseCheckService } from '../services/base-check.service';
import {
  DomainAge,
  DomainRegistration,
  formatUtcDate,
  pluralCategory,
} from '../services/domain-check';
import { newsLinkValidator, requiredNewsLink } from './news-link-validator';

/** Info button: the hint is a tooltip on hover, keyboard focus, and tap. */
@Directive({
  selector: 'button[appTip]',
  hostDirectives: [
    {
      directive: MatTooltip,
      inputs: ['matTooltip'],
    },
  ],
})
export class TipButton {
  private readonly tooltip = inject(MatTooltip);
  private openBeforePointer = false;

  constructor() {
    this.tooltip.touchGestures = 'off';
    this.tooltip.tooltipClass = 'hint-tooltip';
    this.tooltip.position = 'above';
    this.tooltip.showDelay = 0;
    this.tooltip.hideDelay = 0;
  }

  @HostListener('pointerdown')
  remember(): void {
    this.openBeforePointer = this.tooltip._isTooltipVisible();
  }

  @HostListener('click')
  toggle(): void {
    if (this.openBeforePointer) {
      this.tooltip.hide(0);
    } else {
      this.tooltip.show(0);
    }
  }
}

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
    TipButton,
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

  /** A few sentences a reader can follow before the field grid. */
  summary(result: DomainRegistration): string {
    const sentences = [
      result.age
        ? this.translate.instant('CHECK.SUMMARY.AGE', {
            domain: result.domain,
            age: this.summaryAge(result.age),
          })
        : this.translate.instant('CHECK.SUMMARY.NO_AGE', { domain: result.domain }),
    ];
    if (result.registrantOrganization) {
      const country = result.registrantCountry ? this.countryName(result.registrantCountry) : null;
      sentences.push(
        country
          ? this.translate.instant('CHECK.SUMMARY.ORG_COUNTRY', {
              organization: result.registrantOrganization,
              country,
            })
          : this.translate.instant('CHECK.SUMMARY.ORG', {
              organization: result.registrantOrganization,
            }),
      );
    } else {
      sentences.push(this.translate.instant('CHECK.SUMMARY.NO_ORG'));
    }
    if (result.registrar) {
      sentences.push(
        this.translate.instant('CHECK.SUMMARY.REGISTRAR', { registrar: result.registrar }),
      );
    }
    return sentences.map((sentence) => finishSentence(sentence)).join(' ');
  }

  /** "Poland (PL)" when the value is a region code. Other text is left as published. */
  countryLabel(value: string): string {
    const name = this.countryName(value);
    return name && name !== value ? `${name} (${value})` : value;
  }

  /** Plain meaning for a known registry status. Unknown codes stay unexplained. */
  statusMeaning(status: string): string | null {
    const key = `CHECK.STATUS_TEXT.${plainStatusKey(status)}`;
    const text = this.translate.instant(key);
    return text && text !== key ? text : null;
  }

  private summaryAge(age: DomainAge): string {
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    const parts: string[] = [];
    if (age.years > 0) {
      parts.push(
        `${age.years} ${this.translate.instant(`CHECK.YEAR_${pluralCategory(age.years, lang)}`)}`,
      );
    }
    if (age.days > 0 || parts.length === 0) {
      parts.push(
        `${age.days} ${this.translate.instant(`CHECK.DAY_${pluralCategory(age.days, lang)}`)}`,
      );
    }
    if (parts.length === 2) {
      return this.translate.instant('CHECK.SUMMARY.AGE_JOIN', { years: parts[0], days: parts[1] });
    }
    return parts[0];
  }

  private countryName(value: string): string | null {
    if (!/^[A-Za-z]{2}$/.test(value)) {
      return value;
    }
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    try {
      const name = new Intl.DisplayNames([lang], { type: 'region' }).of(value.toUpperCase());
      return name && name.toUpperCase() !== value.toUpperCase() ? name : null;
    } catch {
      return null;
    }
  }
}

/** Keep a period that is already part of a name, such as "Inc." or "Sp. z o.o." */
export function finishSentence(sentence: string): string {
  const trimmed = sentence.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** RDAP status codes arrive camelCase or as words. Both map to the same glossary key. */
export function plainStatusKey(status: string): string {
  return status
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
