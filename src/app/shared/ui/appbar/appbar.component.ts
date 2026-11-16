import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { LOGO, LOGO_DARK, logoFor, MOI_LOGO, MOI_LOGO_DARK } from '../brand';
import { scrollPadOf, slimOf } from './appbar.model';

@Component({
  selector: 'div[mjAppbar]',
  styleUrls: ['./appbar.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mj-appbar' },
  template: `<div class="mj-appbar-slim" #slimBar [class.on]="slim()" [inert]="!slim()" [attr.aria-hidden]="slim() ? null : 'true'">
    <span class="mj-appbar-marks"><img class="moi" [attr.src]="logos().moi.src" [attr.srcset]="logos().moi.srcset" width="790" height="875" decoding="async" [alt]="bare() ? '' : moiAlt"><img [attr.src]="logos().el.src" [attr.srcset]="logos().el.srcset" width="1000" height="1082" decoding="async" [alt]="bare() ? '' : elAlt"></span>
    @if (fig()) {<b class="mj-appbar-fig">{{ fig() }}</b>}
    <span class="mj-appbar-live" [class.stale]="stale()"><i aria-hidden="true"></i>{{ stamp() }}</span>
    <button type="button" class="mj-btn icon mj-appbar-menu" [attr.aria-label]="menuL" [title]="menuL" (click)="menu.emit()"><svg class="mj-appbar-burger" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
  <header class="mj-appbar-full">
    <span class="mj-appbar-logos"><img class="moi" [attr.src]="logos().moi.src" [attr.srcset]="logos().moi.srcset" width="790" height="875" decoding="async" [alt]="bare() ? '' : moiAlt"><i class="mj-appbar-sep" aria-hidden="true"></i><img [attr.src]="logos().el.src" [attr.srcset]="logos().el.srcset" width="1000" height="1082" decoding="async" [alt]="bare() ? '' : elAlt"></span>
    <button type="button" class="mj-btn icon mj-appbar-menu" [attr.aria-label]="menuL" [title]="menuL" (click)="menu.emit()"><svg class="mj-appbar-burger" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <span class="mj-appbar-head"><h1 class="mj-appbar-title">{{ heading() }}</h1>@if (sub()) {<p class="mj-appbar-sub">{{ sub() }}</p>}<span class="mj-appbar-line">@if (liveL()) {<span class="mj-appbar-chip" [class.stale]="stale()"><i aria-hidden="true"></i>{{ liveL() }}</span>}<span class="mj-appbar-live" [class.stale]="stale()">@if (!liveL()) {<i aria-hidden="true"></i>}{{ stamp() }}</span></span></span>
  </header>
  <span class="mj-appbar-sent" #sent aria-hidden="true"></span>`,
})
export class AppbarComponent {
  readonly heading = input.required<string>();
  readonly stamp = input('');
  readonly stale = input(false);
  readonly sub = input('');
  readonly liveL = input('');
  readonly fig = input('');
  readonly theme = input<'night' | 'daylight'>('night');
  readonly bare = input(false);
  readonly menu = output<void>();
  protected readonly slim = signal(false);
  protected readonly menuL = t('appbarMenu');
  protected readonly moiAlt = t('moiLogoAlt');
  protected readonly elAlt = t('elecLogoAlt');
  protected readonly logos = computed(() => {
    const night = this.theme() === 'night';
    return {
      moi: logoFor(night ? MOI_LOGO_DARK : MOI_LOGO, true, this.bare()),
      el: logoFor(night ? LOGO_DARK : LOGO, true, this.bare()),
    };
  });
  private readonly sent = viewChild.required<ElementRef<HTMLElement>>('sent');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('slimBar');

  constructor() {
    let io: IntersectionObserver | null = null,
      ro: ResizeObserver | null = null;
    const root = document.documentElement;
    afterNextRender(() => {
      const safeTop = parseFloat(getComputedStyle(root).getPropertyValue('--safe-top')) || 0;
      io = new IntersectionObserver(([e]) => {
        if (!e) return;
        this.slim.set(
          slimOf({
            intersecting: e.isIntersecting,
            top: e.boundingClientRect.top,
            rootTop: e.rootBounds?.top ?? 0,
          }),
        );
      });
      io.observe(this.sent().nativeElement);
      ro = new ResizeObserver(([e]) => {
        const h = e?.borderBoxSize[0]?.blockSize ?? 0;
        root.style.setProperty('scroll-padding-block-start', scrollPadOf(h, safeTop));
      });
      ro.observe(this.bar().nativeElement);
    });
    inject(DestroyRef).onDestroy(() => {
      io?.disconnect();
      ro?.disconnect();
      root.style.removeProperty('scroll-padding-block-start');
    });
  }
}
