import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInput, MatFormField, MatLabel, MatError } from '@angular/material/input';

@Component({
  selector: 'app-news-search',
  imports: [MatInput, MatFormField, MatLabel, MatError, ReactiveFormsModule],
  templateUrl: './news-search.html',
  styleUrl: './news-search.scss',
})
export class NewsSearch {
  reg = '(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?';

  newsFormControl = new FormControl('', [Validators.required, Validators.pattern(this.reg)]);
}
