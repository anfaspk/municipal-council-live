import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { RaceAvatarComponent } from '../../../../shared/ui/race-avatar.component';
import { CfIconComponent } from '../../flow/cf-icon.component';
import { CfTPipe } from '../../flow/cf-t.pipe';
import { DrawToss } from '../draw-toss';
import { TieItem } from '../draw.model';

@Component({
  selector: 'section[cfdReveal]',
  imports: [CfIconComponent, CfTPipe, RaceAvatarComponent],
  host: {
    class: 'cfd-reveal',
    '[attr.aria-label]': "text('cxTossL', { w: item().name })",
    '[class.spin]': "phase() === 'spin'",
    '[class.end]': "phase() === 'end'",
    '[class.drawn]': "item().state === 'drawn'",
  },
  template: `@let it = item(); @let ph = phase(); @let at = lit(); @let w = won();
    <header class="cfd-where"><small>{{ it.gov }} · {{ 'cxdSeats' | cfT: { n: it.seats } }}</small><h1 class="cfd-name" tabindex="-1">{{ it.name }}</h1></header>
    <p class="cfd-line"><b>{{ line() }}</b>@if (tiedLine(); as t) {<span>{{ t }}</span>}</p>
    @if (steps().length) {
      <ol class="cfd-steps" [attr.aria-label]="'cxdSteps' | cfT">
        @for (s of steps(); track s.k; let i = $index) {
          <li [class.done]="s.done" [class.on]="s.on" [attr.aria-current]="s.on ? 'step' : null"><i class="mj-num" aria-hidden="true">{{ i + 1 }}</i><span>{{ s.k | cfT }}</span></li>
        }
      </ol>
    }
    <div class="cfd-coinrow"><span class="cfd-coin" aria-hidden="true"><i [style.--turn]="turns()"></i></span><b class="cfd-st">{{ status() }}</b></div>
    @if (it.tied.length) {
      <ul class="cfd-cands" [class.many]="it.tied.length > 2">
        @for (c of it.tied; track c.id; let i = $index) {
          @let s = w.get(c.id);
          <li class="cfd-c" [class.lit]="at === i" [class.won]="s !== undefined" [class.lost]="ph === 'end' && s === undefined">
            <span class="cfd-av" mjRaceAv [cand]="c"></span>
            <b class="cfd-nm">{{ c.name }}</b>
            <small class="mj-num">{{ 'cxdVotes' | cfT: { v: number(c.v) } }}</small>
            @if (it.state === 'open') {
              @if (it.acks.get(c.id); as a) {<em class="cfd-ack" [class.ok]="a === 'accepted'" [class.off]="a === 'expired'"><i aria-hidden="true"></i>{{ ackText[a] | cfT }}</em>}
            }
            @if (s !== undefined) {<em class="cfd-won"><svg cfIcon="crown"></svg>{{ 'cxTossWon' | cfT: { n: s } }}</em>}
          </li>
        }
      </ul>
    } @else {
      <p class="cfd-wait">{{ 'cxdLoading' | cfT }}</p>
    }
    <p class="cf-sr-only" aria-live="polite">{{ say() }}</p>
    @if (it.held.length) {
      <div class="cfd-held"><span>{{ 'cxdHeld' | cfT }}</span>
        @for (h of it.held; track h.cand.id) {<b><span class="cfd-hav" mjRaceAv [cand]="h.cand"></span><span class="cfd-hn">{{ h.cand.name }}</span><em>{{ 'cxdSeatN' | cfT: { n: h.seat } }}</em></b>}</div>
    }
    @if (it.draw) {
      <button type="button" class="cf-btn cfd-go" (click)="ask.emit()"><svg cfIcon="play"></svg>{{ (seen() ? 'cxdAgain' : 'cxTossGo') | cfT }}</button>
    } @else if (it.state === 'open') {
      @if (progress(); as p) {<p class="cfd-prog">{{ p }}</p>}
      <p class="cfd-note">{{ 'cxdOpenNote' | cfT }}</p>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawRevealComponent extends DrawToss {
  readonly item = input.required<TieItem>({ alias: 'cfdReveal' });
  readonly still = input(false);
  readonly play = input(0);
  readonly hold = input(false);
  readonly active = input(true);
  readonly ask = output();
}
