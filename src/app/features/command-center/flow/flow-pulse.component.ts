import { t } from '../../../core/i18n/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  ViewEncapsulation,
} from '@angular/core';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';

@Component({
  selector: 'section[flPulse]',
  imports: [GlyphComponent, TPipe, FlTPipe, FlIconComponent],
  host: { class: 'fl-card fl-pulse', '[attr.aria-label]': 'label' },
  template: `@let v = view.pulse();
    <div class="fl-sec"><div><p class="fl-micro">{{ 'gender' | t }}</p><h2 class="fl-h2">{{ 'flPulseT' | flT }}</h2></div></div>
    <div class="fl-ps-row">@for (s of [v.m, v.f]; track s.sex) {<div class="fl-ps" [class]="s.sex"><span class="fl-sex" [mjGlyph]="s.sex"></span><span>{{ s.label }}</span><b class="mj-num" [attr.data-fig]="'pulse.' + s.sex + '.turnout'">{{ s.turnout }}</b><small>{{ 'flTurnoutL' | flT }}</small></div>@if (s.sex === 'm') {<span class="fl-gap" data-fig="pulse.gap">{{ v.gap ?? '—' }}</span>}}</div>
    @if (open()) {<div class="fl-splits" id="fl-pulse-more">
      <div class="fl-split"><div class="fl-split-l"><b>{{ v.m.regShare }}</b><em>{{ 'registered' | t }}</em><b>{{ v.f.regShare }}</b></div><div class="fl-split-bar" aria-hidden="true"><i class="m" [style.--k]="v.m.regK"></i><i class="f" [style.--k]="v.f.regK"></i></div></div>
      <div class="fl-split"><div class="fl-split-l"><b>{{ v.m.voteShare }}</b><em>{{ 'flVoters' | flT }}</em><b>{{ v.f.voteShare }}</b></div><div class="fl-split-bar" aria-hidden="true"><i class="m" [style.--k]="v.m.voteK"></i><i class="f" [style.--k]="v.f.voteK"></i></div></div>
      @if (v.parity !== null) {<p class="fl-foot">{{ 'gpParity' | t: { n: v.parity } }}</p>}</div>}
    @if (!fixed()) {<button type="button" class="fl-more" aria-controls="fl-pulse-more" [attr.aria-expanded]="open()" (click)="open.set(!open())">{{ (open() ? 'flPulseLess' : 'flPulseMore') | flT }}<svg [flIcon]="open() ? 'up' : 'down'"></svg></button>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowPulseComponent {
  protected readonly label = t('gender');
  protected readonly view = inject(DashboardView);
  readonly expanded = input(false);
  readonly fixed = input(false);
  protected readonly open = linkedSignal(() => this.expanded() || this.fixed());
}
