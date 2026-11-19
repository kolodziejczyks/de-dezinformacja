import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { App } from './app';
import { LANGUAGE_STORAGE_KEY } from './services/language-service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.lang = 'pl';
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideTranslateService()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.getElementById('site-manifest')?.remove();
    document.querySelector('meta[name="application-name"]')?.remove();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('restores the stored language before the first render', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="application-name" content=""><link id="site-manifest" rel="manifest" href="manifest.webmanifest">',
    );

    const fixture = TestBed.createComponent(App);

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('De-Disinformation');
    expect(document.querySelector('meta[name="application-name"]')?.getAttribute('content')).toBe(
      'De-Disinformation',
    );
    expect(document.getElementById('site-manifest')?.getAttribute('href')).toBe(
      'manifest.en.webmanifest',
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('De-Disinformation');
  });
});
