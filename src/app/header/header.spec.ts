import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Header } from './header';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideZonelessChangeDetection()],
    });

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('header title is visible', () => {
    const title = document.querySelector('.header');

    expect(title?.textContent).toBe('header');
  });
});
