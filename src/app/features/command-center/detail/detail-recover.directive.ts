import { Directive, inject, OnInit } from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { DetailState } from './detail.state';

@Directive({ selector: '[dtRecover]' })
export class DetailRecoverDirective implements OnInit {
  private readonly screen = inject(ScreenState);
  private readonly detail = inject(DetailState);

  ngOnInit(): void {
    if (!this.screen.reloadOnce('dashboard')) this.detail.close();
  }
}
