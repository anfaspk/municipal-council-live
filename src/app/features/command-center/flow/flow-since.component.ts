import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { CountStore } from '../../../data/count.store';
import { TurnoutStore } from '../../../data/turnout.store';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { fl } from './flow-strings';
import { SINCE_AFTER, SINCE_SHOW, sinceOf, type SinceLine, type SinceSnap } from './since.model';

@Component({
  selector: 'div[flSince]',
  imports: [FlTPipe, FlIconComponent],
  host: { class: 'fl-since-host' },
  template: `@if (lines(); as ls) {<section class="fl-since" role="status" [attr.aria-label]="'flSinceT' | flT">
    <div class="fl-since-h"><svg flIcon="bell"></svg><b>{{ 'flSinceT' | flT }}</b><small>{{ 'flSinceAgo' | flT: { n: ago() } }}</small>
      <button type="button" class="fl-btn icon quiet" [attr.aria-label]="'flSinceClose' | flT" [title]="'flSinceClose' | flT" (click)="close()"><svg flIcon="close"></svg></button></div>
    <ul>@for (l of ls; track $index) {<li [class]="l.kind"><svg [flIcon]="l.kind === 'cross' ? 'up' : 'star'"></svg><span>{{ l.key | flT: l.params }}</span></li>}</ul>
    <i class="fl-since-t" aria-hidden="true"></i></section>}`,
  styleUrls: ['./flow-since.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowSinceComponent {
  readonly said = output<string>();
  private readonly stats = inject(TurnoutStore);
  private readonly counts = inject(CountStore);
  private readonly clock = inject(ServerClock);
  private readonly view = inject(DashboardView);
  protected readonly lines = signal<SinceLine[] | null>(null);
  protected readonly ago = signal(0);
  private kept: { snap: SinceSnap; at: number } | null = null;
  private readonly due = signal<SinceSnap | null>(null);
  private shut?: ReturnType<typeof setTimeout>;

  constructor() {
    const hide = () => {
      if (document.visibilityState === 'hidden') this.kept = { snap: this.snap(), at: Date.now() };
      else this.back();
    };
    const shown = (e: PageTransitionEvent) => {
      if (e.persisted) this.back();
    };
    document.addEventListener('visibilitychange', hide);
    addEventListener('pageshow', shown);
    effect(() => {
      const before = this.due(),
        govs = this.stats.govs();
      if (!before || govs === before.govs) return;
      untracked(() => {
        this.due.set(null);
        const s = sinceOf(before, this.snap());
        if (!s.lines.length) return;
        this.lines.set(s.lines);
        this.view.moved.set(new Set(s.moved));
        this.said.emit(fl('flSinceT') + ': ' + s.lines.map((l) => fl(l.key, l.params)).join('، '));
        clearTimeout(this.shut);
        this.shut = setTimeout(() => this.close(), SINCE_SHOW);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', hide);
      removeEventListener('pageshow', shown);
      clearTimeout(this.shut);
    });
  }

  protected close(): void {
    clearTimeout(this.shut);
    this.lines.set(null);
    this.view.moved.set(new Set());
  }
  private back(): void {
    const k = this.kept;
    this.kept = null;
    if (!k || Date.now() - k.at < SINCE_AFTER) return;
    this.ago.set(Math.round((Date.now() - k.at) / 60_000));
    this.due.set(k.snap);
  }
  private snap(): SinceSnap {
    return {
      govs: this.stats.govs(),
      turnout: this.stats.national().turnout,
      count: this.clock.counting() ? this.counts.govs : null,
    };
  }
}
