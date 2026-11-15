import { computed, inject, Injectable, signal } from '@angular/core';
import { InterimStore } from '../../data/interim.store';
import { TurnoutStore } from '../../data/turnout.store';
import type { ScreenComp } from '../../core/screen/layout.model';
import { timeLeft } from '../../domain/interim/interim';
import { band, turnout } from '../../domain/stats/turnout';
import { againstNation, phoneCountry, phoneRegion } from './flow/tv-flow.model';
import { interimGov, InterimRow } from './tv-interim.model';
import type { TvSlide } from './tv-slide.model';

@Injectable()
export class TvView {
  private readonly stats = inject(TurnoutStore);
  private readonly interim = inject(InterimStore);

  readonly slide = signal<TvSlide | null>(null);
  readonly spot = signal(-1);
  readonly comp = signal<ScreenComp>('phone');
  readonly wide = computed(() => this.comp() !== 'phone');

  readonly nat = computed(() => {
    const s = this.slide();
    return s?.kind === 'nat' ? s : null;
  });
  readonly gov = computed(() => {
    const s = this.slide();
    return s?.kind === 'gov' ? s : null;
  });
  readonly staleAt = this.stats.staleAt;
  readonly phase = this.interim.phase;
  readonly inter = computed(() => this.phase() === 'open');
  readonly fromAt = this.interim.fromAt;
  readonly toAt = this.interim.toAt;
  readonly left = computed(() => {
    const l = this.interim.left();
    return l === null ? null : timeLeft(l);
  });

  readonly ranking = computed(() => {
    const index = this.stats.index();
    return index.ranked.map((g) => {
      const t = turnout(g);
      return { id: g.id, rank: index.rankOf(g.id), name: g.ar, t, band: band(t), voted: g.voted };
    });
  });
  readonly country = computed(() => {
    const n = this.nat();
    if (!n) return null;
    return phoneCountry(
      n,
      this.wide() ? new Map(this.ranking().map((r) => [r.id, r.rank])) : undefined,
    );
  });
  readonly region = computed(() => {
    const g = this.gov();
    return g ? phoneRegion(g) : null;
  });
  readonly cmp = computed(() => {
    const g = this.gov();
    return g ? againstNation(g.delta) : null;
  });
  readonly top = computed(() => this.gov()?.wilayat.slice(0, this.wide() ? undefined : 5) ?? []);

  readonly results = computed(() => {
    const g = this.gov();
    return g && this.inter() ? interimGov(g.wilayat, this.interim.results()) : null;
  });
  readonly featured = computed((): InterimRow | null => {
    const r = this.results(),
      sp = this.spot();
    return r ? (r.rows.find((x) => x.i === sp) ?? r.rows[0] ?? null) : null;
  });
  readonly lit = computed(() => (this.inter() ? Math.max(0, this.spot()) : this.spot()));
}
