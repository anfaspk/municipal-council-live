import { fl } from './flow-strings';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { TurnoutStore } from '../../../data/turnout.store';
import { pct } from '../../../domain/format';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { SnapItemDirective, SnapRowComponent } from '../../../shared/ui/snaprow/snaprow.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { agesOf, ageView, genView, type Scope, wilView } from '../insights/insights.model';
import { FlTPipe } from './fl-t.pipe';

const CYCLE = 10_000;

@Component({
  selector: 'section[flInsights]',
  imports: [SnapRowComponent, SnapItemDirective, GlyphComponent, TPipe, FlTPipe],
  host: { class: 'fl-block fl-ins', '[attr.aria-label]': 'label' },
  template: `<div mjSnapRow [label]="'flInsL' | flT" [paged]="cycle()">
    <article mjSnapItem class="fl-card fl-ins-card"><p class="fl-micro">{{ 'flInsMicro' | flT: { i: 1, n: 3 } }}</p><h2 class="fl-h2">{{ 'flGenT' | flT }}</h2>
      @let g = gen();
      <div class="fl-bf-head"><span class="fl-sex m" mjGlyph="m"></span><span>{{ 'male' | t }} · {{ g.mPeak }}</span><span>{{ 'female' | t }} · {{ g.fPeak }}</span><span class="fl-sex f" mjGlyph="f"></span></div>
      @for (r of genRows(); track r.hour) {<div class="fl-bf"><span class="m"><i [style.--k]="r.km"></i></span><em dir="ltr">{{ r.hour }}</em><span class="f"><i [style.--k]="r.kf"></i></span></div>}
      <p class="fl-foot">{{ g.gap }}</p></article>
    <article mjSnapItem class="fl-card fl-ins-card" #wilCard><p class="fl-micro">{{ 'flInsMicro' | flT: { i: 2, n: 3 } }}</p><h2 class="fl-h2">{{ 'ixWilT' | t }}</h2>
      @let w = wil();
      <ol class="fl-lead">@for (r of w.rows; track $index) {@if (r) {<li><span class="fl-rank" [class]="r.band">{{ $index + 1 }}</span><span class="fl-row-main"><b>{{ r.name }}</b><small>{{ r.sub }}</small><span class="fl-track" aria-hidden="true"><span class="fl-fill" [class]="r.band" [style.--k]="r.t / 100"></span></span></span><b class="fl-ink" [class]="r.band">{{ pct(r.t) }}</b></li>}}</ol></article>
    <article mjSnapItem class="fl-card fl-ins-card"><p class="fl-micro">{{ 'flInsMicro' | flT: { i: 3, n: 3 } }}</p><h2 class="fl-h2">{{ 'flAgeT' | flT }}</h2>
      @let a = age();
      <p class="fl-say small">{{ a.head }}</p>
      <div class="fl-ages">@for (c of a.cols; track c.label) {<div class="fl-age" [class.top]="c.top" role="img" [attr.aria-label]="c.aria"><div class="cols"><i class="m" [style.--k]="c.km"></i><i class="f" [style.--k]="c.kf"></i></div><em dir="ltr">{{ c.label }}</em><small>{{ c.share }}</small></div>}</div>
      <div class="fl-key"><span class="fl-sex m" mjGlyph="m"></span>{{ 'male' | t }} <span class="fl-sex f" mjGlyph="f"></span>{{ 'female' | t }}</div></article>
  </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowInsightsComponent {
  protected readonly label = fl('flInsL');
  private readonly stats = inject(TurnoutStore);
  protected readonly pct = pct;
  private readonly wilCard = viewChild.required<ElementRef<HTMLElement>>('wilCard');
  private readonly scope = computed((): Scope => {
    const n = this.stats.national();
    return { g: null, total: n.voted, m: n.votedM, f: n.votedF, hours: n.hours };
  });
  protected readonly gen = computed(() => genView(this.scope()));
  protected readonly genRows = computed(() => {
    const rows = this.gen().rows.filter((r) => r.m || r.f),
      max = Math.max(1, ...rows.map((r) => Math.max(r.m, r.f)));
    return rows.map((r) => ({ hour: r.hour, km: r.m / max, kf: r.f / max }));
  });
  protected readonly wil = computed(() => wilView(this.scope(), this.stats.govs()));
  protected readonly age = computed(() =>
    ageView({ ...this.scope(), ages: agesOf(this.stats.govs()) }),
  );

  readonly cycle = input(false);
  private readonly row = viewChild.required(SnapRowComponent);
  private readonly screen = inject(ScreenState);

  constructor() {
    effect((onCleanup) => {
      if (!this.cycle() || !this.screen.is('dashboard')) return;
      const id = setInterval(() => this.row().cycle(), CYCLE);
      onCleanup(() => clearInterval(id));
    });
    let io: IntersectionObserver | null = null;
    afterNextRender(() => {
      io = new IntersectionObserver(([e]) => {
        if (e?.isIntersecting) this.stats.needRegions(this, 'all');
        else this.stats.release(this);
      });
      io.observe(this.wilCard().nativeElement);
    });
    inject(DestroyRef).onDestroy(() => {
      io?.disconnect();
      this.stats.release(this);
    });
  }
}
