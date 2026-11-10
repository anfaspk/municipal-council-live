import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { TurnoutStore } from '../../../data/turnout.store';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { flushStyle, restartAnimation } from '../../../shared/motion/restart-animation';
import { IconComponent } from '../../../shared/ui/icon.component';
import { SegComponent, SegItem } from '../../../shared/ui/seg.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { fmt, name, pct } from '../../../domain/format';
import { ranksOf } from '../../../domain/rank';
import { Gov } from '../../../domain/stats/stats';
import { indexGovs } from '../../../domain/stats/gov-index';
import { Band, band, turnout } from '../../../domain/stats/turnout';

interface RailRow {
  id: string;
  band: Band;
  t: number;
  rk: number;
  short: string;
  full: string;
  voted: number;
}
interface WilRow {
  name: string;
  band: Band;
  t: number;
  rank: number;
  voted: number;
}

@Component({
  selector: '.map-rail',
  imports: [IconComponent, SegComponent, TPipe],
  templateUrl: './gov-rail.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovRailComponent {
  private readonly stats = inject(TurnoutStore);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  readonly state = inject(CommandCenterState);
  readonly headGov = signal<Gov | null>(null);
  readonly wid = signal<string | null>(null);
  private readonly govs = signal<Gov[]>(this.stats.govs());
  private readonly index = computed(() => indexGovs(this.govs()));
  readonly govCount = computed(() => this.stats.govs().length);
  readonly listLabel = computed(() => {
    const g = this.headGov();
    return g ? t('wilOf', { g: name(g) }) : t('map');
  });
  private busy = false;
  private pend = false;
  private tOut?: ReturnType<typeof setTimeout> | undefined;
  private tIn?: ReturnType<typeof setTimeout>;
  readonly fmt = fmt;
  readonly pct = pct;
  readonly sortItems = computed<SegItem[]>(() => [
    { v: 'turnout', label: t('sTurnout') },
    { v: 'votes', label: t('sVotes') },
    { v: 'name', label: t('sName') },
  ]);

  readonly rows = computed<RailRow[]>(() => {
    const govs = this.govs(),
      index = this.index(),
      sort = this.state.sort();
    const list = govs
      .slice()
      .sort((a, b) =>
        sort === 'votes'
          ? b.voted - a.voted
          : sort === 'name'
            ? a.ar.localeCompare(b.ar, 'ar')
            : turnout(b) - turnout(a),
      );
    return list.map((g) => {
      const t = turnout(g);
      return {
        id: g.id,
        band: band(t),
        t,
        rk: index.rankOf(g.id),
        short: g.ar,
        full: g.ar,
        voted: g.voted,
      };
    });
  });

  readonly wgov = computed(() => {
    const id = this.wid();
    return id ? this.index().get(id) : null;
  });
  readonly wrows = computed<WilRow[]>(() => {
    const g = this.wgov();
    if (!g) return [];
    const sort = this.state.sort();
    const rows = g.wils.map((r) => ({
      name: r.name,
      voted: r.voted,
      t: turnout(r),
      rank: 0,
      band: 'mid' as Band,
    }));
    const rank = ranksOf(rows, (r) => r.t);
    rows.forEach((r, i) => {
      r.rank = rank[i]!;
      r.band = band(r.t);
    });
    return rows.sort((a, b) =>
      sort === 'votes'
        ? b.voted - a.voted
        : sort === 'name'
          ? a.name.localeCompare(b.name, 'ar')
          : b.t - a.t,
    );
  });
  readonly gt = computed(() => {
    const g = this.wgov();
    return g ? turnout(g) : 0;
  });
  readonly name = name;
  readonly band = band;
  readonly turnout = turnout;

  constructor() {
    effect(() => {
      const g = this.stats.govs();
      untracked(() => {
        if (this.busy) this.pend = true;
        else this.govs.set(g);
      });
    });
    effect(() => {
      this.rows();
      const a = document.activeElement,
        row =
          a instanceof HTMLElement && this.host.contains(a)
            ? a.closest<HTMLElement>('.mj-row')
            : null,
        id = row?.getAttribute('data-id');
      if (id)
        afterNextRender(
          () => this.host.querySelector<HTMLElement>('[data-id="' + id + '"]')?.focus(),
          { injector: this.injector },
        );
    });
    effect(() => {
      const id = this.state.pinned();
      untracked(() => {
        if (id === this.wid()) return;
        const g = id ? this.stats.gov(id) : null;
        this.drill(g);
        this.head(g, !g);
      });
    });
  }

  private drill(g: Gov | null): void {
    const to = g ? g.id : null,
      el = this.host.querySelector<HTMLElement>('.rail-list')!;
    if (to === this.wid()) return;
    const anim = !reducedMotion() && el.isConnected;
    clearTimeout(this.tOut);
    clearTimeout(this.tIn);
    const swap = () => {
      this.tOut = undefined;
      this.wid.set(to);
      el.scrollTop = 0;
      if (!anim) {
        this.busy = false;
        return;
      }
      el.classList.remove('rl-out');
      flushStyle(el);
      el.classList.add('rl-in');
      this.tIn = setTimeout(() => {
        el.classList.remove('rl-in', 'rl-back');
        this.busy = false;
        if (this.pend) {
          this.pend = false;
          this.govs.set(this.stats.govs());
        }
      }, 1100);
    };
    if (!anim) {
      el.classList.remove('rl-out', 'rl-in', 'rl-back');
      swap();
      return;
    }
    this.busy = true;
    el.classList.remove('rl-in');
    el.classList.toggle('rl-back', !to);
    flushStyle(el);
    el.classList.add('rl-out');
    this.tOut = setTimeout(swap, 340);
  }
  private head(g: Gov | null, back: boolean): void {
    this.headGov.set(g);
    if (reducedMotion()) return;
    const h = this.host.querySelector<HTMLElement>('.mr-head')!;
    h.classList.toggle('mr-rev', back);
    restartAnimation(h, 'mr-in');
  }

  private row(e: Event): HTMLElement | null {
    return e.target instanceof Element ? e.target.closest<HTMLElement>('.mj-row') : null;
  }
  over(e: Event): void {
    const r = this.row(e);
    if (!r) return;
    const w = r.getAttribute('data-w'),
      id = r.getAttribute('data-id');
    if (w) this.state.wilHot.set(w);
    else if (id) this.state.setHot(id);
  }
  out(): void {
    if (this.wid()) this.state.wilHot.set(null);
    else this.state.setHot(null);
  }
  click(e: Event): void {
    const r = this.row(e);
    if (!r) return;
    const w = r.getAttribute('data-w'),
      id = r.getAttribute('data-id');
    if (w) this.state.pickWil(w);
    else if (id) this.state.open(id);
  }
  key(e: KeyboardEvent): void {
    const r = this.row(e);
    if (!r) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.click(e);
    }
    const nx = r.nextElementSibling as HTMLElement | null,
      pv = r.previousElementSibling as HTMLElement | null;
    if (e.key === 'ArrowDown' && nx && nx.tabIndex >= 0) {
      e.preventDefault();
      nx.focus();
    }
    if (e.key === 'ArrowUp' && pv) {
      e.preventDefault();
      pv.focus();
    }
  }
}
