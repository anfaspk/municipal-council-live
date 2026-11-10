import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { starfield } from './winners.model';

export const SCENE_IMG = 'assets/winners/stage-night.avif';

const STARS = [starfield(110, 41, 0.7, 1180, 620, 1.3), starfield(34, 53, 1.4, 1180, 620, 1.6)];

@Component({
  selector: 'div.wn-scene[wnScene]',
  host: { 'aria-hidden': 'true', '[class.ready]': 'ready()' },
  templateUrl: './winners-scene.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersSceneComponent {
  readonly ready = input(false);
  readonly loaded = output<void>();
  protected readonly img = SCENE_IMG;
  protected readonly stars = STARS;

  protected onLoad(img: HTMLImageElement): void {
    img.decode().then(
      () => this.loaded.emit(),
      () => this.loaded.emit(),
    );
  }
}
