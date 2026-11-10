import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { countUp } from '../../../shared/motion/tween';
import { pctNum } from '../../../domain/format';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { FocusView, focusView } from './map-focus.model';

@Component({
  selector: '.map-focus',
  imports: [FmtPipe, GlyphComponent, PctPipe, TPipe],
  host: { class: 'mj-focus' },
  templateUrl: './map-focus.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFocusComponent implements AfterViewInit {
  protected readonly view = signal<{ n: number; d: FocusView; animate: boolean } | null>(null);
  protected readonly min = Math.min;
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly frames = inject(FrameLoop);
  private readonly stats = inject(TurnoutStore);
  private readonly updates = inject(ScreenUpdates);
  private readonly state = inject(CommandCenterState);
  private n = 0;
  private last: { t: number; voted: number } = { t: 0, voted: 0 };
  private tw: { stop(): void }[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const id = this.state.focus();
      untracked(() => this.show(id));
    });
  }
  ngAfterViewInit(): void {
    this.updates.map.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      const cur = this.view()?.d.key;
      if ((e.type === 'change' && (cur === 'nat' || cur === e.id)) || (e.type === 'resume' && cur))
        this.show(cur === 'nat' ? null : cur!);
    });
  }

  private show(id: string | null): void {
    const d = focusView(
      id ? this.stats.gov(id) : null,
      this.stats.national(),
      id ? this.stats.rankOf(id) : null,
    );
    const animate = this.view()?.d.key !== d.key;
    this.view.set({ n: ++this.n, d, animate });
    if (animate) {
      const from = this.last;
      afterNextRender(() => this.countUps(d, from), {
        injector: this.injector,
      });
    }
    this.last = d;
  }

  private countUps(d: FocusView, from: { t: number; voted: number }): void {
    this.tw.forEach((x) => x.stop());
    this.tw = [];
    const n = this.host.querySelector('.fc-big .n')!,
      v = this.host.querySelector('.v1')!;
    this.tw.push(countUp(this.frames, n, d.t, { from: from.t, format: pctNum, dur: 900 }));
    this.tw.push(countUp(this.frames, v, d.voted, { from: from.voted, dur: 900 }));
  }
}
