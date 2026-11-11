import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { TurnoutStore } from '../../../data/turnout.store';
import { fmt } from '../../../domain/format';
import { BootFlag } from '../../../shared/motion/boot';
import { OdometerComponent } from '../../../shared/motion/odometer.component';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { PulseSide, pulseView } from './pulse.model';

interface Half {
  share: string;
  k: number;
  n: number | null;
}
interface Row {
  key: 'reg' | 'vote';
  label: string;
  live: boolean;
  m: Half;
  f: Half;
  aria: string;
}

@Component({
  selector: 'div[gpPulse]',
  imports: [GlyphComponent, OdometerComponent, TPipe],
  host: { class: 'gp-in' },
  styleUrls: ['./pulse.scss'],
  template: `@let v = view();
    <div class="mj-panel-head">
      <div class="mj-ph-l">
        <span class="mj-micro gold">{{ 'gender' | t }}</span
        ><span class="mj-panel-title">{{ 'gpTitle' | t }}</span>
      </div>
    </div>
    <div class="gp-body mj-z" [class.gp-on]="on()">
      <div class="gp-sexes">
        @for (s of [v.m, v.f]; track s.sex) {
          <div class="gp-sex" [class]="s.sex">
            <span class="gp-g"><span [mjGlyph]="s.sex"></span></span>
            <div class="gp-sl">
              <span class="gp-l">{{ s.label }}</span
              ><span class="gp-tn">{{ 'gpTurnout' | t }} <b class="mj-num">{{ s.turnout }}</b></span>
            </div>
          </div>
          @if ($first) {
            <div class="gp-gap">
              <span>{{ 'gpGapL' | t }}</span><b>{{ v.gap ?? '—' }}</b>
            </div>
          }
        }
      </div>
      @for (r of rows(); track r.key) {
        <div class="gp-row" role="img" [attr.aria-label]="r.aria">
          <div class="gp-nums">
            <span class="gp-n m"
              ><b class="mj-num">{{ r.m.share }}</b><i></i
              >@if (r.live) {<span class="mj-num"><span class="mj-odo" [odoValue]="r.m.n ?? 0"></span></span>} @else {<span class="mj-num">{{ count(r.m.n) }}</span>}</span
            ><span class="gp-rl">{{ r.label }}</span
            ><span class="gp-n f"
              >@if (r.live) {<span class="mj-num"><span class="mj-odo" [odoValue]="r.f.n ?? 0"></span></span>} @else {<span class="mj-num">{{ count(r.f.n) }}</span>}<i></i
              ><b class="mj-num">{{ r.f.share }}</b></span>
          </div>
          <div class="gp-split">
            <span class="gp-tr m"><i class="gp-fill" [style.--k]="r.m.k"></i></span
            ><span class="gp-tr f"><i class="gp-fill" [style.--k]="r.f.k"></i></span>
          </div>
        </div>
      }
    </div>
    @if (v.parity !== null) {
      <div class="gp-foot mj-z">{{ 'gpParity' | t: { n: v.parity } }}</div>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulseComponent {
  private readonly stats = inject(TurnoutStore);
  protected readonly view = computed(() => pulseView(this.stats.national()));
  protected readonly rows = computed((): Row[] => {
    const { m, f } = this.view();
    return [
      this.row('reg', t('registered'), false, m, f, (s) => [s.regShare, s.regK, s.reg]),
      this.row('vote', t('gpVoted'), true, m, f, (s) => [s.voteShare, s.voteK, s.voted]),
    ];
  });
  protected readonly on = signal(false);

  constructor() {
    const delay = inject(BootFlag).first ? 900 : 60;
    let timer = 0;
    afterNextRender(() => {
      timer = window.setTimeout(() => this.on.set(true), delay);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected count(n: number | null): string {
    return n === null ? '—' : fmt(n);
  }

  private row(
    key: Row['key'],
    label: string,
    live: boolean,
    m: PulseSide,
    f: PulseSide,
    pick: (s: PulseSide) => [string, number, number | null],
  ): Row {
    const half = (s: PulseSide): Half => {
      const [share, k, n] = pick(s);
      return { share, k, n };
    };
    const hm = half(m),
      hf = half(f);
    return {
      key,
      label,
      live,
      m: hm,
      f: hf,
      aria: t('gpRowL', {
        r: label,
        m: hm.share,
        a: this.count(hm.n),
        f: hf.share,
        b: this.count(hf.n),
      }),
    };
  }
}
