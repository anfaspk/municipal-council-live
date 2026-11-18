import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../core/i18n/i18n';
import { type Display, formOf, fxOf, parseForm } from '../../core/screen/layout.model';
import { AmbientComponent } from '../../shared/ui/ambient.component';
import { LOGO, LOGO_DARK, logoFor, MOI_LOGO, MOI_LOGO_DARK } from '../../shared/ui/brand';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { loadTheme, themeOf } from '../command-center/theme-pref';
import { KEY_PARAM, remember, withoutParam } from './gate';
import { keyMatches } from './lock.model';

const mq = (q: string) => matchMedia(q).matches;
function readEnv() {
  const display: Display = mq('(display-mode: fullscreen)')
    ? 'fullscreen'
    : mq('(display-mode: standalone)')
      ? 'standalone'
      : 'browser';
  const coarse = mq('(pointer: coarse)');
  const form = formOf({
    vw: innerWidth,
    vh: innerHeight,
    zoom: 1,
    screen: 'dashboard',
    forced: parseForm(location.search),
    coarse,
    display,
  });
  const saveData = !!(navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
  return {
    flow: form === 'flow',
    coarse,
    fx: fxOf(form, innerWidth, coarse, saveData),
    dark: mq('(prefers-color-scheme: dark)'),
  };
}

const STR = {
  title: t('cdnTitle'),
  moi: t('moiLogoAlt'),
  soon: 'قيد الإعداد',
  lead: 'نعمل على تجهيز هذه المنصة، وستكون متاحة للجميع قريبًا.',
  label: 'رمز الدخول',
  go: 'دخول',
  opening: 'جارٍ الفتح…',
  wrong: 'رمز الدخول غير صحيح. تحقّق منه وحاول مرة أخرى.',
};

@Component({
  selector: 'app-root',
  imports: [AmbientComponent, HorizonComponent],
  host: {
    class: 'mj-root mj-countdown mj-lock',
    '[class.cdn-flow]': 'flow()',
    '[attr.data-form]': 'flow() ? "flow" : null',
    '[attr.data-fx]': 'flow() ? env().fx : null',
    '[attr.data-theme]': 'theme()',
    dir: 'rtl',
    lang: 'ar',
    '(window:resize)': 'env.set(readEnv())',
  },
  template: `
    <div class="mj-ambient"></div>
    <div class="mj-horizon"></div>
    <main class="cdn-in">
      <!-- prettier-ignore --><span class="cdn-logos"><img [attr.src]="logos().moi.src" [attr.srcset]="logos().moi.srcset" [alt]="s.moi" decoding="async" width="790" height="875"><i aria-hidden="true"></i><img [attr.src]="logos().el.src" [attr.srcset]="logos().el.srcset" [alt]="s.title" decoding="async" width="1000" height="1082"></span>
      <h1 class="cdn-title">{{ s.title }}</h1>
      <div class="cdn-opens mj-micro gold">{{ s.soon }}</div>
      <p class="lk-lead">{{ s.lead }}</p>
      <form class="lk-form mj-glass" novalidate (submit)="submit($event, field.value)">
        <label class="lk-label" for="lk-key">{{ s.label }}</label>
        <div class="lk-row">
          <input
            #field
            id="lk-key"
            class="lk-input"
            type="password"
            dir="ltr"
            autocomplete="current-password"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="go"
            aria-describedby="lk-msg"
            [attr.aria-invalid]="wrong()"
            [disabled]="opening()"
            (input)="wrong.set(false)"
          />
          <button class="mj-btn gold lk-go" type="submit" [disabled]="opening()">
            {{ opening() ? s.opening : s.go }}
          </button>
        </div>
        <p id="lk-msg" class="lk-msg" role="alert">
          @if (wrong()) {
            {{ s.wrong }}
          }
        </p>
      </form>
    </main>
  `,
  styleUrls: ['../countdown/countdown.scss', './lock.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockComponent {
  protected readonly env = signal(readEnv());
  protected readonly readEnv = readEnv;
  protected readonly s = STR;
  protected readonly wrong = signal(false);
  protected readonly opening = signal(false);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly flow = computed(() => this.env().flow);
  protected readonly theme = computed(() =>
    this.flow() ? themeOf(loadTheme(), 'flow', this.env().dark ? 'dark' : 'light') : 'night',
  );
  protected readonly logos = computed(() => {
    const night = this.theme() === 'night',
      flow = this.flow();
    return {
      moi: logoFor(night ? MOI_LOGO_DARK : MOI_LOGO, flow),
      el: logoFor(night ? LOGO_DARK : LOGO, flow),
    };
  });

  constructor() {
    const scheme = matchMedia('(prefers-color-scheme: dark)'),
      onScheme = () => this.env.set(readEnv());
    scheme.addEventListener('change', onScheme);
    inject(DestroyRef).onDestroy(() => scheme.removeEventListener('change', onScheme));
    afterNextRender(() => {
      if (!this.env().coarse) this.field().nativeElement.focus();
    });
  }

  protected submit(e: Event, value: string): void {
    e.preventDefault();
    if (this.opening()) return;
    if (!keyMatches(value)) {
      this.wrong.set(true);
      this.field().nativeElement.select();
      return;
    }
    this.opening.set(true);
    if (remember()) {
      location.reload();
      return;
    }
    const q = withoutParam(location.search, KEY_PARAM);
    location.replace(
      location.pathname +
        q +
        (q ? '&' : '?') +
        KEY_PARAM +
        '=' +
        encodeURIComponent(value.trim()) +
        location.hash,
    );
  }
}
