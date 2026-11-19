import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TrancoCheckService } from '../services/tranco-check.service';
import { TipButton } from '../tip-button';

@Component({
  selector: 'app-tranco-card',
  imports: [MatCard, MatIcon, MatProgressBar, TranslatePipe, TipButton],
  templateUrl: './tranco-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: contents' },
})
export class TrancoCard {
  private readonly translate = inject(TranslateService);
  readonly tranco = inject(TrancoCheckService);

  rankText(rank: number): string {
    const lang = this.translate.getCurrentLang() === 'pl' ? 'pl' : 'en';
    return new Intl.NumberFormat(lang).format(rank);
  }
}
