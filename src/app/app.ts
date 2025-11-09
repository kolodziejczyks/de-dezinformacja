import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { NewsSearch } from "./news-search/news-search";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, NewsSearch],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('de-dezinformacja');
}
