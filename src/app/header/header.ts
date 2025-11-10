import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../services/language-service';

@Component({
  selector: 'app-header',
  imports: [TranslatePipe, MatButtonToggleGroup, MatButtonToggle, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  standalone: true,
})
export class Header {
  public langFc = new FormControl<'pl' | 'en'>('pl');

  public language = inject(LanguageService);

  private translate = inject(TranslateService);

  constructor() {
    const currentLang = this.translate.getCurrentLang();
    if (currentLang) {
      // @ts-ignore
      this.langFc.patchValue(currentLang);
    }

    this.langFc.valueChanges.subscribe((value) => {
      if (value) {
        this.translate.use(value);
      }
    });
  }
}
