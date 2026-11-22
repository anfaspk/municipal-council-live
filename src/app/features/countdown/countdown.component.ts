import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../core/clock/server-clock.service';
import { t } from '../../core/i18n/i18n';
import { Fullscreen } from '../../core/screen/fullscreen';
import { ViewportState } from '../../core/screen/viewport.state';
import { screenKey } from '../../shared/motion/screen-keys';
import { AmbientComponent } from '../../shared/ui/ambient.component';
import { LOGO, LOGO_DARK, logoFor, MOI_LOGO, MOI_LOGO_DARK } from '../../shared/ui/brand';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { loadTheme, themeOf } from '../command-center/theme-pref';
const STR = {
  title: t('cdnTitle'),
  moi: t('moiLogoAlt'),
  sub: t('cdnSub'),
  opens: t('cdnOpens'),
  d: t('cdnD'),
  h: t('cdnH'),
  m: t('cdnM'),
  s: t('cdnS'),
  note: t('cdnNote'),
  full: t('full'),
  fullOff: t('fullOff'),
};
const DATE = new Intl.DateTimeFormat('ar-u-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Muscat',
});
const two = (n: number) => (n < 10 ? '0' : '') + n;
@Component({
  selector: 'app-countdown',
  imports: [AmbientComponent, HorizonComponent, IconComponent],
  host: {
    class: 'mj-root mj-countdown',
    '[class.cdn-flow]': 'flow()',
    '[attr.data-form]': 'flow() ? "flow" : null',
    '[attr.data-fx]': 'flow() ? viewport.fx() : null',
    '[attr.data-theme]': 'theme()',
    dir: 'rtl',
    lang: 'ar',
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    <div class="mj-ambient"></div>
    <div class="mj-horizon"></div>
    @if (full.offered()) {<button class="mj-btn icon cdn-full" type="button" [title]="full.on() ? s().fullOff : s().full" [attr.aria-label]="full.on() ? s().fullOff : s().full" (click)="full.toggle()"><svg [mjIcon]="full.on() ? 'shrink' : 'expand'"></svg></button>}
    <main class="cdn-in">
      <span class="cdn-logos"><img [attr.src]="logos().moi.src" [attr.srcset]="logos().moi.srcset" [alt]="s().moi" decoding="async" width="790" height="875"><i aria-hidden="true"></i><img [attr.src]="logos().el.src" [attr.srcset]="logos().el.srcset" [alt]="s().title" decoding="async" width="1000" height="1082"></span>
      <h1 class="cdn-title">{{ s().title }}</h1>
      <!-- <div class="mj-micro cdn-sub">{{ s().sub }}</div> -->
      <div class="cdn-opens mj-micro gold">{{ s().opens }}</div>
      <div class="cdn-clock" role="timer" [attr.aria-label]="left()">
        @for (u of units(); track u.k) {
          <div class="cdn-u mj-glass"><b class="mj-num">{{ u.v }}</b><span class="mj-micro">{{ u.l }}</span></div>
        }
      </div>
      <div class="cdn-at">{{ at() }}</div>
      <div class="mj-micro cdn-note">{{ s().note }}</div>
    </main>
  `,
  styleUrl: './countdown.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  private readonly clock = inject(ServerClock);
  protected readonly viewport = inject(ViewportState);
  protected readonly full = inject(Fullscreen);
  readonly s = (): typeof STR => STR;
  protected readonly flow = computed(() => this.viewport.dashForm() === 'flow');
  protected readonly theme = computed(() =>
    this.flow() ? themeOf(loadTheme(), 'flow', this.viewport.scheme()) : 'night',
  );
  protected readonly logos = computed(() => {
    const night = this.theme() === 'night',
      flow = this.flow();
    return {
      moi: logoFor(night ? MOI_LOGO_DARK : MOI_LOGO, flow),
      el: logoFor(night ? LOGO_DARK : LOGO, flow),
    };
  });
  protected onKey(e: KeyboardEvent): void {
    if (e.repeat || screenKey(e)?.type !== 'fullscreen') return;
    e.preventDefault();
    this.full.toggle();
  }
  readonly parts = computed(() => {
    const t = Math.max(0, Math.ceil((this.clock.left() ?? 0) / 1000));
    return {
      d: Math.floor(t / 86400),
      h: Math.floor(t / 3600) % 24,
      m: Math.floor(t / 60) % 60,
      s: t % 60,
    };
  });
  readonly units = computed(() => {
    const p = this.parts(),
      s = this.s();
    return [
      { k: 'd', v: two(p.d), l: s.d },
      { k: 'h', v: two(p.h), l: s.h },
      { k: 'm', v: two(p.m), l: s.m },
      { k: 's', v: two(p.s), l: s.s },
    ];
  });
  readonly left = computed(() => t('cdnLeft', this.parts()));
  readonly at = computed(() => {
    const ms = this.clock.votingStart();
    if (ms === null) return '';
    const o = new Date(ms + 4 * 3600 * 1000);
    return t('cdnAt', {
      d: DATE.format(ms),
      t: two(o.getUTCHours()) + ':' + two(o.getUTCMinutes()),
    });
  });
}
