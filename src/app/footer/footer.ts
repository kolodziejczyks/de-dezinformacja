import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe, MatIcon],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  public readonly currentYear = new Date().getFullYear();
}
