import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';
import { FrameLoop } from './frame-loop.service';
import { isBack, keyOf } from './screen-keys';
import { type Box, type Dir, dirOf, first, nearest } from './spatial.model';

export interface NavZone {
  root: HTMLElement;
  on: () => boolean;
  controls?: () => HTMLElement | null;
  reveal?: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], select, input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])';
const PRESS = 'button, a[href], summary';
const OWNERS = '[role="listbox"], .ix-dock, [dtChart], .dt-ranked, [data-keys]';

@Injectable({ providedIn: 'root' })
export class RemoteNav {
  private readonly doc = inject(DOCUMENT);
  private readonly loop = inject(FrameLoop);
  private readonly zones: NavZone[] = [];
  private on = false;
  private freed: Element | null = null;

  constructor() {
    const win = this.doc.defaultView;
    win?.addEventListener('keydown', (e) => this.key(e), true);
    win?.addEventListener('pointerdown', () => this.set(false), true);
  }

  get active(): boolean {
    return this.on;
  }

  zone(z: NavZone, destroy: DestroyRef = inject(DestroyRef)): void {
    this.zones.push(z);
    destroy.onDestroy(() => this.zones.splice(this.zones.indexOf(z), 1));
  }

  private set(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    if (!on) this.freed = null;
    this.doc.documentElement.classList.toggle('mj-remote', on);
  }

  private key(e: KeyboardEvent): void {
    if (e.key === 'Tab') return this.set(false);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const z = [...this.zones].reverse().find((x) => x.on());
    if (!z) return;
    const k = keyOf(e),
      dir = dirOf(k),
      a = this.doc.activeElement as HTMLElement | null,
      box = z.controls ? z.controls() : z.root;
    if (!box) return;
    const blank = !a || a === this.doc.body || a === this.doc.documentElement,
      idle =
        blank || !z.root.contains(a) || (!!z.controls && !box.contains(a) && !a.matches(FOCUSABLE));
    const stop = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (idle) {
      if (k === 'Enter' || (dir && !z.controls && (blank || this.on))) {
        stop();
        this.set(true);
        z.reveal?.();
        this.focusFirst(box);
        return;
      }
      if (isBack(e) && !z.controls) this.set(true);
      return;
    }
    if (!a || !box.contains(a)) return;
    if (!this.on && !(k === 'Enter' && z.controls)) return;
    const el = a;
    if (k === 'Enter') {
      this.set(true);
      if (!el.matches(PRESS)) return;
      stop();
      el.click();
      return;
    }
    if (k === 'Escape') {
      if (el instanceof HTMLInputElement && el.value) return;
      if (z.controls) {
        stop();
        el.blur();
        return;
      }
      const owner = el.closest(OWNERS);
      if (owner && owner !== this.freed && box.contains(owner)) {
        stop();
        this.freed = owner;
      }
      return;
    }
    if (!dir || this.owns(el, dir, box)) return;
    stop();
    z.reveal?.();
    this.move(el, box, dir);
  }

  private owns(el: HTMLElement, dir: Dir, box: HTMLElement): boolean {
    const across = dir === 'left' || dir === 'right';
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return across;
    const owner = el.closest(OWNERS);
    if (this.freed && !this.freed.contains(el)) this.freed = null;
    return !!owner && box.contains(owner) && owner !== this.freed;
  }

  private focusFirst(box: HTMLElement): void {
    let to: HTMLElement | null = null;
    this.loop.once({
      read: () => {
        const c = this.candidates(box);
        const rtl = getComputedStyle(box).direction === 'rtl';
        to = c.els[first(c.boxes, rtl)] ?? null;
      },
      write: () => to?.focus(),
    });
  }

  private move(from: HTMLElement, box: HTMLElement, dir: Dir): void {
    let to: HTMLElement | null = null;
    this.loop.once({
      read: () => {
        const c = this.candidates(box, from),
          r = from.getBoundingClientRect();
        to = c.els[nearest({ x: r.left, y: r.top, w: r.width, h: r.height }, c.boxes, dir)] ?? null;
      },
      write: () => to?.focus(),
    });
  }

  private candidates(box: HTMLElement, skip?: Element): { els: HTMLElement[]; boxes: Box[] } {
    const els: HTMLElement[] = [],
      boxes: Box[] = [],
      vw = this.doc.documentElement.clientWidth,
      vh = this.doc.documentElement.clientHeight;
    for (const el of box.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (el === skip || el.closest('[inert], [aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (!this.onTop(el, r, vw, vh)) continue;
      els.push(el);
      boxes.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    return { els, boxes };
  }

  private onTop(el: HTMLElement, r: DOMRect, vw: number, vh: number): boolean {
    const pts: [number, number][] = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + r.width * 0.25, r.top + r.height * 0.25],
      [r.left + r.width * 0.75, r.top + r.height * 0.75],
    ];
    let inView = false;
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      inView = true;
      const hit = this.doc.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) return true;
    }
    return !inView;
  }
}
