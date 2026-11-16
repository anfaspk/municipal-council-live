import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  computed,
  effect,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { screenComp } from '../../../../core/screen/layout.model';
import { NavHistory } from '../../../../core/screen/nav-history';
import { ViewportState } from '../../../../core/screen/viewport.state';
import { FRAME_SCOPE } from '../../../../shared/motion/frame-loop.service';
import { SwipeDirective } from '../../../../shared/motion/swipe.directive';
import { trapTab } from '../../../../shared/ui/focus-trap';
import { RaceAvatarComponent } from '../../../../shared/ui/race-avatar.component';
import { CfIconComponent } from '../../flow/cf-icon.component';
import { fmt } from '../../../../domain/format';
import { CfTPipe } from '../../flow/cf-t.pipe';
import { DrawScreen } from '../draw-screen';
import { drawKey, STAGE_ROW, stepTie, type TieItem } from '../draw.model';
import { DrawRevealComponent } from './draw-reveal.component';
import { DrawWideComponent } from './draw-wide.component';

@Component({
  selector: 'div[drawFlow]',
  imports: [
    CfIconComponent,
    CfTPipe,
    DrawRevealComponent,
    DrawWideComponent,
    RaceAvatarComponent,
    SwipeDirective,
  ],
  providers: [{ provide: FRAME_SCOPE, useValue: 'draw' }],
  host: {
    class: 'cf cfd',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': "text('cxdL')",
    '[attr.data-theme]': 'theme()',
    '[class.on]': 'isOpen()',
    '[class.still]': 'still()',
    '[attr.data-comp]': 'comp()',
    '(document:keydown)': 'onKey($event)',
  },
  templateUrl: './draw-flow.component.html',
  styleUrls: ['../../flow/count-flow.scss', './draw-flow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawFlowComponent extends DrawScreen {
  readonly theme = input('night');
  private readonly nav = inject(NavHistory);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly stageRow = STAGE_ROW;
  protected readonly number = fmt;
  protected readonly seatOf = (t: TieItem, id: string): number | null =>
    t.draw?.wins.find((x) => x.id === id)?.seat ?? null;
  protected readonly tie = this.viewing;
  private stopNav: (() => void) | null = null;
  private readonly viewport = inject(ViewportState);
  protected readonly comp = computed(() => {
    const { w, h } = this.viewport.size();
    return screenComp(w, h, this.viewport.anyCoarse());
  });

  constructor() {
    super();
    effect(() => {
      if (this.comp() !== 'phone' && this.isOpen()) this.tie.set(true);
    });
    inject(DestroyRef).onDestroy(() => this.stopNav?.());
  }

  protected opened(asked: boolean): void {
    this.tie.set(asked);
    this.stopNav = this.nav.listen('level', () => this.popped());
    this.focusIn();
  }
  protected override closed(): void {
    this.stopNav?.();
    this.stopNav = null;
    this.nav.back('level');
  }

  protected openTie(id: number): void {
    this.choose(id);
    this.tie.set(true);
    this.nav.push('level', { cfd: id }, location.href);
    this.focusIn();
  }
  protected pickTie(id: number): void {
    this.choose(id);
    this.tie.set(true);
  }
  protected toList(): void {
    if (typeof this.nav.state['cfd'] === 'number') history.back();
    else this.listed();
  }
  private listed(): void {
    const id = this.item()?.id;
    this.tie.set(false);
    afterNextRender(
      () =>
        this.host
          .querySelector<HTMLElement>('.cfd-card[data-w="' + id + '"]')
          ?.focus({ preventScroll: false }),
      { injector: this.injector },
    );
  }
  private popped(): void {
    const id = this.nav.state['cfd'];
    if (typeof id === 'number') {
      this.choose(id);
      this.tie.set(true);
    } else this.listed();
  }
  protected swipe(step: 1 | -1): void {
    const l = this.items();
    if (!this.tie() || l.length < 2) return;
    const it = l[stepTie(this.index(), l.length, step)]!;
    this.choose(it.id);
    if (typeof this.nav.state['cfd'] === 'number') this.nav.replace({ cfd: it.id }, location.href);
  }
  private focusIn(): void {
    afterNextRender(
      () =>
        (
          this.host.querySelector<HTMLElement>('.cfd-name') ??
          this.host.querySelector<HTMLElement>('.cfd-list-h')
        )?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.screen.is('draw') || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const a = drawKey({
      key: e.key,
      keyCode: e.keyCode,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      onButton: !!target?.closest('button'),
    });
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, [tabindex="0"]');
    e.preventDefault();
    if (a.type === 'fullscreen') return this.full.toggle();
    if (a.type === 'back')
      return this.tie() && this.comp() === 'phone' ? this.toList() : this.toWall();
    if (a.type === 'play') return this.play();
    const l = this.items();
    if (!l.length) return;
    if (a.type === 'move') return this.tie() ? this.swipe(a.step) : this.focusCard(a.step);
    const it = l[a.to === 'first' ? 0 : l.length - 1]!;
    if (this.tie()) this.choose(it.id);
    else this.host.querySelector<HTMLElement>('.cfd-card[data-w="' + it.id + '"]')?.focus();
  }
  private focusCard(step: 1 | -1): void {
    const cards = [...this.host.querySelectorAll<HTMLElement>('.cfd-card')],
      i = cards.indexOf(document.activeElement as HTMLElement);
    cards[stepTie(Math.max(0, i), cards.length, i < 0 ? 0 : step)]?.focus();
  }
}
