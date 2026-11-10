import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../core/clock/server-clock.service';
import { ScreenState } from '../../core/screen/screen.state';
import { TurnoutStore } from '../../data/turnout.store';
import { WinnersStore } from '../../data/winners.store';
import { GEO } from '../../domain/geo/geo.data';
import { FRAME_SCOPE } from '../../shared/motion/frame-loop.service';
import { SlideClock } from '../../shared/motion/slide-clock';
import { LOGO_DARK } from '../../shared/ui/brand';
import { trapTab } from '../../shared/ui/focus-trap';
import { IconComponent } from '../../shared/ui/icon.component';
import { WinnerPhotos } from './winner-photos';
import { WinnersPickerComponent } from './winners-picker.component';
import { WinnersRegionComponent } from './winners-region.component';
import { SCENE_IMG } from './winners-scene.component';
import { WinnersSkyComponent } from './winners-sky.component';
import { wt } from './winners-strings';
import { govCards, stepIndex, winnersKey } from './winners.model';
import { WnTPipe } from './wn-t.pipe';

export const WIL_STEP = 14000;

@Component({
  selector: 'div.wn-root',
  imports: [
    IconComponent,
    WinnersPickerComponent,
    WinnersRegionComponent,
    WinnersSkyComponent,
    WnTPipe,
  ],
  providers: [{ provide: FRAME_SCOPE, useValue: 'winners' }, WinnerPhotos],
  host: {
    tabindex: '-1',
    'data-theme': 'night',
    '[class.on]': 'isOpen()',
    '[class.wn-held]': 'held()',
    '[class.wn-in-reg]': '!!gov()',
    '(document:keydown)': 'onKey($event)',
  },
  templateUrl: './winners.component.html',
  styleUrls: ['./winners.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersComponent {
  protected readonly screen = inject(ScreenState);
  protected readonly store = inject(WinnersStore);
  private readonly stats = inject(TurnoutStore);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly walk = new SlideClock();
  protected readonly counting = inject(ServerClock).counting;

  protected readonly logoDark = LOGO_DARK;
  protected readonly step = WIL_STEP;

  protected readonly isOpen = signal(false);
  protected readonly gov = signal<string | null>(null);
  protected readonly cur = signal(0);
  protected readonly lap = signal(0);
  protected readonly paused = signal(false);
  protected readonly hover = signal(false);
  protected readonly held = computed(() => this.paused() || this.hover());
  protected readonly say = signal('');

  protected readonly cards = computed(() =>
    govCards(new Map(this.stats.govs().map((g) => [g.id, { name: g.ar, wils: g.wils.length }]))),
  );
  protected readonly card = computed(() => this.cards().find((c) => c.id === this.gov()) ?? null);
  protected readonly wils = computed(() => this.store.data()?.wils ?? []);
  protected readonly walking = computed(() => this.wils().length > 1);
  protected readonly stamp = computed(() => {
    const at = this.store.updatedAt();
    return at ? wt(this.store.stale() ? 'wnStale' : 'wnUpdated', { at }) : null;
  });

  private opened = false;
  private stepSet = false;

  constructor() {
    effect(() => {
      const on = this.screen.is('winners');
      untracked(() => (on ? this.open() : this.shut()));
    });
    effect(() => {
      const c = this.isOpen() ? this.card() : null;
      untracked(() => this.store.watch(c ? c.apiId : null));
    });
    effect(() => {
      const n = this.wils().length;
      untracked(() => {
        if (this.cur() >= n) this.cur.set(0);
        if (n && !this.stepSet) this.schedule();
      });
    });
    const photos = inject(WinnerPhotos);
    effect(() => {
      if (this.isOpen()) untracked(() => photos.warm([SCENE_IMG]));
    });
    effect(() => {
      const ws = this.wils(),
        i = this.cur();
      const urls = [ws[i], ws[(i + 1) % ws.length]].flatMap((w) =>
        w?.published ? w.winners.flatMap((c) => (c.photo ? [c.photo] : [])) : [],
      );
      untracked(() => photos.warm(urls));
    });
    effect(() => {
      const h = this.held();
      untracked(() => (h || !this.gov() ? this.walk.stop() : this.walk.start()));
    });
    inject(DestroyRef).onDestroy(() => {
      this.walk.reset();
      this.store.watch(null);
    });
  }

  private open(): void {
    this.isOpen.set(true);
    const boot = this.screen.takeHandoff() ?? (this.opened ? null : this.screen.bootRegion);
    this.opened = true;
    this.gov.set(boot && Object.hasOwn(GEO.g, boot) ? boot : null);
    this.cur.set(0);
    this.paused.set(false);
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }
  private shut(): void {
    this.isOpen.set(false);
    this.gov.set(null);
    this.walk.reset();
    this.stepSet = false;
  }

  protected close(): void {
    this.screen.leave('winners');
  }

  protected pick(id: string, focus = true): void {
    if (id === this.gov() || !Object.hasOwn(GEO.g, id)) return;
    this.gov.set(id);
    this.cur.set(0);
    this.paused.set(false);
    this.hover.set(false);
    this.schedule();
    this.say.set(this.card()?.name ?? '');
    if (focus) afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  protected fullscreen(): void {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void document.documentElement.requestFullscreen?.();
    } catch {
    }
  }
  protected back(): void {
    const was = this.gov();
    this.gov.set(null);
    this.walk.reset();
    this.stepSet = false;
    afterNextRender(
      () =>
        (
          this.host.querySelector<HTMLElement>('.wn-gov[data-g="' + was + '"]') ??
          this.host.querySelector<HTMLElement>('.wn-gov')
        )?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  protected choose(i: number): void {
    this.cur.set(stepIndex(i, this.wils().length, 0));
    this.schedule();
    this.announce();
  }
  protected move(step: number): void {
    this.choose(this.cur() + step);
  }
  protected togglePlay(): void {
    this.paused.update((p) => !p);
    this.say.set(wt(this.paused() ? 'wnPause' : 'wnPlay'));
  }

  private schedule(): void {
    this.walk.reset();
    this.lap.update((n) => n + 1);
    this.stepSet = !!this.gov() && this.walking();
    if (!this.stepSet) return;
    this.walk.at(WIL_STEP, () => {
      this.cur.set(stepIndex(this.cur(), this.wils().length, 1));
      this.schedule();
    });
    if (!this.held()) this.walk.start();
  }

  private announce(): void {
    const w = this.wils()[this.cur()];
    if (!w) return;
    this.say.set(
      w.name + ': ' + (w.published ? w.winners.map((c) => c.name).join('، ') : wt('wnPending')),
    );
  }

  private focusFirst(): void {
    if (!this.isOpen()) return;
    ((this.gov() ? this.host.querySelector<HTMLElement>('.wn-wil.on') : null) ?? this.host).focus({
      preventScroll: true,
    });
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.screen.is('winners') || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null,
      field = target?.closest<HTMLInputElement | HTMLSelectElement>('input, select');
    const a = winnersKey(
      {
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        onButton: !!target?.closest('button'),
        onField: !!field,
      },
      !!this.gov(),
    );
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, select, input');
    e.preventDefault();
    if (a.type === 'back' && field instanceof HTMLInputElement && field.value) {
      field.value = '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (a.type === 'back') return this.gov() ? this.back() : this.close();
    if (a.type === 'play') return this.togglePlay();
    if (a.type === 'move') return this.move(a.step);
    this.choose(a.to === 'first' ? 0 : this.wils().length - 1);
  }
}
