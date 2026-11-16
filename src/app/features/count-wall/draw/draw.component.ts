import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { RemoteNav } from '../../../shared/motion/remote-nav';
import { watchStageSwipe } from '../../../shared/motion/stage-swipe';
import { LOGO, LOGO_DARK, MOI_LOGO, MOI_LOGO_DARK } from '../../../shared/ui/brand';
import { trapTab } from '../../../shared/ui/focus-trap';
import { HorizonComponent } from '../../../shared/ui/horizon.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { LatticeComponent } from '../../../shared/ui/lattice.component';
import { DrawScreen } from './draw-screen';
import { DrawStageComponent } from './draw-stage.component';
import { drawKey, STAGE_ROW, stepTie } from './draw.model';

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
export class DrawComponent extends DrawScreen {
  readonly theme = input('night');
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  constructor() {
    super();
    inject(RemoteNav).zone({
      root: this.host,
      on: () => this.isOpen(),
      controls: () => this.host.querySelector('.cxd-list'),
    });
    watchStageSwipe(this.host, (s) => {
      const l = this.items();
      if (l.length) this.choose(l[stepTie(this.index(), l.length, s)]!.id);
    });
  }

  protected readonly stageRow = STAGE_ROW;
  protected readonly logo = LOGO;
  protected readonly darkLogo = LOGO_DARK;
  protected readonly moi = MOI_LOGO;
  protected readonly moiDark = MOI_LOGO_DARK;

  protected opened(): void {
    afterNextRender(() => this.focusIn(), { injector: this.injector });
  }

  protected override choose(id: number, keys = false): void {
    super.choose(id);
    if (keys)
      afterNextRender(
        () =>
          this.host
            .querySelector<HTMLElement>('.cxd-row[data-w="' + id + '"]')
            ?.focus({ preventScroll: false }),
        { injector: this.injector },
      );
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
      keyCode: e.keyCode,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      onButton: !!target?.closest('button'),
    });
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button');
    e.preventDefault();
    if (a.type === 'fullscreen') return this.full.toggle();
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
