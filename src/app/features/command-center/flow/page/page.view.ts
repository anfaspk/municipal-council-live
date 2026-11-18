import { computed, inject, Injectable } from '@angular/core';
import { TurnoutStore } from '../../../../data/turnout.store';
import { fmt, pct } from '../../../../domain/format';
import type { VillageDetail } from '../../../../domain/stats/place';
import type { Counts, Figures } from '../../../../domain/stats/stats';
import { band, turnout } from '../../../../domain/stats/turnout';
import { DetailHold } from '../../detail/detail-hold';
import { detailHead } from '../../detail/detail.model';
import { levelOf } from '../../detail/detail-url';
import { DetailState } from '../../detail/detail.state';
import { natTurnout } from '../../detail/gov/gov.model';
import { rateModel } from '../../detail/parts/age.model';
import {
  type CmpInput,
  compareModel,
  flowModel,
  genderModel,
} from '../../detail/parts/place.model';
import { vilAges, vilTurnout } from '../../detail/vil/vil.model';

import { ringDash } from '../flow.model';
import { cmpChips, phoneCrumbs } from './page.model';

interface PlaceCounts {
  reg: Counts;
  voted: Counts;
  pop: Figures | null | undefined;
  not?: Counts;
}
const counts = (t: number, m: number, f: number): Counts => ({ t, m, f });

import { fp, fpParts } from './page-strings';

@Injectable()
export class PageView {
  private readonly stats = inject(TurnoutStore);
  private readonly detail = inject(DetailState);
  private readonly hold = inject(DetailHold);

  readonly at = this.detail.at;
  readonly level = computed(() => {
    const a = this.at();
    return a ? levelOf(a) : null;
  });
  readonly gov = computed(() => {
    const a = this.at();
    return a ? this.stats.gov(a.gov) : undefined;
  });
  readonly wil = computed(() => {
    const a = this.at();
    return a?.wil === undefined ? undefined : this.gov()?.wils.find((w) => w.id === a.wil);
  });
  readonly villages = computed(() => {
    this.hold.tick();
    const a = this.at();
    return a?.wil === undefined ? undefined : this.stats.villages(a.wil);
  });
  private readonly wilOwn = computed(() => {
    this.hold.tick();
    const a = this.at();
    return a?.wil === undefined ? undefined : this.stats.wilayat(a.wil);
  });
  readonly vrow = computed(() => {
    const a = this.at();
    return a?.vil === undefined ? undefined : this.villages()?.find((v) => v.id === a.vil);
  });
  private last: VillageDetail | undefined;
  readonly vdata = computed(() => {
    this.hold.tick();
    const a = this.at();
    if (a?.vil === undefined) return (this.last = undefined);
    return (this.last = this.stats.villageDetail(a.vil) ?? this.last);
  });
  readonly busy = computed(() => {
    const d = this.vdata();
    return !!d && d.id !== this.at()?.vil;
  });
  private readonly vown = computed(() => {
    const d = this.vdata();
    return d && d.id === this.at()?.vil ? d : undefined;
  });

  readonly head = computed(() => {
    const a = this.at();
    return a ? detailHead(a, this.stats.govs(), this.villages(), fp('tvOman')) : null;
  });
  readonly crumbs = computed(() => phoneCrumbs(this.head()?.crumbs ?? []));
  readonly upName = computed(() => {
    const l = this.level();
    return l === 'wil' ? (this.gov()?.ar ?? '…') : l === 'vil' ? (this.wil()?.name ?? '…') : '';
  });
  readonly rank = computed(() => {
    const h = this.head();
    if (!h || h.rank === null) return null;
    return h.level === 'gov'
      ? fp('flRankOf', { r: h.rank, n: h.of ?? 0 })
      : fp('flPgRankIn', { r: h.rank, n: h.of ?? 0, p: this.upName() });
  });
  readonly stamp = computed(() => {
    const at = this.stats.staleAt();
    if (at) return { stale: true, text: fp('figuresAt', { t: at }) };
    this.hold.tick();
    const a = this.at();
    if (!a) return null;
    const s =
      a.vil !== undefined
        ? this.stats.villageDetail(a.vil)?.at
        : a.wil !== undefined
          ? this.stats.wilayat(a.wil)?.at
          : this.stats.gov(a.gov)?.at;
    return s ? { stale: false, text: fp('flPgVote', { t: s }) } : null;
  });

  readonly counts = computed((): PlaceCounts | null => {
    const l = this.level(),
      g = this.gov(),
      w = this.wil(),
      d = this.vdata();
    if (l === 'gov' && g)
      return {
        reg: counts(g.reg, g.regM, g.regF),
        voted: counts(g.voted, g.votedM, g.votedF),
        pop: g.pop,
      };
    if (l === 'wil' && w)
      return {
        reg: counts(w.reg, w.regM, w.regF),
        voted: counts(w.voted, w.votedM, w.votedF),
        pop: this.wilOwn()?.pop,
      };
    if (l === 'vil' && d) return { reg: d.reg, voted: d.voted, pop: d.pop, not: d.notVoted };
    return null;
  });
  readonly t = computed((): number | null => {
    const l = this.level();
    if (l === 'gov') return this.gov() ? turnout(this.gov()!) : null;
    if (l === 'wil') return this.wil() ? turnout(this.wil()!) : null;
    if (l === 'vil') return vilTurnout(this.vown(), this.vrow());
    return null;
  });
  readonly band = computed(() => {
    const t = this.t();
    return t === null ? null : band(t);
  });
  readonly pct = computed(() => {
    const t = this.t();
    return t === null ? '—' : pct(t);
  });
  readonly dash = computed(() => ringDash((this.t() ?? 0) / 100));
  readonly upT = computed((): number | null => {
    const l = this.level(),
      x = l === 'wil' ? this.gov() : l === 'vil' ? this.wil() : undefined;
    return x && x.reg > 0 ? turnout(x) : null;
  });
  readonly cmp = computed(() => {
    const rows: CmpInput[] = [{ key: 'self', label: this.head()?.title ?? '…', t: this.t() }];
    if (this.level() !== 'gov') rows.push({ key: 'up', label: this.upName(), t: this.upT() });
    rows.push({ key: 'nat', label: fp('flPgNat'), t: natTurnout(this.stats.national()) });
    return cmpChips(compareModel(rows)).map((c) => ({
      ...c,
      text: fp(c.side === 'up' ? 'flPgAbove' : c.side === 'down' ? 'flPgBelow' : 'flPgLevel', {
        p: c.label,
        n: c.gap,
      }),
    }));
  });
  readonly say = computed(() => {
    const c = this.counts(),
      r = this.vrow(),
      x = c ? { voted: c.voted.t, reg: c.reg.t } : this.level() === 'vil' && r ? r : null;
    if (!x || !(x.reg > 0)) return null;
    return fpParts(x.voted > 0 ? 'flPgSum' : 'flPgSum0', { v: fmt(x.voted), r: fmt(x.reg) }, [
      'v',
      'r',
    ]);
  });
  readonly flow = computed(() => {
    const c = this.counts();
    return c ? flowModel(c.pop, c.reg, c.voted, c.not) : null;
  });
  readonly gender = computed(() => {
    const c = this.counts();
    return c ? genderModel(c.reg, c.voted) : null;
  });
  readonly ages = computed(() => {
    const l = this.level();
    if (l === 'gov') return this.gov()?.ages ?? null;
    if (l === 'wil') return this.wil()?.ages ?? null;
    return this.vdata()?.ages?.voted ?? null;
  });
  readonly hours = computed(() => {
    const l = this.level();
    return (l === 'gov' ? this.gov()?.hours : l === 'wil' ? this.wil()?.hours : undefined) ?? [];
  });
  readonly rate = computed(() => {
    const d = this.vdata();
    return d ? rateModel(vilAges(d), this.t()) : null;
  });
  readonly none = computed(() => this.vdata()?.voted.t === 0);
}
