import { ComponentFixture } from '@angular/core/testing';
import { getElementByTestId } from './get-element-by-test-id';

export const typeInto = (fixture: ComponentFixture<any>, id: string, textToType: string): void => {
  const component = getElementByTestId(fixture, id);

  component.nativeElement.value = textToType;
  component.nativeElement.dispatchEvent(new InputEvent('input'));
  component.nativeElement.dispatchEvent(new Event('blur'));

  fixture.detectChanges();
};
