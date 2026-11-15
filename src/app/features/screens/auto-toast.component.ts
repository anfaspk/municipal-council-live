import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../core/i18n/i18n';
import { NavHistory } from '../../core/screen/nav-history';
import type { Screen } from '../../core/screen/screen-prefs';
import { ScreenState } from '../../core/screen/screen.state';
import { ViewportState } from '../../core/screen/viewport.state';

const SHOW_MS = 6000;

@Component({
  selector: 'div[mjAutoToast]',
  host: { class: 'mj-autotoast', role: 'status', '[class.on]': '!!shown()' },
  template: `@if (shown(); as s) {<span class="mj-autotoast-t">{{ s.text }}</span><button type="button" class="mj-autotoast-b" (click)="back()">{{ backT }}</button>}`,
  styleUrls: ['./auto-toast.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutoToastComponent {
  private readonly screen = inject(ScreenState);
  private readonly viewport = inject(ViewportState);
  private readonly nav = inject(NavHistory);
  protected readonly backT = t('autoBack');
  protected readonly shown = signal<{ text: string; from: Screen; to: Screen } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    let seen = 0;
    effect(() => {
      const a = this.screen.auto();
      if (!a || a.n === seen) return;
      seen = a.n;
      untracked(() => {
        if (this.viewport.formFor(a.from) !== 'flow') return;
        this.nav.push('screen', { mjAuto: a.from }, location.href);
        this.shown.set({ text: t(a.to === 'wall' ? 'autoWall' : 'autoWinners'), ...a });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.shown.set(null), SHOW_MS);
      });
    });
    const stop = this.nav.listen('screen', () => {
      const a = this.screen.auto();
      this.shown.set(null);
      if (!a) return;
      if (typeof this.nav.state['mjAuto'] === 'string') {
        if (this.screen.is(a.from)) this.screen.show(a.to);
      } else if (this.screen.is(a.to)) this.screen.show(a.from);
    });
    inject(DestroyRef).onDestroy(() => {
      stop();
      clearTimeout(this.timer);
    });
  }

  protected back(): void {
    const s = this.shown();
    this.shown.set(null);
    if (!this.nav.back('screen') && s) this.screen.show(s.from);
  }
}
