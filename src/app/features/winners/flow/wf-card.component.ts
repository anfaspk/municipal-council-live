import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { sharePct } from '../../../domain/format';
import { WCand } from '../../../domain/winners/winners';
import { CountUpDirective, CountUpGroup } from '../../../shared/motion/count-up.directive';
import { WinnerPhotos } from '../winner-photos';
import { WfIconComponent } from './wf-icon.component';
import { WfTPipe } from './wf-t.pipe';
import { posKey } from '../winners.model';
import { CardSize } from './winners-flow.model';
@Component({
  selector: 'article[wfCard]',
  imports: [CountUpDirective, WfIconComponent, WfTPipe],
  providers: [CountUpGroup],
  host: { class: 'wf-card', '[class]': 'size()', '[class.pic]': 'shown()' },
  template: `<div class="wf-por">
      <div class="wf-frame">
        <span class="wf-ini" aria-hidden="true">{{ cand().ini }}</span>
        @if (photo(); as p) {<img class="wf-img" [class.on]="shown()" [src]="p" alt="" width="300" height="360" decoding="async" [attr.fetchpriority]="first() ? 'high' : null" (load)="loaded.set(p)" (error)="broken.set(p)">}
      </div>
      <span class="wf-seal"><span class="wf-medal" aria-hidden="true"><svg wfIcon="check"></svg></span>{{ posKey(cand().pos) | wfT: { n: cand().pos } }}</span>
    </div>
    <div class="wf-plate">
      <h3 class="wf-cname">{{ cand().name }}</h3>
      <p class="wf-fig">
        <span class="wf-votes" [attr.data-fig]="'win.' + cand().id + '.votes'">@if (cand().votes !== null) {<b [mjCountUp]="cand().votes ?? 0" countGroup="wf" [countDuration]="1400"></b>} @else {<b>—</b>}<small>{{ 'wnVotes' | wfT }}</small></span>
        @if (share()) {<span class="wf-pct" [attr.data-fig]="'win.' + cand().id + '.share'"><b>{{ share() }}</b><small>{{ 'wnShare' | wfT }}</small></span>}
      </p>
      @if (part() !== null) {<i class="wf-part" aria-hidden="true" [style.--w]="part()"></i>}
      <button type="button" class="wf-cshare" [attr.aria-label]="'wfShareCand' | wfT: { name: cand().name }" (click)="shared.emit()"><svg wfIcon="share"></svg></button>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfCardComponent {
  readonly cand = input.required<WCand>();
  readonly size = input<CardSize>('two');
  readonly first = input(false);
  readonly still = input(false);
  readonly shared = output<void>();
  private readonly photos = inject(WinnerPhotos);
  protected readonly posKey = posKey;
  protected readonly broken = signal<string | null>(null);
  protected readonly loaded = signal<string | null>(null);
  protected readonly photo = computed(() => {
    const p = this.cand().photo;
    return p && p !== this.broken() ? p : null;
  });
  protected readonly shown = computed(() => {
    const p = this.photo();
    return !!p && (this.loaded() === p || this.photos.ready(p));
  });
  protected readonly share = computed(() => sharePct(this.cand().share));
  protected readonly part = computed(() => {
    const p = this.cand().share;
    return p === null ? null : Math.max(0, Math.min(1, p / 100));
  });
  constructor() {
    const group = inject(CountUpGroup);
    afterNextRender(() => {
      if (!this.still()) group.play('wf');
    });
  }
}
