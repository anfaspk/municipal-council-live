import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { Fullscreen } from '../../../core/screen/fullscreen';
import { InstallOffer } from '../../../core/screen/install';
import { shareLink, type Shared } from '../../../shared/ui/share';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { fl } from './flow-strings';

@Component({
  selector: 'div[flMenu]',
  imports: [TPipe, FlTPipe, FlIconComponent],
  host: { class: 'fl-menu' },
  template: `<h2 class="fl-menu-h">{{ 'flMenu' | flT }}</h2>
    <div class="fl-menu-row"><svg flIcon="moon"></svg><span class="fl-menu-l">{{ 'theme' | t }}</span><div class="fl-seg small" role="group" [attr.aria-label]="'theme' | t"><button type="button" [class.on]="state.theme() === 'night'" [attr.aria-pressed]="state.theme() === 'night'" (click)="state.setTheme('night')">{{ 'flNight' | flT }}</button><button type="button" [class.on]="state.theme() === 'daylight'" [attr.aria-pressed]="state.theme() === 'daylight'" (click)="state.setTheme('daylight')">{{ 'flDay' | flT }}</button></div></div>
    @if (full.offered()) {<button type="button" class="fl-menu-row" (click)="full.toggle()"><svg [flIcon]="full.on() ? 'unfull' : 'full'"></svg><span class="fl-menu-l">{{ (full.on() ? 'fullOff' : 'flFull') | flT }}</span></button>}
    @switch (install.hint()) {
      @case ('prompt') {<button type="button" class="fl-menu-row fl-install" (click)="install.ask()"><svg flIcon="add"></svg><span class="fl-menu-l">{{ 'flInstall' | flT }}</span></button>}
      @case ('ios') {<p class="fl-menu-row fl-install"><svg flIcon="add"></svg><span class="fl-menu-l">{{ 'flInstall' | flT }}<small>{{ 'flInstallIos' | flT }}</small></span></p>}
    }
    <button type="button" class="fl-menu-row" (click)="share()"><svg flIcon="share"></svg><span class="fl-menu-l">{{ 'flSharePage' | flT }}</span></button>
    <h3 class="fl-menu-sub">{{ 'flScreens' | flT }}</h3>
    @for (s of screens(); track s.screen) {<button type="button" class="fl-menu-row" (click)="screen.show(s.screen)"><svg [flIcon]="s.icon"></svg><span class="fl-menu-l">{{ s.key | flT }}<small>{{ s.line | flT }}</small></span></button>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowMenuComponent {
  protected readonly state = inject(CommandCenterState);
  protected readonly screen = inject(ScreenState);
  private readonly view = inject(DashboardView);
  readonly shared = output<Shared>();
  protected readonly full = inject(Fullscreen);
  protected readonly install = inject(InstallOffer);
  protected readonly screens = computed(() =>
    this.view
      .bar()
      .filter((b) => b.screen !== 'dashboard')
      .map((b) => ({
        ...b,
        line:
          b.screen === 'tv'
            ? 'flTvD'
            : b.screen === 'wall'
              ? b.later
                ? 'flCountD'
                : 'flCountOn'
              : 'flWinD',
      })),
  );

  protected async share(): Promise<void> {
    const url = location.origin + location.pathname;
    this.shared.emit(await shareLink({ title: document.title, text: fl('flSub'), url }));
  }
}
