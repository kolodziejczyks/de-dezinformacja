import { TestBed } from '@angular/core/testing';

import { LanguageService } from './language-service';
import { provideTranslateService } from '@ngx-translate/core';
import { provideZonelessChangeDetection } from '@angular/core';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    });
    service = TestBed.inject(LanguageService);
  });

  it('initializes successfully', () => {
    expect(service).toBeTruthy();
  });
});
