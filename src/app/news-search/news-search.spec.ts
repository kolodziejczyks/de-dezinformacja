import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { NewsSearch } from './news-search';

import { getElementByTestId, typeInto } from '../../../testing';
import { provideTranslateService } from '@ngx-translate/core';

describe('NewsSearch', () => {
  let component: NewsSearch;
  let fixture: ComponentFixture<NewsSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsSearch],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes successfully', () => {
    expect(component).toBeTruthy();
  });

  it('initially, news input is visible', () => {
    const input = getElementByTestId(fixture, 'news-search-input');

    expect(input.nativeElement).toBeTruthy();
  });

  it('initially, no errors are visible', () => {
    const reqError = getElementByTestId(fixture, 'news-search-req-error');
    const urlError = getElementByTestId(fixture, 'news-search-www-error');

    expect(reqError).not.toBeTruthy();
    expect(urlError).not.toBeTruthy();
  });

  it('given that input is touched but nothing is typed, required error is visible', () => {
    typeInto(fixture, 'news-search-input', '');

    const reqError = getElementByTestId(fixture, 'news-search-req-error');

    expect(reqError).toBeTruthy();
  });

  it('given that incorrect url is provided, www error is visible', () => {
    typeInto(fixture, 'news-search-input', 'dupa');

    const wwwError = getElementByTestId(fixture, 'news-search-www-error');

    expect(wwwError).toBeTruthy();
  });

  it('given that correct url is provided, www error is not visible', () => {
    typeInto(fixture, 'news-search-input', 'dupa.com');

    const wwwError = getElementByTestId(fixture, 'news-search-www-error');

    expect(wwwError).not.toBeTruthy();
  });
});
