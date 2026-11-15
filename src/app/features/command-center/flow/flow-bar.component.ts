import { fl } from './flow-strings';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { DetailState } from '../detail/detail.state';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';

@Component({
  selector: 'nav[flBar]',
  imports: [FlIconComponent, FlTPipe],
  host: { class: 'fl-bar', '[attr.aria-label]': 'label' },
  template: `@for (b of view.bar(); track b.screen) {<button type="button" class="fl-bar-i" [class.on]="b.screen === 'dashboard'" [class.later]="b.later" [attr.aria-current]="b.screen === 'dashboard' ? 'page' : null" (click)="go(b.screen)"><span class="fl-bar-ic"><svg [flIcon]="b.icon"></svg></span><span>{{ b.key | flT }}</span></button>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowBarComponent {
  protected readonly label = fl('flBar');
  protected readonly view = inject(DashboardView);
  private readonly screen = inject(ScreenState);
  private readonly detail = inject(DetailState);

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement,
      root = document.documentElement;
    let ro: ResizeObserver | null = null;
    afterNextRender(() => {
      ro = new ResizeObserver(([e]) => {
        const h = Math.ceil(e?.borderBoxSize[0]?.blockSize ?? 0);
        root.style.setProperty('scroll-padding-block-end', h + 'px');
      });
      ro.observe(host);
    });
    inject(DestroyRef).onDestroy(() => {
      ro?.disconnect();
      root.style.removeProperty('scroll-padding-block-end');
    });
  }
  protected go(s: 'dashboard' | 'tv' | 'wall' | 'winners'): void {
    if (s !== 'dashboard') this.screen.show(s);
    else if (this.detail.at()) this.detail.close();
    else document.scrollingElement?.scrollTo({ top: 0 });
  }
}
