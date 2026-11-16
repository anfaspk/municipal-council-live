import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SCREEN_FRAME } from '../../../core/screen/screen.state';
import { TurnoutStore } from '../../../data/turnout.store';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { ScreenUpdates } from '../../screens/screen-updates';
import { CommandCenterState } from '../command-center.state';
import { settle } from './detail-url';
import { DetailState } from './detail.state';

@Injectable()
export class DetailHold {
  private readonly detail = inject(DetailState);
  private readonly stats = inject(TurnoutStore);
  readonly tick = signal(0);

  constructor() {
    const frames = inject(FrameLoop),
      updates = inject(ScreenUpdates),
      cc = inject(CommandCenterState);
    const frame = inject(SCREEN_FRAME);
    let held: Animation[] | null = null;
    const hold = (on: boolean) => {
      if (on === !!held) return;
      if (on) {
        frames.pause('dashboard', this);
        updates.cover(true);
        held = holdUnder(frame);
        return;
      }
      frames.resume('dashboard', this);
      updates.cover(false);
      for (const a of held!) if (a.playState === 'paused') a.play();
      held = null;
    };
    hold(!this.detail.beside());
    effect(() => {
      const on = !this.detail.beside();
      untracked(() => hold(on));
    });
    inject(DestroyRef).onDestroy(() => hold(false));
    effect(() => {
      const pin = cc.pinned(),
        at = untracked(() => this.detail.at());
      if (pin && at && pin !== at.gov && this.detail.beside())
        untracked(() => this.detail.sibling({ gov: pin }));
    });
    updates.now.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.type === 'villages' || e.type === 'village' || e.type === 'resume')
        this.tick.update((n) => n + 1);
    });
    effect(() => {
      const gov = this.detail.at()?.gov;
      if (gov) untracked(() => cc.open(gov));
    });
    effect(() => {
      const at = this.detail.at();
      if (at)
        untracked(() => {
          this.stats.watchWilayat(at.wil ?? null);
          this.stats.watchVillage(at.vil ?? null);
        });
    });
    effect(() => {
      const at = this.detail.at();
      this.tick();
      if (!at) return;
      const g = this.stats.gov(at.gov);
      if (!g) {
        if (this.stats.ready()) untracked(() => this.detail.close());
        return;
      }
      const wils = g.wils.length ? g.wils.map((w) => w.id) : undefined,
        vils = at.wil === undefined ? undefined : this.stats.villages(at.wil)?.map((v) => v.id),
        next = settle(at, wils, vils);
      if (next !== at) untracked(() => this.detail.sibling(next));
    });
  }
}

function holdUnder(frame: HTMLElement): Animation[] {
  const held: Animation[] = [];
  for (const el of frame.querySelectorAll('.cc-grid > :not(.cc-bar), .mj-drawer, .mj-scrim'))
    for (const a of el.getAnimations({ subtree: true }))
      if (a.playState === 'running') {
        a.pause();
        held.push(a);
      }
  return held;
}
