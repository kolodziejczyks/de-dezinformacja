import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { WaybackCheckService } from '../services/wayback-check.service';
import { TipButton } from '../tip-button';

@Component({
  selector: 'app-wayback-card',
  imports: [MatCard, MatIcon, MatProgressBar, TranslatePipe, TipButton],
  templateUrl: './wayback-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { style: 'display: contents' },
})
export class WaybackCard {
  readonly wayback = inject(WaybackCheckService);
}
