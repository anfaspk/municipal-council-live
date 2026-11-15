export const TOUCH_AFTER = 3000;

export const byTouch = (e: { pointerType: string }): boolean =>
  e.pointerType === 'touch' || e.pointerType === 'pen';

export class TouchHold {
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly set: (held: boolean) => void) {}

  on(): void {
    this.clear();
    this.set(true);
  }
  off(e?: { pointerType: string }): void {
    this.clear();
    if (e && byTouch(e)) this.timer = setTimeout(() => this.release(), TOUCH_AFTER);
    else this.set(false);
  }
  stop(): void {
    this.clear();
  }
  private release(): void {
    this.timer = null;
    this.set(false);
  }
  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
