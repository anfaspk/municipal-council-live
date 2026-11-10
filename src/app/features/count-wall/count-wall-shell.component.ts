import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { ct } from '../../core/i18n/count-strings';
import { CountStore } from '../../data/count.store';
import { LOGO, LOGO_DARK } from '../../shared/ui/brand';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { LatticeComponent } from '../../shared/ui/lattice.component';
import { SegComponent } from '../../shared/ui/seg.component';
import { COUNT_TV_PREFS } from '../../shared/ui/tv-prefs';
import { uid } from '../../shared/ui/uid';

export interface CountShellView {
  slides: string[];
  index: number;
  done: boolean;
  results: boolean;
  theme: string;
  paused: boolean;
  still: boolean;
  osMotion: boolean;
  seconds: number;
  next: string;
  subtitle: string;
}
export type CountShellAction =
  | { type: 'close' | 'theme' | 'fullscreen' | 'pause' | 'previous' | 'next' | 'motion' }
  | { type: 'slide'; index: number }
  | { type: 'seconds'; value: number };

@Component({
  selector: 'div.ct-tv',
  templateUrl: './count-wall-shell.component.html',
  imports: [HorizonComponent, IconComponent, LatticeComponent, SegComponent],
  host: { role: 'region', '[attr.aria-label]': "text('tv')" },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountWallShell {
  readonly view = input.required<CountShellView>();
  readonly action = output<CountShellAction>();
  protected readonly text = ct;
  protected readonly staleAt = inject(CountStore).staleAt;
  protected readonly logo = LOGO;
  protected readonly darkLogo = LOGO_DARK;
  protected readonly timeId = uid('ctva');
  protected readonly seconds = COUNT_TV_PREFS.seconds.map((n) => ({
    v: String(n),
    label: ct('tvSec', { n }),
  }));
  protected number(value: number): string {
    return String(value).padStart(2, '0');
  }
  protected secondsChanged(value: string): void {
    this.action.emit({ type: 'seconds', value: +value });
  }
}
