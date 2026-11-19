import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { CertCheckService } from '../services/cert-check.service';
import { TipButton } from '../tip-button';

@Component({
  selector: 'app-cert-card',
  imports: [MatCard, MatIcon, MatProgressBar, TranslatePipe, TipButton],
  templateUrl: './cert-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: contents' },
})
export class CertCard {
  readonly cert = inject(CertCheckService);

  matchNames(matches: string[]): string {
    return matches.join(', ');
  }
}
