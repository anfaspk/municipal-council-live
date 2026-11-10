import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { WinnersLoad } from '../../data/winners.store';
import { announcedOf, WRegion } from '../../domain/winners/winners';
import { reducedMotion } from '../../shared/motion/reduced-motion';
import { IconComponent } from '../../shared/ui/icon.component';
import { WinnersStageComponent } from './winners-stage.component';
import { wt } from './winners-strings';
import { GovCard, matchWils } from './winners.model';
import { WnTPipe } from './wn-t.pipe';

@Component({
  selector: 'div.wn-reg[wnRegion]',
  imports: [IconComponent, WinnersStageComponent, WnTPipe],
  templateUrl: './winners-region.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersRegionComponent {
  readonly card = input.required<GovCard>();
  readonly govs = input<readonly GovCard[]>([]);
  readonly data = input<WRegion | null>(null);
  readonly load = input<WinnersLoad>('loading');
  readonly cur = input(0);
  readonly lap = input(0);
  readonly step = input(14000);
  readonly walking = input(false);
  readonly paused = input(false);
  readonly choose = output<number>();
  readonly move = output<number>();
  readonly playPause = output<void>();
  readonly hover = output<boolean>();
  readonly retry = output<void>();
  readonly pickGov = output<string>();

  protected readonly q = signal('');

  protected readonly name = computed(() => this.data()?.name || this.card().name);
  protected readonly govName = computed(() => this.card().name || this.name());
  protected readonly wils = computed(() => this.data()?.wils ?? []);
  protected readonly wil = computed(() => this.wils()[this.cur()] ?? null);
  protected readonly tally = computed(() => announcedOf(this.data()));
  protected readonly done = computed(() => {
    const t = this.tally();
    return t.all ? t.done / t.all : 0;
  });
  protected readonly full = computed(() => {
    const t = this.tally();
    return t.all > 0 && t.done === t.all;
  });
  protected readonly matches = computed(() =>
    matchWils(
      this.wils().map((w) => w.name),
      this.q(),
    ),
  );
  private readonly shown = computed(() => new Set(this.matches()));
  protected readonly shows = (i: number): boolean => this.shown().has(i);
  protected readonly spot = computed(() => this.matches().indexOf(this.cur()));
  constructor() {
    const id = computed(() => this.card().id);
    effect(() => {
      id();
      untracked(() => this.q.set(''));
    });
    const host: HTMLElement = inject(ElementRef).nativeElement,
      injector = inject(Injector);
    effect(() => {
      const i = this.spot();
      if (i < 0) return;
      untracked(() =>
        afterNextRender(
          {
            read: () => {
              const list = host.querySelector<HTMLElement>('.wn-wils'),
                row = list?.children[i] as HTMLElement | undefined;
              if (!list || !row) return;
              const top = row.offsetTop,
                end = top + row.offsetHeight,
                view = list.clientHeight;
              if (top < list.scrollTop || end > list.scrollTop + view)
                list.scrollTo({
                  top: Math.max(0, top - (view - row.offsetHeight) / 2),
                  behavior: reducedMotion() ? 'auto' : 'smooth',
                });
            },
          },
          { injector },
        ),
      );
    });
  }

  protected value(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected seats(n: number | null): string {
    return n ? wt('wnSeats', { n }) : '';
  }
}
