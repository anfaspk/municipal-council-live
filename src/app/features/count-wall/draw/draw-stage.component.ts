import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ct } from '../../../core/i18n/count-strings';
import { drawKey as sameDraw } from '../../../domain/conflict/conflict';
import { fmt } from '../../../domain/format';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { ackCount, STAGE_TEXT, stageStep, TieItem, TossEvent, tossPlan } from './draw.model';

const TIE_TEXT = { f1: 'cxTieF1', f2: 'cxTieF2', s: 'cxTieS2' } as const;
const WAIT_STEP = 200;
const STEPS = ['cxdStep1', 'cxdStep2', 'cxdStep3', 'cxdStep4'] as const;
const ACK_TEXT = {
  pending: 'cxdAckPending',
  accepted: 'cxdAckAccepted',
  expired: 'cxdAckExpired',
} as const;

@Component({
  selector: 'section[cxdStage]',
  templateUrl: './draw-stage.component.html',
  imports: [IconComponent, RaceAvatarComponent],
  host: {
    class: 'cxd-stage',
    '[attr.aria-label]': "text('cxTossL', { w: item().name })",
    '[class.spin]': "phase() === 'spin'",
    '[class.end]': "phase() === 'end'",
    '[class.drawn]': "item().state === 'drawn'",
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawStageComponent {
  readonly item = input.required<TieItem>({ alias: 'cxdStage' });
  readonly still = input(false);
  readonly play = input(0);
  readonly hold = input(false);
  readonly active = input(true);
  readonly ask = output();

  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly ackText = ACK_TEXT;
  protected readonly phase = signal<'rest' | 'spin' | 'end'>('rest');
  protected readonly lit = signal<number | null>(null);
  protected readonly won = signal<ReadonlyMap<string, number>>(new Map());
  protected readonly seat = signal(0);
  protected readonly turns = signal(0);
  protected readonly say = signal('');
  protected readonly seen = signal(false);
  protected readonly waiting = signal(false);

  protected readonly line = computed(() => {
    const it = this.item();
    if (it.state === 'drawn') return ct('cxDrawnSub');
    return ct(it.kind ? TIE_TEXT[it.kind] : 'cxTie');
  });
  protected readonly tiedLine = computed(() => {
    const it = this.item(),
      n = it.tied.length;
    if (!n) return '';
    return it.votes === null ? ct('cxTossTiedN', { n }) : ct('cxTossTied', { n, v: fmt(it.votes) });
  });
  protected readonly steps = computed(() => {
    const it = this.item();
    if (it.state !== 'open') return [];
    const at = stageStep(it.stage);
    return STEPS.map((k, i) => ({ k, done: at > i, on: at === i }));
  });
  protected readonly progress = computed(() => {
    const it = this.item(),
      r = it.rounds;
    if (it.state !== 'open' || !r) return '';
    const acks = ackCount(it),
      round = !r.n
        ? ct('cxdRoundNone')
        : (r.max ? ct('cxdRound', { n: r.n, m: r.max }) : ct('cxdRoundN', { n: r.n })) +
          (r.open ? ' · ' + ct('cxdRoundOpen') : '');
    return [acks && ct('cxdAcks', acks), round].filter(Boolean).join(' · ');
  });
  protected readonly status = computed(() => {
    const ph = this.phase(),
      it = this.item();
    if (ph === 'spin') {
      if (this.waiting()) return ct('cxdSpinWait');
      const s = this.seat();
      if (!s) return ct('cxdStart');
      if (this.lit() !== null) return ct('cxTossSpin');
      return [...this.won().values()].includes(s)
        ? ct('cxdSeatWon', { n: s })
        : ct('cxTossSeat', { n: s });
    }
    if (this.hold()) return ct('cxdReveal');
    if (it.draw) return ct('cxDrawn');
    if (!it.tied.length) return ct('cxdLoading');
    return ct(it.state === 'open' ? STAGE_TEXT[it.stage] : 'cxdWaitDraw');
  });

  private timers: ReturnType<typeof setTimeout>[] = [];
  private lastKey = '';
  private lastPlay = 0;

  constructor() {
    effect(() => {
      const it = this.item(),
        n = this.play(),
        hold = this.hold(),
        wait =
          this.active() &&
          !this.still() &&
          !reducedMotion() &&
          it.tied.length >= 2 &&
          (hold || (it.state === 'open' && it.stage === 'resolving')),
        key =
          it.id +
          '|' +
          (it.draw ? sameDraw(it.draw) : it.state + ':' + it.tied.length) +
          (hold ? '|hold' : '') +
          (wait ? '|wait' : '');
      untracked(() => {
        const asked = n !== this.lastPlay,
          same = this.lastKey.split('|')[0] === String(it.id),
          moved = key !== this.lastKey;
        this.lastPlay = n;
        this.lastKey = key;
        if (!same) this.seen.set(false);
        if (it.draw && !hold && (asked || (moved && same && this.phase() === 'spin'))) this.run(it);
        else if (wait && same && this.waiting()) return;
        else if (wait) this.wait(it);
        else if (moved) this.rest(it, hold);
      });
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  private clear(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.waiting.set(false);
  }

  private wait(it: TieItem): void {
    this.clear();
    this.won.set(new Map());
    this.seat.set(0);
    this.waiting.set(true);
    this.phase.set('spin');
    this.say.set('');
    const n = it.tied.length,
      tick = () => {
        this.lit.update((i) => ((i ?? -1) + 1) % n);
        this.turns.update((t) => t + 1);
        this.timers = [setTimeout(tick, WAIT_STEP)];
      };
    tick();
  }

  private rest(it: TieItem, hold: boolean): void {
    const shown = hold ? null : it.draw;
    this.clear();
    this.lit.set(null);
    this.seat.set(0);
    this.say.set('');
    this.won.set(shown ? new Map(shown.wins.map((x) => [x.id, x.seat])) : new Map());
    this.phase.set(shown ? 'end' : 'rest');
  }

  private run(it: TieItem): void {
    const d = it.draw!,
      lead = this.waiting() ? 0 : undefined;
    this.clear();
    this.seen.set(true);
    if (lead === undefined) this.lit.set(null);
    this.won.set(new Map());
    if (this.still() || reducedMotion()) {
      this.won.set(new Map(d.wins.map((x) => [x.id, x.seat])));
      this.say.set(d.wins.map((x) => this.said(it, x.id, x.seat)).join(' · '));
      this.phase.set('end');
      return;
    }
    this.phase.set('spin');
    for (const ev of tossPlan(
      it.tied.map((c) => c.id),
      d.wins,
      lead,
    ))
      this.timers.push(setTimeout(() => this.step(it, ev), ev.at));
  }

  private step(it: TieItem, ev: TossEvent): void {
    if (ev.type === 'seat') {
      this.seat.set(ev.seat);
      this.say.set(ct('cxTossSeat', { n: ev.seat }));
    } else if (ev.type === 'lit') {
      this.lit.set(ev.i);
      this.turns.update((n) => n + 1);
    } else if (ev.type === 'won') {
      this.lit.set(null);
      this.won.update((m) => new Map(m).set(ev.id, ev.seat));
      this.say.set(this.said(it, ev.id, ev.seat));
    } else this.phase.set('end');
  }

  private said(it: TieItem, id: string, seat: number): string {
    const c = it.tied.find((x) => x.id === id);
    return c ? ct('cxTossSay', { name: c.name, n: seat }) : '';
  }
}
