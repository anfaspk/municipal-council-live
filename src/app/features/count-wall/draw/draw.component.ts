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
  input,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { ct } from '../../../core/i18n/count-strings';
import { ScreenState } from '../../../core/screen/screen.state';
import { ConflictStore } from '../../../data/conflict.store';
import { CountStore } from '../../../data/count.store';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { LOGO, LOGO_DARK } from '../../../shared/ui/brand';
import { trapTab } from '../../../shared/ui/focus-trap';
import { HorizonComponent } from '../../../shared/ui/horizon.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { LatticeComponent } from '../../../shared/ui/lattice.component';
import { COUNT_TV_PREFS, loadTvPrefs } from '../../../shared/ui/tv-prefs';
import { DrawFocus } from './draw-focus';
import { DrawStageComponent } from './draw-stage.component';
import { drawKey, STAGE_ROW, stepTie, TieItem, tiesOf } from './draw.model';

const REVEAL_WAIT = 5000;

@Component({
  selector: 'div.cxd-root',
  templateUrl: './draw.component.html',
  imports: [DrawStageComponent, HorizonComponent, IconComponent, LatticeComponent],
  providers: [{ provide: FRAME_SCOPE, useValue: 'draw' }],
  styleUrls: ['../../tv/tv.scss', '../../tv/tv-slides.scss', '../count-wall.scss', './draw.scss'],
  host: {
    class: 'mj-root mj-cc ctv-root',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': "text('cxdL')",
    '[attr.data-theme]': 'theme()',
    '[hidden]': '!isOpen()',
    '(document:keydown)': 'onKey($event)',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawComponent {
  readonly theme = input('night');
  private readonly screen = inject(ScreenState);
  protected readonly store = inject(CountStore);
  private readonly conflicts = inject(ConflictStore);
  private readonly wish = inject(DrawFocus);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly counting = inject(ServerClock).counting;

  protected readonly text = ct;
  protected readonly stageRow = STAGE_ROW;
  protected readonly logo = LOGO;
  protected readonly darkLogo = LOGO_DARK;
  protected readonly isOpen = signal(false);
  protected readonly still = signal(false);
  protected readonly items = computed(() =>
    tiesOf(this.store.govs, this.conflicts.draws(), this.conflicts.ties()),
  );
  private readonly sel = signal<number | null>(null);
  protected readonly item = computed(
    (): TieItem | null => this.items().find((x) => x.id === this.sel()) ?? this.items()[0] ?? null,
  );
  protected readonly index = computed(() => {
    const it = this.item();
    return it ? this.items().indexOf(it) : 0;
  });
  protected readonly counts = computed(() => {
    const l = this.items(),
      d = l.filter((x) => x.state === 'drawn').length;
    return { o: l.length - d, d };
  });
  protected readonly playN = signal(0);
  protected readonly pending = signal<number | null>(null);
  private pendT: ReturnType<typeof setTimeout> | undefined;
  protected readonly say = signal('');

  private autoplay: number | null = null;
  private seen: { id: number; drawn: boolean } | null = null;

  constructor() {
    effect(() => {
      const on = this.screen.is('draw');
      untracked(() => (on ? this.open() : this.shut()));
    });
    effect(() => {
      const it = this.isOpen() ? this.item() : null;
      untracked(() => this.watch(it));
    });
    inject(DestroyRef).onDestroy(() => {
      this.store.stop(this);
      this.conflicts.watch(null);
      this.unpend();
    });
  }

  private open(): void {
    const w = this.wish.take();
    if (w) {
      this.sel.set(w.id);
      this.autoplay = w.play ? w.id : null;
    }
    this.still.set(loadTvPrefs(COUNT_TV_PREFS).still || reducedMotion());
    this.isOpen.set(true);
    this.store.start(this);
    afterNextRender(() => this.focusIn(), { injector: this.injector });
  }
  private shut(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.store.stop(this);
    this.conflicts.watch(null);
    this.autoplay = null;
    this.unpend();
  }

  private watch(it: TieItem | null): void {
    const was = this.seen;
    this.seen = it && { id: it.id, drawn: !!it.draw };
    this.conflicts.watch(it && it.state === 'open' && it.stage !== 'prep' ? it.id : null);
    if (!it) return;
    this.store.focus(it.gid);
    if (it.state === 'drawn') this.conflicts.want(it.id);
    else if (it.stage === 'prep' || it.stage === 'ready') this.conflicts.forget(it.id);
    if (!it.draw) return;
    if (this.autoplay === it.id || (was?.id === it.id && !was.drawn)) {
      this.autoplay = null;
      this.pending.set(it.id);
      this.pendT = setTimeout(() => this.reveal(), REVEAL_WAIT);
    }
    if (this.pending() === it.id && it.source === 'api') this.reveal();
  }
  private reveal(): void {
    if (this.pending() === null) return;
    this.unpend();
    this.playN.update((n) => n + 1);
  }
  private unpend(): void {
    clearTimeout(this.pendT);
    this.pendT = undefined;
    this.pending.set(null);
  }

  protected choose(id: number, keys = false): void {
    this.sel.set(id);
    this.autoplay = null;
    this.unpend();
    const it = this.item();
    if (it) this.say.set(it.name + ' · ' + ct(it.state === 'drawn' ? 'cxDrawn' : 'cxdOpen'));
    if (keys)
      afterNextRender(
        () =>
          this.host
            .querySelector<HTMLElement>('.cxd-row[data-w="' + id + '"]')
            ?.focus({ preventScroll: false }),
        { injector: this.injector },
      );
  }
  protected play(): void {
    if (!this.item()?.draw) return;
    this.unpend();
    this.playN.update((n) => n + 1);
  }
  protected toWall(): void {
    this.screen.show('wall');
  }
  protected close(): void {
    this.wish.takeBack();
    this.screen.leave('draw');
  }
  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  private focusIn(): void {
    if (!this.isOpen()) return;
    (
      this.host.querySelector<HTMLElement>('.cxd-row.on') ??
      this.host.querySelector<HTMLElement>('.cxd-tv')
    )?.focus({ preventScroll: true });
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.screen.is('draw') || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const a = drawKey({
      key: e.key,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      onButton: !!target?.closest('button'),
    });
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button');
    e.preventDefault();
    if (a.type === 'back') return this.toWall();
    if (a.type === 'play') return this.play();
    const l = this.items();
    if (!l.length) return;
    const i =
      a.type === 'move'
        ? stepTie(this.index(), l.length, a.step)
        : a.to === 'first'
          ? 0
          : l.length - 1;
    this.choose(l[i]!.id, true);
  }
}
