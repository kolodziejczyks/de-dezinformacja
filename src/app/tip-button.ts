import { Directive, HostListener, inject } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

/** Info button: the hint is a tooltip on hover, keyboard focus, and tap. */
@Directive({
  selector: 'button[appTip]',
  hostDirectives: [
    {
      directive: MatTooltip,
      inputs: ['matTooltip'],
    },
  ],
})
export class TipButton {
  private readonly tooltip = inject(MatTooltip);
  private openBeforePointer = false;

  constructor() {
    this.tooltip.touchGestures = 'off';
    this.tooltip.tooltipClass = 'hint-tooltip';
    this.tooltip.position = 'above';
    this.tooltip.showDelay = 0;
    this.tooltip.hideDelay = 0;
  }

  @HostListener('pointerdown')
  remember(): void {
    this.openBeforePointer = this.tooltip._isTooltipVisible();
  }

  @HostListener('click')
  toggle(): void {
    if (this.openBeforePointer) {
      this.tooltip.hide(0);
    } else {
      this.tooltip.show(0);
    }
  }
}
