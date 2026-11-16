import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { FLOW_READY } from '../../core/screen/layout.model';
import { SCREEN_FRAME, ScreenState } from '../../core/screen/screen.state';
import { ViewportState } from '../../core/screen/viewport.state';
import { browserWakeHost, WakeKeeper } from '../../core/screen/wake-lock';
import { FrameLoop } from '../../shared/motion/frame-loop.service';
import { MagneticDirective, SpotlightDirective } from '../../shared/motion/pointer.directive';
import { TPipe } from '../../shared/ui/t.pipe';
import { CommandCenterComponent } from '../command-center/command-center.component';
import { CommandCenterState } from '../command-center/command-center.state';
import { DetailState } from '../command-center/detail/detail.state';
import { FlowShellComponent } from '../command-center/flow/flow-shell.component';
import { CountWallComponent } from '../count-wall/count-wall.component';
import { DrawFlowComponent } from '../count-wall/draw/flow/draw-flow.component';
import { CountFlowComponent } from '../count-wall/flow/count-flow.component';
import { DrawComponent } from '../count-wall/draw/draw.component';
import { TvFlowComponent } from '../tv/flow/tv-flow.component';
import { TvComponent } from '../tv/tv.component';
import { WinnersFlowComponent } from '../winners/flow/winners-flow.component';
import { WinnersComponent } from '../winners/winners.component';
import { FitDirective } from './fit.directive';
import { RecoverDirective } from './recover.directive';
import { ScreenActivity } from './screen-activity';

@Component({
  selector: 'app-screens',
  imports: [
    TPipe,
    CommandCenterComponent,
    FlowShellComponent,
    TvComponent,
    TvFlowComponent,
    CountWallComponent,
    CountFlowComponent,
    WinnersComponent,
    WinnersFlowComponent,
    DrawComponent,
    DrawFlowComponent,
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
    '[class.cc-paged]': '!!detail.at() && !detail.beside()',
    '[class.cc-beside]': '!!detail.at() && detail.beside()',
    '[attr.data-theme]': 'state.theme()',
    dir: 'rtl',
    lang: 'ar',
  },
  template: `@if (screen.built()) {@if (flowShell()) {@defer (on immediate) {<div ccFlow></div>} @error {<i hidden [mjRecover]="'dashboard'"></i>}} @else {@defer (on immediate) {<app-command-center class="cc-dash" />} @error {<i hidden [mjRecover]="'dashboard'"></i>}}}
    @if (tvFlow()) {@defer (when screen.is('tv')) {<div tvFlow role="dialog" aria-modal="true" [attr.aria-label]="'tv' | t"></div>} @error {<i hidden [mjRecover]="'tv'"></i>}} @else {@defer (when screen.is('tv')) {<div class="mj-tv" role="dialog" aria-modal="true" [attr.aria-label]="'tv' | t"></div>} @error {<i hidden [mjRecover]="'tv'"></i>}}
    @if (wallFlow()) {@defer (when screen.is('wall')) {<div countFlow [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'wall'"></i>}} @else {@defer (when screen.is('wall')) {<div class="ct-root" [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'wall'"></i>}}
    @if (winnersFlow()) {@defer (when screen.is('winners')) {<div winnersFlow></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'winners'"></i>}} @else {@defer (when screen.is('winners')) {<div class="wn-root" role="dialog" aria-modal="true" [attr.aria-label]="'winners' | t"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'winners'"></i>}}
    @if (drawFlow()) {@defer (when screen.is('draw')) {<div drawFlow [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'draw'"></i>}} @else {@defer (when screen.is('draw')) {<div class="cxd-root" [theme]="state.theme()"></div>} @loading {<div class="cc-cover" aria-hidden="true"></div>} @error {<i hidden [mjRecover]="'draw'"></i>}}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreensComponent {
  readonly frames = inject(ScreenActivity).frames;
  protected readonly screen = inject(ScreenState);
  protected readonly state = inject(CommandCenterState);
  protected readonly detail = inject(DetailState);
  private readonly viewport = inject(ViewportState);
  protected readonly flowShell = computed(
    () => FLOW_READY.has('dashboard') && this.viewport.dashForm() === 'flow',
  );
  protected readonly tvFlow = computed(
    () => FLOW_READY.has('tv') && this.viewport.formFor('tv') === 'flow',
  );
  protected readonly wallFlow = computed(
    () => FLOW_READY.has('wall') && this.viewport.formFor('wall') === 'flow',
  );
  protected readonly drawFlow = computed(
    () => FLOW_READY.has('draw') && this.viewport.formFor('draw') === 'flow',
  );
  protected readonly winnersFlow = computed(
    () => FLOW_READY.has('winners') && this.viewport.formFor('winners') === 'flow',
  );

  constructor() {
    let gateT: ReturnType<typeof setTimeout> | undefined;
    const busy = () =>
      !!document.querySelector('dialog[open]') ||
      !!document.activeElement?.closest('input, select, textarea');
    this.screen.autoGate = (go) => {
      clearTimeout(gateT);
      const tryGo = () => {
        if (this.viewport.form() === 'flow' && busy()) gateT = setTimeout(tryGo, 1000);
        else go();
      };
      tryGo();
    };
    const wake = new WakeKeeper(browserWakeHost());
    effect(() => wake.want(!this.screen.is('dashboard')));
    inject(DestroyRef).onDestroy(() => {
      wake.dispose();
      clearTimeout(gateT);
      this.screen.autoGate = (go) => go();
    });
    const doc = inject(DOCUMENT),
      frame: HTMLElement = inject(ElementRef).nativeElement,
      frames = inject(FrameLoop),
      meta = doc.querySelector('meta[name="theme-color"]');
    effect(() => {
      const el = this.screen.is('winners') ? doc.documentElement : frame;
      void this.state.theme();
      let color = '';
      frames.once({
        read: () => (color = getComputedStyle(el).getPropertyValue('--canvas-0').trim()),
        write: () => color && meta?.setAttribute('content', color),
      });
    });
  }
}
