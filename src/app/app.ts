import {
  afterNextRender,
  ChangeDetectionStrategy,
  computed,
  Component,
  DOCUMENT,
  effect,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from './core/clock/server-clock.service';
import { FLOW_READY } from './core/screen/layout.model';
import { InstallOffer } from './core/screen/install';
import { ScreenState } from './core/screen/screen.state';
import { ViewportState } from './core/screen/viewport.state';
import { TurnoutStore } from './data/turnout.store';
import { CountdownComponent } from './features/countdown/countdown.component';
import { FlowSkeletonComponent } from './features/command-center/flow/flow-skeleton.component';
import { AutoToastComponent } from './features/screens/auto-toast.component';
import { prefetchScreens } from './features/screens/screen-chunks';
import { ScreensComponent } from './features/screens/screens.component';
import { IconSpriteComponent } from './shared/ui/icon.component';
import { TPipe } from './shared/ui/t.pipe';

@Component({
  selector: 'app-root',
  imports: [
    ScreensComponent,
    CountdownComponent,
    FlowSkeletonComponent,
    AutoToastComponent,
    IconSpriteComponent,
    TPipe,
  ],
  template: `<div class="mj-icons"></div>
    @switch (clock.phase()) {
      @case ('loading') {
        @if (clock.connecting()) {
          <p class="mj-connecting" role="status" dir="rtl">{{ 'connecting' | t }}</p>
        }
      }
      @case ('before') {
        @defer (on immediate) {
          <app-countdown />
        }
      }
      @case ('live') {
        @if (stats.ready()) {
          <app-screens />
          @defer (when !!screen.auto()) {
            <div mjAutoToast dir="rtl" lang="ar"></div>
          }
        }
      }
    }
    @if (skeleton()) {
      <div flSkel></div>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly clock = inject(ServerClock);
  readonly stats = inject(TurnoutStore);

  protected readonly viewport = inject(ViewportState);
  protected readonly screen = inject(ScreenState);
  protected readonly skeleton = computed(
    () =>
      this.viewport.dashForm() === 'flow' &&
      this.screen.is('dashboard') &&
      (this.clock.phase() === 'loading'
        ? !this.clock.connecting()
        : this.clock.phase() === 'live' && !this.stats.ready()),
  );

  constructor() {
    inject(InstallOffer);
    effect(() => {
      if (this.viewport.form() === 'flow' && FLOW_READY.has(this.screen.screen()))
        this.stats.release(this);
      else this.stats.needRegions(this, 'all');
    });
    effect(() => {
      if (this.clock.phase() === 'live') this.stats.start();
    });
    const doc = inject(DOCUMENT);
    afterNextRender(() =>
      setTimeout(() =>
        prefetchScreens(
          doc,
          this.viewport.dashForm() === 'flow'
            ? this.clock.counting()
              ? this.viewport.formFor('wall') === 'flow'
                ? 'wallFlow'
                : 'wall'
              : this.viewport.formFor('tv') === 'flow'
                ? 'tvFlow'
                : 'tv'
            : null,
          this.viewport.saveData(),
        ),
      ),
    );
  }
}
