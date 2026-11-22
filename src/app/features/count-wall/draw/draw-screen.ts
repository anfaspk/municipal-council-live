import { computed, DestroyRef, Directive, effect, inject, signal, untracked } from '@angular/core';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { ct } from '../../../core/i18n/count-strings';
import { Fullscreen } from '../../../core/screen/fullscreen';
import { ScreenState } from '../../../core/screen/screen.state';
import { ConflictStore } from '../../../data/conflict.store';
import { CountStore } from '../../../data/count.store';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { COUNT_TV_PREFS, loadTvPrefs } from '../../../shared/ui/tv-prefs';
import { DrawFocus } from './draw-focus';
import { TieItem, tiesOf } from './draw.model';

export const REVEAL_WAIT = 5000;

@Directive()
export abstract class DrawScreen {
  protected readonly screen = inject(ScreenState);
  protected readonly full = inject(Fullscreen);
  protected readonly store = inject(CountStore);
  protected readonly conflicts = inject(ConflictStore);
  protected readonly wish = inject(DrawFocus);
  protected readonly counting = inject(ServerClock).counting;

  protected readonly text = ct;
  protected readonly isOpen = signal(false);
  protected readonly still = signal(false);
  protected readonly viewing = signal(true);
  protected readonly items = computed(() =>
    tiesOf(this.store.govs, this.conflicts.draws(), this.conflicts.ties()),
  );
  protected readonly sel = signal<number | null>(null);
  protected readonly item = computed(
    (): TieItem | null => this.items().find((x) => x.id === this.sel()) ?? this.items()[0] ?? null,
  );
  protected readonly index = computed(() => {
    const it = this.item();
    return it ? this.items().indexOf(it) : 0;
  });
  protected readonly counts = computed(() => {
    const l = this.items(),
      d = l.filter((x) => x.state === 'drawn').length;
    return { o: l.length - d, d };
  });
  protected readonly playN = signal(0);
  protected readonly pending = signal<number | null>(null);
  private pendT: ReturnType<typeof setTimeout> | undefined;
  protected readonly say = signal('');

  private autoplay: number | null = null;
  private seen: { id: number; drawn: boolean } | null = null;

  constructor() {
    effect(() => {
      const on = this.screen.is('draw');
      untracked(() => (on ? this.open() : this.shut()));
    });
    effect(() => {
      const it = this.isOpen() && this.viewing() ? this.item() : null;
      untracked(() => this.watch(it));
    });
    effect(() => {
      const it = this.isOpen() ? this.item() : null,
        full = this.viewing();
      if (it) untracked(() => this.wish.keep({ id: it.id, full }));
    });
    inject(DestroyRef).onDestroy(() => {
      this.store.stop(this);
      this.conflicts.watch(null);
      this.unpend();
    });
  }

  protected abstract opened(asked: boolean): void;

  private open(): void {
    const w = this.wish.take(),
      kept = w ? null : this.wish.kept();
    if (w) {
      this.sel.set(w.id);
      this.autoplay = w.play ? w.id : null;
    } else if (kept) this.sel.set(kept.id);
    this.still.set(loadTvPrefs(COUNT_TV_PREFS).still || reducedMotion());
    this.isOpen.set(true);
    this.store.start(this, true);
    this.opened(!!w || !!kept?.full);
  }
  private shut(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.wish.keep(null);
    this.store.stop(this);
    this.conflicts.watch(null);
    this.autoplay = null;
    this.unpend();
    this.closed();
  }
  protected closed(): void {
  }

  private watch(it: TieItem | null): void {
    const was = this.seen;
    this.seen = it && { id: it.id, drawn: !!it.draw };
    this.conflicts.watch(it && it.state === 'open' && it.stage !== 'prep' ? it.id : null);
    if (!it) return;
    this.store.focus(it.gid);
    this.store.want(it.id);
    if (it.state === 'drawn') this.conflicts.want(it.id);
    else if (it.stage === 'prep' || it.stage === 'ready') this.conflicts.forget(it.id);
    if (!it.draw) return;
    if (this.autoplay === it.id || (was?.id === it.id && !was.drawn)) {
      this.autoplay = null;
      this.pending.set(it.id);
      this.pendT = setTimeout(() => this.reveal(), REVEAL_WAIT);
    }
    if (this.pending() === it.id && it.source === 'api') this.reveal();
  }
  private reveal(): void {
    if (this.pending() === null) return;
    this.unpend();
    this.playN.update((n) => n + 1);
  }
  private unpend(): void {
    clearTimeout(this.pendT);
    this.pendT = undefined;
    this.pending.set(null);
  }

  protected choose(id: number): void {
    this.sel.set(id);
    this.autoplay = null;
    this.unpend();
    const it = this.item();
    if (it) this.say.set(it.name + ' · ' + ct(it.state === 'drawn' ? 'cxDrawn' : 'cxdOpen'));
  }
  protected play(): void {
    if (!this.item()?.draw) return;
    this.unpend();
    this.playN.update((n) => n + 1);
  }
  protected toWall(): void {
    this.screen.show('wall');
  }
  protected close(): void {
    this.wish.takeBack();
    this.screen.leave('draw');
  }
}
