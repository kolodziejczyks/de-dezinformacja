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
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('restores the stored language before the first render', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    const fixture = TestBed.createComponent(App);

    expect(document.documentElement.lang).toBe('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('De-Disinformation');
  });
});
