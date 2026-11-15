import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../domain/format';
import { AppbarComponent } from '../appbar/appbar.component';
import { IconSpriteComponent } from '../icon.component';
import { SegComponent } from '../seg.component';
import { shareLink, type Shared } from '../share';
import { SheetComponent } from '../sheet/sheet.component';
import type { Detent } from '../sheet/sheet-detent.model';
import { SnapItemDirective, SnapRowComponent } from '../snaprow/snaprow.component';
import { SplitComponent } from '../split/split.component';
import { StoryComponent } from '../story/story.component';
import { SummaryComponent } from '../summary/summary.component';
import { GOVS, KIT, KPIS, SIZES, WEIGHTS } from './kit-data';

@Component({
  selector: 'app-root',
  imports: [
    AppbarComponent,
    IconSpriteComponent,
    SegComponent,
    SheetComponent,
    SnapItemDirective,
    SnapRowComponent,
    SplitComponent,
    StoryComponent,
    SummaryComponent,
  ],
  host: { class: 'mj-root mj-kit-page', 'data-theme': 'night', dir: 'rtl', lang: 'ar' },
  templateUrl: './kit.component.html',
  styleUrl: './kit.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitComponent {
  protected readonly k = KIT;
  protected readonly govs = GOVS;
  protected readonly kpis = KPIS;
  protected readonly sizes = SIZES;
  protected readonly weights = WEIGHTS;
  protected readonly stale = signal(false);
  protected readonly view = signal('list');
  protected readonly views = [
    { v: 'list', label: KIT.list },
    { v: 'map', label: KIT.map },
  ];
  protected readonly story = signal(0);
  protected readonly storyPaused = signal(false);
  protected readonly picked = signal<number | null>(null);
  protected readonly splitOpen = signal(false);
  protected readonly pickedGov = computed(() => GOVS.find((g) => g.id === this.picked()) ?? null);
  protected readonly sheetOpen = signal(false);
  protected readonly detentOpen = signal(false);
  protected readonly detent = signal<Detent>('peek');
  protected readonly shared = signal<Shared | null>(null);
  protected readonly live = signal(51111);
  protected readonly liveText = computed(() => fmt(this.live()));
  protected readonly bars = [32, 48, 60, 41, 72, 55];
  protected readonly rounds = [1, 2, 3, 4];

  constructor() {
    const doc = inject(DOCUMENT);
    doc.title = KIT.title;
    doc.documentElement.setAttribute('data-theme', 'night');
    doc.documentElement.setAttribute('data-form', 'flow');
  }

  protected pick(id: number): void {
    this.picked.set(id);
    this.splitOpen.set(true);
  }
  protected openDetents(): void {
    this.detent.set('peek');
    this.detentOpen.set(true);
  }
  protected async share(): Promise<void> {
    this.shared.set(await shareLink({ title: KIT.heading, text: KIT.title, url: location.href }));
  }
  protected bump(): void {
    this.live.set(this.live() === 51111 ? 88888 : 51111);
  }
}
