import { effect, inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ScreenState } from '../../core/screen/screen.state';
import { UpdateGate } from '../../shared/motion/update-gate';
import { TurnoutEvent, TurnoutStore } from '../../data/turnout.store';

export type ScreenEvent = TurnoutEvent | { type: 'resume' };
export type Lane = 'now' | 'map' | 'podium' | 'side';
export const LANE_MS: Readonly<Record<Lane, number>> = { now: 0, map: 0, podium: 350, side: 700 };

@Injectable({ providedIn: 'root' })
export class ScreenUpdates {
  private readonly lanes = new Map<Lane, Subject<ScreenEvent>>();
  private readonly tvOut = new Subject<ScreenEvent>();
  private batch: TurnoutEvent[] = [];
  private generation = 0;
  private readonly pending = new Set<ReturnType<typeof setTimeout>>();
  private covered = false;
  private readonly dash = new UpdateGate<ScreenEvent>(
    (b) => this.toLanes(b),
    () => this.toLanes([{ type: 'resume' }]),
  );
  private readonly tvGate = new UpdateGate<ScreenEvent>(
    (b) => b.forEach((e) => this.tvOut.next(e)),
    () => this.tvOut.next({ type: 'resume' }),
  );

  constructor() {
    const screen = inject(ScreenState);
    effect(() => {
      this.generation++;
      this.pending.forEach(clearTimeout);
      this.pending.clear();
      this.dash.setActive(screen.is('dashboard'), true);
      this.tvGate.setActive(screen.is('tv'));
    });
    inject(TurnoutStore).events.subscribe((e) => {
      if (e.type === 'villages' || e.type === 'village') return this.dash.deliver([e]);
      if (!this.batch.length) queueMicrotask(() => this.flush());
      this.batch.push(e);
    });
  }

  readonly now = this.lane('now');
  readonly map = this.lane('map');
  readonly podium = this.lane('podium');
  readonly side = this.lane('side');
  readonly tv: Observable<ScreenEvent> = this.tvOut.asObservable();

  tvSwap(face: Element | undefined): void {
    const t = face && longest(getComputedStyle(face));
    if (!face || !t) return;
    this.tvGate.hold(t.ms);
    const end = (e: Event) => {
      if (e.target !== face || (e as TransitionEvent).propertyName !== t.prop) return;
      face.removeEventListener('transitionend', end);
      this.tvGate.release();
    };
    face.addEventListener('transitionend', end);
  }

  cover(on: boolean): void {
    if (on === this.covered) return;
    this.covered = on;
    if (!on && this.dash.active)
      this.lanes.forEach((s, lane) => lane !== 'now' && s.next({ type: 'resume' }));
  }

  private lane(name: Lane): Observable<ScreenEvent> {
    const s = new Subject<ScreenEvent>();
    this.lanes.set(name, s);
    return s.asObservable();
  }
  private flush(): void {
    const b = this.batch;
    this.batch = [];
    this.dash.deliver(b);
    this.tvGate.deliver(b);
  }
  private toLanes(b: ScreenEvent[]): void {
    this.lanes.forEach((s, lane) => {
      if (this.covered && lane !== 'now') return;
      const generation = this.generation;
      const send = () => {
        if (this.dash.active && generation === this.generation) b.forEach((e) => s.next(e));
      };
      if (LANE_MS[lane]) {
        const timer = setTimeout(() => {
          this.pending.delete(timer);
          send();
        }, LANE_MS[lane]);
        this.pending.add(timer);
      } else send();
    });
  }
}

function longest(cs: CSSStyleDeclaration): { prop: string; ms: number } | null {
  const list = (v: string) => v.split(',').map((x) => x.trim()),
    ms = (v: string) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000) || 0,
    props = list(cs.transitionProperty),
    durs = list(cs.transitionDuration),
    delays = list(cs.transitionDelay);
  let out: { prop: string; ms: number } | null = null;
  props.forEach((prop, i) => {
    const t = ms(durs[i % durs.length]!) + ms(delays[i % delays.length]!);
    if (t > 0 && prop !== 'none' && (!out || t > out.ms)) out = { prop, ms: t };
  });
  return out;
}
