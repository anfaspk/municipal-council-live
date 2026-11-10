import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
  ViewEncapsulation,
  AfterViewInit,
} from '@angular/core';
import { FRAME_SCOPE, FrameLoop } from '../motion/frame-loop.service';

export interface SegItem {
  v: string;
  label: string;
}

@Component({
  selector: '.mj-seg',
  host: { role: 'group' },
  template: `<span class="mj-thumb" #thumb></span>@for (it of items(); track it.v) {<button type="button" [attr.data-v]="it.v" [attr.aria-pressed]="it.v === value()" (click)="pick(it.v)">{{ it.label }}</button>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegComponent implements AfterViewInit {
  readonly items = input.required<SegItem[]>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly thumb = viewChild.required<ElementRef<HTMLElement>>('thumb');
  private readonly injector = inject(Injector);
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);

  ngAfterViewInit(): void {
    let box: number[] | null = null;
    this.frames.once(
      {
        read: () => {
          box = this.measure();
        },
        write: () => this.apply(box),
      },
      this.scope,
    );
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.place());
  }
  place(): void {
    this.apply(this.measure());
  }
  private measure(): number[] | null {
    const on = this.el.querySelector<HTMLElement>('[aria-pressed="true"]');
    return on ? [on.offsetLeft, on.offsetWidth] : null;
  }
  private apply(box: number[] | null): void {
    if (!box) return;
    const s = this.thumb().nativeElement.style;
    s.left = box[0] + 'px';
    s.width = box[1] + 'px';
  }
  pick(v: string): void {
    afterNextRender(() => this.place(), { injector: this.injector });
    this.valueChange.emit(v);
  }
}
