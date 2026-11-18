import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { AppLanguage, LanguageService } from '../services/language-service';

@Component({
  selector: 'app-header',
  imports: [TranslatePipe, MatButtonToggleGroup, MatButtonToggle, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Header {
  private readonly language = inject(LanguageService);

  readonly langFc = new FormControl<AppLanguage | null>(this.language.language());

  constructor() {
    this.langFc.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (value === 'pl' || value === 'en') {
        this.language.setLanguage(value);
      }
    });
  }
}
