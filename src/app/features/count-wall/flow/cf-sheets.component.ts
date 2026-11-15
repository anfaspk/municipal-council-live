import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { ViewportState } from '../../../core/screen/viewport.state';
import { CfIconComponent } from './cf-icon.component';
import { CfTPipe } from './cf-t.pipe';

export type CfSheet = 'set' | 'act';
export interface CfLine {
  id: number;
  t: string;
  text: string;
  st: string;
}

@Component({
  selector: 'div[cfSheets]',
  imports: [CfIconComponent, CfTPipe],
  host: { class: 'cf-sheets' },
  template: `@if (kind() === 'act') {
      <h2 class="cf-sh-h">{{ 'cfAct' | cfT }}</h2>
      @if (lines().length) {
        <ol class="cf-lines">@for (l of lines(); track l.id) {<li><i [class]="'cf-dot cf-st ' + l.st" aria-hidden="true"></i><span>{{ l.text }}</span><time class="mj-num">{{ l.t }}</time></li>}</ol>
      } @else {
        <p class="cf-wait">{{ 'cfActNone' | cfT }}</p>
      }
    } @else {
      <h2 class="cf-sh-h">{{ 'cfSettings' | cfT }}</h2>
      <div class="cf-opt col"><b id="cf-secs">{{ 'cfSecs' | cfT }}</b>
        <div class="cf-seg" role="group" aria-labelledby="cf-secs">@for (s of secsList(); track s) {<button type="button" [class.on]="s === sec()" [attr.aria-pressed]="s === sec()" (click)="secChange.emit(s)">{{ 'cfSecN' | cfT: { n: s } }}</button>}</div></div>
      <button type="button" class="cf-opt" role="switch" [attr.aria-checked]="still()" [disabled]="osStill()" (click)="stillChange.emit(!still())"><span><b>{{ 'cfStill' | cfT }}</b><small>{{ 'cfStillD' | cfT }}</small></span><span class="cf-sw" [class.on]="still()" aria-hidden="true"><i></i></span></button>
      <button type="button" class="cf-opt" (click)="themeChange.emit()"><span><b>{{ 'cfTheme' | cfT }}</b><small>{{ (theme() === 'night' ? 'cfNight' : 'cfDay') | cfT }}</small></span><svg [cfIcon]="theme() === 'night' ? 'moon' : 'sun'"></svg></button>
      @if (canFull()) {<button type="button" class="cf-opt link" (click)="full()"><svg cfIcon="full"></svg><b>{{ 'cfFull' | cfT }}</b></button>}
      <button type="button" class="cf-opt link" (click)="go.emit('draw')"><svg cfIcon="star"></svg><b>{{ 'cfDraw' | cfT }}</b></button>
      <button type="button" class="cf-opt link" (click)="go.emit('dashboard')"><svg cfIcon="grid"></svg><b>{{ 'cfDash' | cfT }}</b></button>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfSheetsComponent {
  private readonly viewport = inject(ViewportState);
  readonly kind = input.required<CfSheet>();
  readonly lines = input<readonly CfLine[]>([]);
  readonly sec = input(6);
  readonly secsList = input<readonly number[]>([4, 6, 8]);
  readonly still = input(false);
  readonly osStill = input(false);
  readonly theme = input<'night' | 'daylight'>('night');
  readonly secChange = output<number>();
  readonly stillChange = output<boolean>();
  readonly themeChange = output<void>();
  readonly go = output<'draw' | 'dashboard'>();
  protected readonly canFull = computed(
    () => !!document.fullscreenEnabled && this.viewport.display() === 'browser',
  );
  protected full(): void {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }
}
