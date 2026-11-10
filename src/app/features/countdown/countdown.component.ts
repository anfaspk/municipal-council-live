import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../core/clock/server-clock.service';
import { t } from '../../core/i18n/i18n';
import { AmbientComponent } from '../../shared/ui/ambient.component';
import { HorizonComponent } from '../../shared/ui/horizon.component';

const STR = {
  title: t('cdnTitle'),
  sub: t('sub'),
  opens: t('cdnOpens'),
  d: t('cdnD'),
  h: t('cdnH'),
  m: t('cdnM'),
  s: t('cdnS'),
  note: t('cdnNote'),
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
  imports: [AmbientComponent, HorizonComponent],
  host: { class: 'mj-root mj-countdown', 'data-theme': 'night', dir: 'rtl', lang: 'ar' },
  template: `
    <div class="mj-ambient"></div>
    <div class="mj-horizon"></div>
    <main class="cdn-in">
      <img class="cdn-logo" src="assets/logos/election-logo-2026-dark.png" [alt]="s().title">
      <h1 class="cdn-title">{{ s().title }}</h1>
      <div class="mj-micro cdn-sub">{{ s().sub }}</div>
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
  readonly s = (): typeof STR => STR;

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
