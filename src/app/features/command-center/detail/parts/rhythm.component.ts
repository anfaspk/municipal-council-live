import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { fmt, pct } from '../../../../domain/format';
import { SegComponent, SegItem } from '../../../../shared/ui/seg.component';
import { orDash } from '../charts/chart';
import { boxOf } from '../charts/chart-box';
import { ChartDirective } from '../charts/chart-tip';
import { EasePathDirective } from '../charts/ease-path.directive';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { hourLabel, Rhythm, rhythmModel, RhythmSeries } from './rhythm.model';

export type RhythmView = 'bars' | 'cum';

@Component({
  selector: 'div.dt-rhy-plot',
  imports: [ChartDirective, EasePathDirective],
  template: `@let p = model();
<svg class="dt-svg" [class]="view()" [attr.viewBox]="'0 0 ' + box().w + ' ' + box().h" [dtChart]="summary()" [dtTips]="tips()" #c="dtChart">
  @for (t of view() === 'bars' ? p.yTicks : p.pTicks; track $index) {<line class="dt-gl" [attr.x1]="p.left" [attr.x2]="p.right" [attr.y1]="t.y" [attr.y2]="t.y"/><text class="dt-ax end" [attr.x]="p.left - 8" [attr.y]="t.y">{{ t.v }}</text>}
  @for (t of p.xLabels; track t.label) {<text class="dt-ax mid" [attr.x]="t.x" [attr.y]="p.bottom + 18">{{ t.label }}</text>}
  @if (view() === 'bars') {
    <g class="dt-rhy-bars">
      @for (b of p.bars; track b.h; let i = $index) {
        <g class="dt-rhy-bar" [class.peak]="b.peak" [class.on]="c.active() === i" [style.--j]="i">
          <rect class="m" [attr.x]="b.x" [attr.y]="b.ym" [attr.width]="b.w" [attr.height]="b.y0 - b.ym" rx="3"/>
          <rect class="f" [attr.x]="b.x" [attr.y]="b.yf" [attr.width]="b.w" [attr.height]="b.ym - b.yf" rx="3"/>
        </g>
      }
    </g>
    @if (p.peak; as k) {
      <g class="dt-rhy-peak" aria-hidden="true">
        <text class="dt-lab" [attr.x]="k.x + k.w / 2" [attr.y]="k.yf - 10">{{ fmt(k.v) }}</text>
      </g>
    }
  } @else {
    <g class="dt-rhy-cum">
      <path class="dt-rhy-area" [dtD]="p.area"/>
      <path class="dt-ref" [dtD]="p.ref"/>
      <path class="dt-cum" [dtD]="p.line"/>
      @if (p.refEnd; as e) {<circle class="dt-rhy-dot ref" [attr.cx]="e.x" [attr.cy]="e.y" r="4"/><text class="dt-lab ref" [attr.x]="e.x - 10" [attr.y]="e.y + (p.end && e.y > p.end.y ? 16 : -10)">{{ endText(refName(), e.text) }}</text>}
      @if (p.end; as e) {<circle class="dt-rhy-dot" [attr.cx]="e.x" [attr.cy]="e.y" r="5"/><text class="dt-lab own" [attr.x]="e.x - 10" [attr.y]="e.y + (p.refEnd && p.refEnd.y < e.y ? 18 : -10)">{{ endText(name(), e.text) }}</text>}
    </g>
  }
  @for (b of p.bars; track b.h; let i = $index) {<rect class="dt-hit" [class.on]="c.active() === i" [attr.data-i]="i" [attr.x]="b.x - (step(p) - b.w) / 2" [attr.y]="p.top" [attr.width]="step(p)" [attr.height]="p.bottom - p.top"/>}
</svg>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RhythmPlotComponent {
  readonly series = input.required<RhythmSeries>();
  readonly ref = input<RhythmSeries | null>(null);
  readonly view = input<RhythmView>('bars');
  readonly name = input('');
  readonly refName = input('');
  protected readonly box = boxOf();
  protected readonly fmt = fmt;
  protected readonly model = computed(() => rhythmModel(this.series(), this.ref(), this.box()));
  protected readonly endText = (name: string, t: string) => name + ' \u2066' + t + '\u2069';
  protected readonly step = (p: Rhythm) => (p.bars.length ? (p.right - p.left) / p.bars.length : 0);
  protected readonly tips = computed(() =>
    this.model().bars.map((b) =>
      this.view() === 'bars'
        ? dt('dtTipBar', {
            h: hourLabel(b.h) + '–' + hourLabel(b.h + 1),
            m: fmt(b.m),
            f: fmt(b.f),
            v: fmt(b.v),
          })
        : dt('dtTipCum', { h: hourLabel(b.h + 1), t: orDash(b.t, pct) }),
    ),
  );
  protected readonly summary = computed(() => {
    const p = this.model(),
      first = p.bars[0],
      last = p.bars[p.bars.length - 1];
    if (!first || !last) return dt('dtSumHrs0');
    if (this.view() === 'cum')
      return dt('dtSumCum', { t: orDash(last.t, pct), h: hourLabel(last.h + 1) });
    return dt('dtSumRhy', {
      a: first.label,
      b: hourLabel(last.h + 1),
      h: p.peak?.label ?? '—',
      n: p.peak?.v ?? 0,
    });
  });
}

@Component({
  selector: 'div.dt-rhy',
  imports: [DtTPipe, RhythmPlotComponent, SegComponent],
  template: `@let pk = peak();
<div class="mj-panel-head dt-chd">
  <div class="mj-ph-l"><h3 class="mj-micro gold dt-ch" [id]="hid()">{{ 'dtT.rhythm' | dtT }}</h3><p class="mj-panel-title dt-cs">{{ 'dtS.rhythm.' + view() | dtT }}</p></div>
  <div class="dt-chd-end">
    @if (pk && view() === 'bars') {<p class="dt-stat"><span>{{ 'dtPeak' | dtT }}</span><b class="mj-num">{{ 'dtPeakV' | dtT: { h: pk.label, n: fmt(pk.v) } }}</b></p>}
    <div class="dt-sort mj-seg" [items]="views" [value]="view()" (valueChange)="view.set($any($event))" [attr.aria-label]="'dtRhyL' | dtT"></div>
  </div>
</div>
<div class="dt-rhy-plot" [series]="series()" [ref]="ref()" [view]="view()" [name]="name()" [refName]="refName()"></div>
<p class="dt-key" aria-hidden="true">
  @if (view() === 'bars') {<span><i class="dt-sw m"></i>{{ 'dtMen' | dtT }}</span><span><i class="dt-sw f"></i>{{ 'dtWomen' | dtT }}</span>}
  @else {<span><i class="dt-sw cum"></i>{{ name() }}</span>@if (ref()) {<span><i class="dt-sw ref"></i>{{ refName() }}</span>}}
</p>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RhythmComponent {
  readonly series = input.required<RhythmSeries>();
  readonly ref = input<RhythmSeries | null>(null);
  readonly name = input('');
  readonly refName = input('');
  readonly hid = input('dt-h-rhythm');
  protected readonly views: SegItem[] = (['bars', 'cum'] as const).map((v) => ({
    v,
    label: dt('dtRhy.' + v),
  }));
  protected readonly view = signal<RhythmView>('bars');
  protected readonly fmt = fmt;
  protected readonly peak = computed(() => {
    const hs = this.series().hours;
    const top = hs.reduce<(typeof hs)[number] | null>(
      (a, b) => (b.v > 0 && (!a || b.v > a.v || (b.v === a.v && b.h < a.h)) ? b : a),
      null,
    );
    return top ? { label: hourLabel(top.h), v: top.v } : null;
  });
}
