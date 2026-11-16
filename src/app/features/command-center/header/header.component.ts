import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { Fullscreen } from '../../../core/screen/fullscreen';
import { ScreenState } from '../../../core/screen/screen.state';
import { ViewportState } from '../../../core/screen/viewport.state';
import { TurnoutStore } from '../../../data/turnout.store';
import { LOGO, LOGO_DARK, logoFor, MOI_LOGO, MOI_LOGO_DARK } from '../../../shared/ui/brand';
import { IconComponent } from '../../../shared/ui/icon.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { DetailState } from '../detail/detail.state';
import { UpdateRingDirective } from './update-ring.directive';

@Component({
  selector: 'header.cc-bar',
  imports: [IconComponent, TPipe, UpdateRingDirective],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly state = inject(CommandCenterState);
  protected readonly stats = inject(TurnoutStore);
  protected readonly screen = inject(ScreenState);
  protected readonly full = inject(Fullscreen);
  protected readonly liveCount = t('cLiveCount');
  private readonly viewport = inject(ViewportState);
  private readonly detail = inject(DetailState);
  protected readonly covered = computed(() => this.state.drilled() && !this.detail.at());
  protected readonly logos = computed(() => {
    const flow = this.viewport.form() === 'flow',
      night = this.state.theme() === 'night';
    return {
      moiN: logoFor(MOI_LOGO_DARK, flow, !night),
      moiD: logoFor(MOI_LOGO, flow, night),
      elN: logoFor(LOGO_DARK, flow, !night),
      elD: logoFor(LOGO, flow, night),
    };
  });
  private readonly updated = viewChild.required<ElementRef<HTMLElement>>('updated');

  constructor() {
    effect((cleanup) => {
      if (!this.screen.is('dashboard')) return;
      const write = () => {
        const at = this.stats.staleAt();
        this.updated().nativeElement.textContent = at
          ? t('figuresAt', { t: at })
          : t('updated', { n: this.stats.secondsSinceUpdate() });
      };
      write();
      const tick = setInterval(write, 1000);
      cleanup(() => clearInterval(tick));
    });
  }
}
