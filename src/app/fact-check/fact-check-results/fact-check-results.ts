import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { combineLatest, switchMap } from 'rxjs';

import { LanguageService } from '../../services/language-service';
import { FactCheckService } from '../fact-check.service';
import { FactCheckReview } from '../fact-check.models';

export interface FactCheckSubmission {
  link: string;
  id: number;
}

interface FactCheckRow extends FactCheckReview {
  reviewDateLabel: string | null;
}

@Component({
  selector: 'app-fact-check-results',
  imports: [TranslatePipe, MatCard, MatCardContent, MatProgressSpinner],
  templateUrl: './fact-check-results.html',
  styleUrl: './fact-check-results.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class FactCheckResults {
  readonly submission = input.required<FactCheckSubmission>();

  private readonly factCheck = inject(FactCheckService);
  private readonly language = inject(LanguageService);

  readonly status = signal<'loading' | 'results' | 'empty' | 'no-key' | 'error'>('loading');
  readonly reviews = signal<FactCheckReview[]>([]);
  readonly matchedQuery = signal<string | null>(null);
  readonly fellBackToDomain = signal(false);

  readonly rows = computed(() => this.reviews().map((review) => this.toRow(review)));

  constructor() {
    combineLatest([toObservable(this.submission), toObservable(this.language.language)])
      .pipe(
        switchMap(([submission]) => {
          this.status.set('loading');
          this.reviews.set([]);
          this.matchedQuery.set(null);
          this.fellBackToDomain.set(false);
          return this.factCheck.search(submission.link);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.status.set(result.status);
        this.reviews.set(result.reviews);
        this.matchedQuery.set(result.matchedQuery);
        this.fellBackToDomain.set(result.fellBackToDomain);
      });
  }

  private toRow(review: FactCheckReview): FactCheckRow {
    return {
      ...review,
      reviewDateLabel: formatReviewDate(review.reviewDate, this.dateLocale()),
    };
  }

  private dateLocale(): string {
    return this.language.language() === 'en' ? 'en-GB' : 'pl-PL';
  }
}

function formatReviewDate(value: string | null, locale: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}
