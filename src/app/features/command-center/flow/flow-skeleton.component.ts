import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { ViewportState } from '../../../core/screen/viewport.state';
import { AppbarComponent } from '../../../shared/ui/appbar/appbar.component';
import { loadTheme, themeOf } from '../theme-pref';
import { fl } from './flow-strings';

@Component({
  selector: 'div[flSkel]',
  imports: [AppbarComponent],
  styleUrl: './flow-skeleton.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mj-root fl-skel',
    'data-form': 'flow',
    '[attr.data-theme]': 'theme()',
    dir: 'rtl',
    lang: 'ar',
    'aria-busy': 'true',
  },
  template: `<p class="mj-sr" role="status">{{ busy }}</p>
    <div class="fl-sk-in" inert>
      <div mjAppbar [heading]="heading" [sub]="sub" [theme]="theme()" [bare]="true"></div>
      <main class="fl-sk-feed">
        <section class="fl-sk-card fl-sk-hero"><i class="fl-sk ring"></i><i class="fl-sk line"></i><i class="fl-sk chip"></i></section>
        <div class="fl-sk-tiles"><i class="fl-sk tile"></i><i class="fl-sk tile"></i><i class="fl-sk tile"></i></div>
        <section class="fl-sk-card fl-sk-list">
          @for (r of rows; track r) {<div class="fl-sk-row"><i class="fl-sk dot"></i><i class="fl-sk bar"></i><i class="fl-sk val"></i></div>}
        </section>
      </main>
      <div class="fl-sk-bar">@for (r of tabs; track r) {<span><i class="fl-sk ic"></i><i class="fl-sk lab"></i></span>}</div>
    </div>`,
})
export class FlowSkeletonComponent {
  private readonly viewport = inject(ViewportState);
  protected readonly theme = computed(() => themeOf(loadTheme(), 'flow', this.viewport.scheme()));
  protected readonly heading = t('title').split(' · ')[0] ?? t('title');
  protected readonly sub = fl('flSub');
  protected readonly busy = fl('flLoading');
  protected readonly rows = [0, 1, 2, 3, 4];
  protected readonly tabs = [0, 1, 2, 3];
}
