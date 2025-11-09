import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

export const getElementByTestId = (fixture: ComponentFixture<any>, id: string): DebugElement =>
  fixture.debugElement.query(By.css(`[data-testid='${id}']`));
