import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { SCREEN_FRAME, ScreenState } from '../../core/screen/screen.state';
import { browserWakeHost, WakeKeeper } from '../../core/screen/wake-lock';
import { MagneticDirective, SpotlightDirective } from '../../shared/motion/pointer.directive';
import { FitDirective } from '../../shared/ui/fit.directive';
import { TPipe } from '../../shared/ui/t.pipe';
import { CommandCenterComponent } from '../command-center/command-center.component';
import { CommandCenterState } from '../command-center/command-center.state';
import { DetailState } from '../command-center/detail/detail.state';
import { CountWallComponent } from '../count-wall/count-wall.component';
import { DrawComponent } from '../count-wall/draw/draw.component';
import { TvComponent } from '../tv/tv.component';
import { WinnersComponent } from '../winners/winners.component';
import { RecoverDirective } from './recover.directive';
import { ScreenActivity } from './screen-activity';

@Component({
  selector: 'app-screens',
  imports: [
    TPipe,
    CommandCenterComponent,
    TvComponent,
    CountWallComponent,
    WinnersComponent,
    DrawComponent,
    RecoverDirective,
  ],
  hostDirectives: [FitDirective, SpotlightDirective, MagneticDirective],
  providers: [
    CommandCenterState,
    DetailState,
    ScreenActivity,
    { provide: SCREEN_FRAME, useFactory: () => inject(ElementRef).nativeElement },
  ],
  host: {
    class: 'mj-root mj-cc',
    '[class.cc-drill]': 'state.drilled()',
    '[class.cc-paged]': '!!detail.at()',
    '[attr.data-theme]': 'state.theme()',
    dir: 'rtl',
    lang: 'ar',
  },
  template: `@if (screen.built()) {<app-command-center class="cc-dash" />}
    @defer (when screen.is('tv')) {<div class="mj-tv" role="dialog" aria-modal="true" [attr.aria-label]="'tv' | t"></div>} @error {<i hidden [mjRecover]="'tv'"></i>}
    @defer (when screen.is('wall')) {<div class="ct-root" [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'wall'"></i>}
    @defer (when screen.is('winners')) {<div class="wn-root" role="dialog" aria-modal="true" [attr.aria-label]="'winners' | t"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'winners'"></i>}
    @defer (when screen.is('draw')) {<div class="cxd-root" [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'draw'"></i>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreensComponent {
  readonly frames = inject(ScreenActivity).frames;
  protected readonly screen = inject(ScreenState);
  protected readonly state = inject(CommandCenterState);
  protected readonly detail = inject(DetailState);

  constructor() {
    const fit = inject(FitDirective);
    effect(() => fit.setFluid(this.screen.is('dashboard')));
    const wake = new WakeKeeper(browserWakeHost());
    effect(() => wake.want(!this.screen.is('dashboard')));
    inject(DestroyRef).onDestroy(() => wake.dispose());
  }
}
