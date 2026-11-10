import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from './core/clock/server-clock.service';
import { TurnoutStore } from './data/turnout.store';
import { CountdownComponent } from './features/countdown/countdown.component';
import { prefetchScreens } from './features/screens/screen-chunks';
import { ScreensComponent } from './features/screens/screens.component';
import { IconSpriteComponent } from './shared/ui/icon.component';
import { TPipe } from './shared/ui/t.pipe';

@Component({
  selector: 'app-root',
  imports: [ScreensComponent, CountdownComponent, IconSpriteComponent, TPipe],
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
        }
      }
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly clock = inject(ServerClock);
  readonly stats = inject(TurnoutStore);

  constructor() {
    effect(() => {
      if (this.clock.phase() === 'live') this.stats.start();
    });
    const doc = inject(DOCUMENT);
    afterNextRender(() => setTimeout(() => prefetchScreens(doc)));
  }
}
