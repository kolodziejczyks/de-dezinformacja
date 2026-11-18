import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInput, MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
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
    MatIconModule,
    MatSuffix,
    TranslatePipe,
  ],
  templateUrl: './news-search.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './news-search.scss',
})
export class NewsSearch {
  readonly newsFormControl = new FormControl('', {
    validators: [Validators.required, newsLinkValidator],
  });
}
