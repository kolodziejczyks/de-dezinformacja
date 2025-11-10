import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { BaseCheckService } from './base-check.service';

describe('BaseCheckService', () => {
  let service: BaseCheckService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    });
    service = TestBed.inject(BaseCheckService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
