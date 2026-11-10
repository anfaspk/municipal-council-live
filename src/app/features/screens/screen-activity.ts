import {
  afterEveryRender,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injectable,
} from '@angular/core';
import { ScreenState } from '../../core/screen/screen.state';
import { FrameLoop, FrameScope } from '../../shared/motion/frame-loop.service';

const HOLD_AFTER = 1200;
const SCOPES: readonly FrameScope[] = ['dashboard', 'tv', 'wall', 'winners', 'draw', 'detail'];
@Injectable()
export class ScreenActivity {
  private readonly screen = inject(ScreenState);
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  readonly frames = inject(FrameLoop);
  private readonly held = new Set<Animation>();
  private holdT: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const on = this.screen.screen();
      for (const scope of SCOPES) {
        if (scope === on || (scope === 'detail' && on === 'dashboard'))
          this.frames.resume(scope, this);
        else this.frames.pause(scope, this);
      }
      this.sync();
    });
    afterEveryRender(() => this.sync());
    const observer = new MutationObserver((records) => {
      if (records.some((r) => (r.target as Element).matches('.mj-tv, .wn-root'))) this.sync();
    });
    observer.observe(this.root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      clearTimeout(this.holdT);
      for (const scope of SCOPES) this.frames.resume(scope, this);
      this.held.clear();
    });
  }

  private sync(): void {
    const dash = this.root.querySelector<HTMLElement>('.cc-dash');
    if (!dash) return;
    const active = this.screen.is('dashboard');
    if (dash.inert === active) dash.inert = !active;
    if (active) dash.removeAttribute('aria-hidden');
    else if (!dash.hasAttribute('aria-hidden')) dash.setAttribute('aria-hidden', 'true');
    if (this.covered()) {
      if (!dash.classList.contains('cc-inactive') && this.holdT === undefined)
        this.holdT = setTimeout(() => {
          this.holdT = undefined;
          if (this.covered() && dash.isConnected) this.hold(dash);
        }, HOLD_AFTER);
      return;
    }
    clearTimeout(this.holdT);
    this.holdT = undefined;
    if (dash.classList.contains('cc-inactive')) {
      dash.classList.remove('cc-inactive');
      for (const a of this.held) if (a.playState === 'paused') a.play();
      this.held.clear();
    }
  }

  private covered(): boolean {
    const on = this.screen.screen();
    return (
      on !== 'dashboard' &&
      !!this.root.querySelector(
        on === 'tv'
          ? ':scope > .mj-tv.on'
          : on === 'winners'
            ? ':scope > .wn-root.on'
            : on === 'draw'
              ? '.cxd-root .ct-tv.on'
              : '.ct-root .ct-tv.on',
      )
    );
  }

  private hold(dash: HTMLElement): void {
    dash.classList.add('cc-inactive');
    for (const a of dash.getAnimations({ subtree: true }))
      if (a.playState === 'running') {
        a.pause();
        this.held.add(a);
      }
  }
}
