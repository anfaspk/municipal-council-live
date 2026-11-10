import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { sharePct } from '../../domain/format';
import { WCand } from '../../domain/winners/winners';
import { CountUpDirective } from '../../shared/motion/count-up.directive';
import { WinnerPhotos } from './winner-photos';
import { sparks } from './winners.model';
import { WnTPipe } from './wn-t.pipe';

const SPARKS = sparks(18);

@Component({
  selector: 'article.wn-card[wnCard]',
  imports: [CountUpDirective, WnTPipe],
  host: { '[class.ini]': '!photo()', '[class.pic]': 'shown()' },
  templateUrl: './winner-card.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnerCardComponent {
  readonly cand = input.required<WCand>();
  private readonly photos = inject(WinnerPhotos);
  protected readonly sparks = SPARKS;
  private readonly broken = signal<string | null>(null);
  protected readonly photo = computed(() => {
    const p = this.cand().photo;
    return p && p !== this.broken() ? p : null;
  });
  private readonly loaded = signal<string | null>(null);
  protected readonly early = computed(() => {
    const p = this.photo();
    return !!p && this.photos.ready(p);
  });
  protected readonly shown = computed(
    () => this.early() || (!!this.photo() && this.loaded() === this.photo()),
  );
  protected readonly share = computed(() => sharePct(this.cand().share));
  protected readonly part = computed(() => {
    const p = this.cand().share;
    return p === null ? null : Math.max(0, Math.min(1, p / 100));
  });

  protected onLoad(img: HTMLImageElement): void {
    const url = this.photo();
    if (!url) return;
    img.decode().then(
      () => this.loaded.set(url),
      () => this.loaded.set(url),
    );
  }

  protected failed(): void {
    this.broken.set(this.cand().photo);
  }
}
