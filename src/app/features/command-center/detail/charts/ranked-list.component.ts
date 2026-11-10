import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { fmt, pct } from '../../../../domain/format';
import { FRAME_SCOPE, FrameLoop } from '../../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../../shared/motion/reduced-motion';
import { dt } from '../detail-strings';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { DtTPipe } from '../dt-t.pipe';
import { RankInput, rankedModel, RankRow, RankSort } from './ranked.model';

@Component({
  selector: 'div.dt-ranked',
  imports: [DtTPipe, IconComponent],
  host: { '(keydown)': 'key($event)' },
  template: `@let m = model();
<ol class="dt-rows" [style.--tick]="m.tick ?? 0" [class.ticked]="m.tick !== null">
  @for (r of m.rows; track r.id; let i = $index) {
    <li [style.--j]="i" [attr.data-id]="r.id">
      <button type="button" class="dt-row" [class]="r.band" [class.hot]="hot() === r.id" [attr.aria-label]="say(r)" (click)="pick.emit(r.id)" (pointerenter)="hover.emit(r.id)" (pointerleave)="hover.emit(null)" (focus)="hover.emit(r.id)" (blur)="hover.emit(null)">
        <span class="dt-rk mj-num">{{ r.rank }}</span>
        <span class="dt-nm">{{ r.name }}</span>
        <span class="dt-track" aria-hidden="true"><i class="dt-fill" [style.--k]="r.k"></i></span>
        <b class="dt-t mj-num"><i class="mj-sw" [class]="r.band"></i>{{ pct(r.t) }}</b>
        <small class="dt-v mj-num">{{ 'dtVotesN' | dtT: { n: fmt(r.voted) } }}</small>
        <svg class="dt-go" [mjIcon]="'prev'"></svg>
      </button>
    </li>
  }
</ol>
@if (refLabel() && m.tick !== null) {<p class="dt-key dt-ranked-key" aria-hidden="true"><span><i class="dt-sw tick"></i>{{ refLabel() }}</span></p>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankedListComponent<K = number | string> {
  readonly rows = input.required<readonly RankInput<K>[]>();
  readonly sort = input<RankSort>('turnout');
  readonly ref = input<number | null>(null);
  readonly refLabel = input('');
  readonly hot = input<K | null>(null);
  readonly pick = output<K>();
  readonly hover = output<K | null>();
  protected readonly fmt = fmt;
  protected readonly pct = pct;
  protected readonly model = computed(() => rankedModel(this.rows(), this.sort(), this.ref()));
  private places = new Map<string, number>();
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    const host = this.host,
      frames = inject(FrameLoop),
      scope = inject(FRAME_SCOPE);
    afterRenderEffect(() => {
      this.model();
      const rows = Array.from(host.querySelectorAll<HTMLElement>('.dt-rows > li')),
        now = new Map(rows.map((li) => [li.dataset['id']!, li.offsetTop]));
      if (!reducedMotion() && !frames.isPaused(scope))
        rows.forEach((li) => {
          const from = this.places.get(li.dataset['id']!),
            to = now.get(li.dataset['id']!)!;
          if (from !== undefined && from !== to)
            li.firstElementChild?.animate(
              [{ transform: `translateY(${from - to}px)` }, { transform: 'none' }],
              { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' },
            );
        });
      this.places = now;
    });
  }
  protected key(e: KeyboardEvent): void {
    const k = e.key;
    if (k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return;
    const rows = Array.from(this.host.querySelectorAll<HTMLElement>('.dt-row')),
      i = rows.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    const j = k === 'Home' ? 0 : k === 'End' ? rows.length - 1 : i + (k === 'ArrowDown' ? 1 : -1);
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, j))]!.focus();
  }
  protected say(r: RankRow<K>): string {
    return dt('dtRankRow', { r: r.rank, p: r.name, t: pct(r.t), n: fmt(r.voted) });
  }
}
