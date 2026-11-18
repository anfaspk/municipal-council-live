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
import { API_BASE } from './core/api/api-base';
import { endpoints } from './core/api/endpoints';
import { ServerClock } from './core/clock/server-clock.service';
import { forgetDown, watchDown } from './core/screen/error-page';
import { FLOW_READY } from './core/screen/layout.model';
import { InstallOffer } from './core/screen/install';
import { ScreenState } from './core/screen/screen.state';
import { ViewportState } from './core/screen/viewport.state';
import { TurnoutStore } from './data/turnout.store';
import { CountdownComponent } from './features/countdown/countdown.component';
import { FlowSkeletonComponent } from './features/command-center/flow/flow-skeleton.component';
import { AutoToastComponent } from './features/screens/auto-toast.component';
import { RecoverDirective } from './features/screens/recover.directive';
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
    RecoverDirective,
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
        } @error {
          <i hidden [mjRecover]="'dashboard'"></i>
        }
      }
      @case ('live') {
        @if (stats.ready() || clock.counting()) {
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
      const winners = this.clock.counting() && this.screen.is('winners');
      if (this.clock.phase() === 'live' && !winners) this.stats.start();
      else this.stats.stop();
    });
    effect((onCleanup) => {
      if (this.stats.ready()) return forgetDown();
      if (this.clock.counting() && !this.screen.is('dashboard') && !this.screen.is('tv')) return;
      if (this.clock.phase() === 'live')
        onCleanup(watchDown(API_BASE + '/' + endpoints.statsOverall.path));
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
