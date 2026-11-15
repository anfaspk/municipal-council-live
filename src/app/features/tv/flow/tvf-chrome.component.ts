import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { TvView } from '../tv.view';
import { TvfIconComponent } from './tvf-icon.component';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'header[tvfChrome]',
  imports: [TvfIconComponent, TvfTPipe],
  host: { class: 'tvf-chrome' },
  template: `@let s = view.slide();
    @if (!pinned()) {<ol class="tvf-prog" [class.held]="held()" [style.--seg-ms.ms]="segMs()" aria-hidden="true">@for (st of segs(); track round() + ':' + $index) {<li [class]="st"><i></i></li>}</ol>}
    <div class="tvf-head">
      @if (view.staleAt(); as at) {<span class="tvf-live stale"><i></i>{{ 'figuresAt' | tvfT: { t: at } }}</span>} @else {<span class="tvf-live"><i></i>{{ (s?.done ? 'declared' : 'live') | tvfT }}</span>}
      @if (pinned()) {<span class="tvf-count pin"><svg tvfIcon="pin"></svg>{{ 'tvfPinned' | tvfT }}</span>} @else if (s) {<span class="tvf-count" dir="ltr">{{ s.count }}</span>}
      @if (view.phase() === 'soon' && view.left(); as l) {
        <span class="tvf-int soon" [title]="'intSoonL' | tvfT: { t: view.fromAt() ?? '' }"><i></i>{{ 'intSoon' | tvfT }} <b>{{ l }}</b></span>
      } @else if (view.phase() === 'open' && view.left(); as l) {
        <span class="tvf-int"><i></i>{{ 'intTab' | tvfT }} · {{ 'intEnds' | tvfT }} <b>{{ l }}</b></span>
      }
      <span class="tvf-tools">
        <button type="button" class="tvf-btn" [attr.aria-label]="'tvfSettings' | tvfT" [title]="'tvfSettings' | tvfT" (click)="settings.emit()"><svg tvfIcon="gear"></svg></button>
        @if (!pinned()) {<button type="button" class="tvf-btn tvf-pause" [class.on]="paused()" [attr.aria-label]="(paused() ? 'tvPlay' : 'tvPause') | tvfT" [title]="(paused() ? 'tvPlay' : 'tvPause') | tvfT" (click)="playPause.emit()"><svg [tvfIcon]="paused() ? 'play' : 'pause'"></svg></button>}
        <button type="button" class="tvf-btn" [attr.aria-label]="'tvfClose' | tvfT" [title]="'tvfClose' | tvfT" (click)="leave.emit()"><svg tvfIcon="close"></svg></button>
      </span>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfChromeComponent {
  protected readonly view = inject(TvView);
  readonly segs = input.required<string[]>();
  readonly segMs = input.required<number>();
  readonly round = input.required<number>();
  readonly pinned = input.required<boolean>();
  readonly paused = input.required<boolean>();
  readonly held = input(false);
  readonly settings = output<void>();
  readonly playPause = output<void>();
  readonly leave = output<void>();
}
