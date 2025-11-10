import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInput, MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

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
  styleUrl: './news-search.scss',
})
export class NewsSearch {
  reg = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';

  newsFormControl = new FormControl('', [Validators.required, Validators.pattern(this.reg)]);
}
