import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { GEO } from '../../../domain/geo/geo.data';
import { labelOffset, leadPath, mapViewBox0 } from '../map/oman-map.model';
import { TPipe } from '../../../shared/ui/t.pipe';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { fl, flParts } from './flow-strings';
import { GOV_SORTS } from './flow.model';

const wider = ([x, y, w, h]: readonly number[]) => [x! - 50, y!, w! + 100, h!];
const SORT_KEY = { turnout: 'sTurnout', votes: 'sVotes', name: 'sName' } as const;

@Component({
  selector: 'section[flGovs]',
  imports: [TPipe, FlTPipe, FlIconComponent],
  host: { class: 'fl-block fl-govs', '[attr.aria-label]': 'label' },
  template: `<div class="fl-sec"><div><p class="fl-micro">{{ 'flGovsMicro' | flT }}</p><h2 class="fl-h2">{{ 'flGovsT' | flT }}</h2></div><span class="fl-count">{{ 'govCount' | t: { n: view.govCount() } }}</span></div>
    @if (!both()) {<div class="fl-seg" role="group" [attr.aria-label]="'flViews' | flT"><button type="button" [class.on]="!map()" [attr.aria-pressed]="!map()" (click)="map.set(false)">{{ 'flList' | flT }}</button><button type="button" [class.on]="map()" [attr.aria-pressed]="map()" (click)="map.set(true)">{{ 'flMap' | flT }}</button></div>}
    <div class="fl-govs-body" [class.both]="both()">
    @if (both() || !map()) {<div class="fl-govs-list">
      <div class="fl-sort" role="group" [attr.aria-label]="'flSortL' | flT">@for (s of sorts; track s) {<button type="button" class="fl-chip" [class.on]="view.sort() === s" [attr.aria-pressed]="view.sort() === s" (click)="view.sort.set(s)">{{ sortKey[s] | t }}</button>}</div>
      <ol class="fl-list">@for (r of rows(); track r.id) {<li><button type="button" class="fl-row" [class.moved]="view.moved().has(r.id)" [class.lit]="lit() === r.id" (click)="pick.emit(r.id)">
        <span class="fl-rank" [class]="r.band">{{ r.rank }}</span>
        <span class="fl-row-main"><b>{{ r.ar }}</b><span class="fl-track" aria-hidden="true"><span class="fl-fill" [class]="r.band" [style.--k]="r.t / 100"></span></span></span>
        <span class="fl-row-end"><b class="fl-ink" [class]="r.band" [attr.data-fig]="'gov.' + r.id + '.turnout'">{{ r.pct }}</b><small>@for (p of r.vp; track $index) {@if (p.bold) {<span [attr.data-fig]="'gov.' + r.id + '.voted'">{{ p.text }}</span>} @else {{{ p.text }}}}</small></span>
        <svg class="fl-go" flIcon="back"></svg></button></li>}</ol></div>
    }
    @if (both() || map()) {<div class="fl-govs-map">
      <div class="fl-map" dir="ltr"><svg [attr.viewBox]="viewBox" [attr.role]="both() ? null : 'group'" [attr.aria-label]="both() ? null : ('flMapL' | flT)" [attr.aria-hidden]="both() ? 'true' : null"><path class="ol" [attr.d]="geo.outline" aria-hidden="true"/>
        @for (s of shapes(); track s.id) {<path class="fl-shape" [class]="s.band" [class.lit]="lit() === s.id" [attr.d]="s.d" [attr.role]="both() ? null : 'button'" [attr.tabindex]="both() ? null : 0" [attr.aria-label]="both() ? null : s.ar + '، ' + s.pct" (click)="pick.emit(s.id)" (keydown.enter)="pick.emit(s.id)" (keydown.space)="$event.preventDefault(); pick.emit(s.id)"/>}
        @for (s of shapes(); track s.id) {@if (s.lead) {<path class="fl-lead-l" [attr.d]="s.lead" aria-hidden="true"/>}}
        @for (s of shapes(); track s.id) {<text [attr.x]="s.x" [attr.y]="s.y" aria-hidden="true"><tspan class="n" [attr.x]="s.x" dy="-6">{{ s.ar }}</tspan><tspan [attr.x]="s.x" dy="22">{{ s.pct }}</tspan></text>}</svg></div>
      @if (tour() && litRow(); as r) {<div class="fl-tour"><p class="fl-micro">{{ 'flGov' | flT }} · {{ 'flTour' | flT }}</p><b class="fl-tour-name">{{ r.ar }}</b><b class="fl-ink fl-tour-fig" [class]="r.band">{{ r.pct }}</b><div class="fl-chips"><span class="fl-chip">{{ 'flRankOf' | flT: { r: r.rank, n: view.govCount() } }}</span><span class="fl-chip band" [class]="r.band"><i aria-hidden="true"></i>{{ 'flBand-' + r.band | flT }}</span></div><i class="fl-tour-t" aria-hidden="true"></i></div>}
      @if (hint()) {<p class="fl-hint">{{ 'flMapHint' | flT }}</p>}
      <div class="fl-legend">@for (b of bands; track b) {<span class="fl-chip band" [class]="b"><i aria-hidden="true"></i>{{ 'flBand-' + b | flT }}</span>}</div></div>
    }
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowGovsComponent {
  protected readonly label = fl('flGovsMicro');
  protected readonly view = inject(DashboardView);
  readonly pick = output<string>();
  readonly both = input(false);
  readonly lit = input<string | null>(null);
  readonly hint = input(true);
  readonly tour = input(false);
  protected readonly litRow = computed(
    () => this.view.rows().find((r) => r.id === this.lit()) ?? null,
  );
  protected readonly map = signal(false);
  protected readonly sorts = GOV_SORTS;
  protected readonly sortKey = SORT_KEY;
  protected readonly bands = ['low', 'mid', 'high'] as const;
  protected readonly geo = GEO;
  protected readonly viewBox = wider(mapViewBox0(GEO.w, GEO.h)).join(' ');
  protected readonly rows = computed(() =>
    this.view.rows().map((r) => ({ ...r, vp: flParts('flVoteN', { n: r.votes }, ['n']) })),
  );
  protected readonly shapes = computed(() =>
    this.view
      .rows()
      .filter((r) => GEO.g[r.id])
      .map((r) => {
        const g = GEO.g[r.id]!,
          [dx, dy] = labelOffset(r.id),
          x = g.c[0] + dx,
          y = g.c[1] + dy;
        return { ...r, d: g.d, x, y, lead: dx || dy ? leadPath(g.c, 0, x, y - 4) : null };
      }),
  );
}
