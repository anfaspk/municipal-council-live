import { Directive, inject, input, OnInit } from '@angular/core';
import { Screen } from '../../core/screen/screen-prefs';
import { ScreenState } from '../../core/screen/screen.state';

@Directive({ selector: '[mjRecover]' })
export class RecoverDirective implements OnInit {
  readonly mjRecover = input.required<Screen>();
  private readonly screen = inject(ScreenState);

  ngOnInit(): void {
    this.screen.recover(this.mjRecover());
  }
}
