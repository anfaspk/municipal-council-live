import { computed, inject, Injectable, signal } from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { TurnoutStore } from '../../../data/turnout.store';
import { clockStr, fmt, pct, pctOf } from '../../../domain/format';
import { band } from '../../../domain/stats/turnout';
import { pulseView } from '../pulse/pulse.model';
import { fl } from './flow-strings';
import { barOf, govRows, ringDash, sparkOf, type GovSort } from './flow.model';
export interface FlowKpi {
  fig: string;
  label: string;
  value: string;
  foot: string;
}
@Injectable()
export class DashboardView {
  private readonly stats = inject(TurnoutStore);
  private readonly clock = inject(ServerClock);
  readonly sort = signal<GovSort>('turnout');
  readonly moved = signal<ReadonlySet<string>>(new Set());
  readonly nat = computed(() => {
    const n = this.stats.national(),
      known = !n.unread.includes('registered'),
      yet = n.registered - n.voted;
    return {
      t: n.turnout,
      pct: pct(n.turnout),
      band: band(n.turnout),
      dash: ringDash(n.turnout / 100),
      voted: fmt(n.voted),
      reg: known ? fmt(n.registered) : '—',
      yet: known ? fmt(yet) : '—',
      yetShare: known ? pctOf(yet, n.registered) : '—',
      known,
      spark: sparkOf(n.hours),
    };
  });
  readonly kpis = computed((): FlowKpi[] => {
    const n = this.stats.national(),
      has = (k: 'registered') => !n.unread.includes(k),
      share = (part: number, ok: boolean) =>
        ok ? fl('flShareOf', { p: pctOf(part, n.registered) }) : '—';
    return [
      {
        fig: 'kpi.registered',
        label: t('registered'),
        value: has('registered') ? fmt(n.registered) : '—',
        foot: fl('flNational'),
      },
      {
        fig: 'kpi.voted',
        label: fl('flVotedT'),
        value: fmt(n.voted),
        foot: share(n.voted, has('registered')),
      },
      {
        fig: 'kpi.yet',
        label: t('yetToVote'),
        value: has('registered') ? fmt(n.registered - n.voted) : '—',
        foot: share(n.registered - n.voted, has('registered')),
      },
    ];
  });
  readonly pulse = computed(() => pulseView(this.stats.national()));
  readonly rows = computed(() =>
    govRows(this.stats.ranked(), (id) => this.stats.rankOf(id), this.sort()),
  );
  readonly govCount = computed(() => this.stats.govs().length);
  readonly stamp = computed(() => {
    const at = this.stats.staleAt();
    return at
      ? t('figuresAt', { t: at })
      : fl('flUpdated', { t: clockStr(this.stats.updatedAt()) });
  });
  readonly stale = computed(() => this.stats.staleAt() !== null);
  readonly done = this.stats.done;
  readonly bar = computed(() => barOf(this.clock.counting()));
}
