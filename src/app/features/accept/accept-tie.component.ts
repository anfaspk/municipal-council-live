import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { AcceptPerson, AcceptView } from '../../domain/conflict/accept';
import { fmt } from '../../domain/format';
import { AcceptAvatarComponent } from './accept-avatar.component';
import { at } from './accept-strings';
import { CaTPipe } from './ca-t.pipe';

const ACK: Record<string, string> = {
  accepted: 'caAckOk',
  pending: 'caAckWait',
  expired: 'caAckOff',
};

@Component({
  selector: 'section.ca-tie[caTie]',
  imports: [AcceptAvatarComponent, CaTPipe],
  template: `
    <h2 class="ca-sec-t">{{ title() }}</h2>
    @if (each(); as e) {
      <p class="ca-sec-s">{{ e }}</p>
    }
    <ul class="ca-ppl" [attr.aria-label]="'caTied' | caT">
      @for (p of people(); track p.id) {
        <li class="ca-p" [class.me]="p.me">
          <span class="ca-av" [caAv]="p"></span>
          <span class="ca-pn">
            {{ p.name }}
            @if (p.me) {
              <em class="ca-you">{{ 'caYou' | caT }}</em>
            }
          </span>
          @if (badge(p); as b) {
            <span class="ca-ack" [attr.data-a]="b.k">{{ b.text }}</span>
          }
        </li>
      }
    </ul>
    @if (!drawn()) {
      <p class="ca-acks">{{ 'caAcks' | caT: { a: view().acks.done, n: view().acks.all } }}</p>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptTieComponent {
  readonly view = input.required<AcceptView>();

  protected readonly drawn = computed(() => this.view().state === 'drawn');
  protected readonly people = computed(() => {
    const v = this.view();
    return v.me ? [v.me, ...v.others] : v.others;
  });
  protected readonly title = computed(() => {
    const k = this.view().kind;
    return at(k === 's' ? 'caTieS' : k === 'f' ? 'caTieF' : 'caTie');
  });
  protected readonly each = computed(() => {
    const v = this.view().votes;
    return v === null ? null : at('caEach', { n: fmt(v) });
  });

  protected badge(p: AcceptPerson): { k: string; text: string } | null {
    if (this.drawn()) return p.won ? { k: 'won', text: at('caWonBadge') } : null;
    const key = p.ack ? ACK[p.ack] : undefined;
    return key && p.ack ? { k: p.ack, text: at(key) } : null;
  }
}
