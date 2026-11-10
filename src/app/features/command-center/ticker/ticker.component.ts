import {
  afterNextRender,
  ChangeDetectionStrategy,
  DestroyRef,
  effect,
  ElementRef,
  Injector,
  signal,
  untracked,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { t, TextPart, tParts } from '../../../core/i18n/i18n';
import { Tick, TickerStore } from '../../../data/ticker.store';
import { fmt, pct } from '../../../domain/format';
import { IconComponent } from '../../../shared/ui/icon.component';
import { starPoints } from '../../../shared/ui/ornament';
import { TPipe } from '../../../shared/ui/t.pipe';

function partsOf(tick: Tick): TextPart[] {
  if (tick.kind === 'counted') return tParts('counted', { g: tick.gov, v: fmt(tick.votes) }, ['v']);
  if (tick.kind === 'passes') return tParts('passes', { g: tick.gov, p: tick.p + '%' }, ['g']);
  return [
    { text: t('finalCount'), bold: true },
    { text: ' · ' + pct(tick.turnout), bold: false },
  ];
}

const SPEED = 40;

@Component({
  selector: 'footer.cc-ticker',
  imports: [IconComponent, TPipe],
  templateUrl: './ticker.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TickerComponent {
  readonly star = starPoints(12, 12, 11);
  private readonly store = inject(TickerStore);
  private readonly words = new WeakMap<Tick, TextPart[]>();
  private readonly shown = signal<readonly Tick[]>(this.store.ticks());
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly screen = inject(ScreenState);
  private pending: readonly Tick[] = this.shown();
  private wasActive = false;
  readonly items = computed(() =>
    this.shown().map((tick) => {
      let parts = this.words.get(tick);
      if (!parts) this.words.set(tick, (parts = partsOf(tick)));
      return { tick, parts };
    }),
  );
  readonly fresh = computed(() => this.shown()[0] === this.store.latest());
  private readonly copies = signal(2);
  readonly runs = computed(() => Array.from({ length: this.copies() }, (_, i) => i));

  constructor() {
    const seam = (e: Event) => {
      if ((e.target as Element).matches('.track')) this.commit();
    };
    this.host.addEventListener('animationiteration', seam);
    inject(DestroyRef).onDestroy(() => this.host.removeEventListener('animationiteration', seam));
    effect(() => {
      const ticks = this.store.ticks(),
        active = this.screen.is('dashboard'),
        still = reducedMotion();
      untracked(() => {
        this.pending = ticks;
        if (active && (!this.wasActive || still)) this.commit();
        this.wasActive = active;
      });
    });
  }

  private commit(): void {
    if (!this.screen.is('dashboard')) return;
    this.shown.set(this.pending);
    afterNextRender(
      {
        earlyRead: () => ({
          width: this.host.querySelector<HTMLElement>('.track > span')?.offsetWidth ?? 0,
          strip: this.host.querySelector<HTMLElement>('.vp')?.offsetWidth ?? 0,
        }),
        write: ({ width, strip }) => {
          const track = this.host.querySelector<HTMLElement>('.track');
          if (!track || !width) return;
          this.copies.set(Math.max(2, Math.ceil(strip / width) + 1));
          track.style.setProperty('--tk-shift', width + 'px');
          track.style.setProperty('--tk-dur', width / SPEED + 's');
          track.getAnimations().forEach((a) => {
            if (a instanceof CSSAnimation && a.animationName.startsWith('mj-marquee'))
              a.currentTime = 0;
          });
        },
      },
      { injector: this.injector },
    );
  }
}
