export const HOLD_SLACK = 1000;

export class UpdateGate<E> {
  private on = false;
  private missed = false;
  private pending: E[] = [];
  private holdT: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly emit: (batch: E[]) => void,
    private readonly resume: () => void,
  ) {}

  get active(): boolean {
    return this.on;
  }
  get holding(): boolean {
    return this.holdT !== null;
  }

  setActive(on: boolean, refreshOnReturn = false): void {
    if (on === this.on) return;
    this.on = on;
    if (!on) {
      this.missed ||= refreshOnReturn;
      this.pending = [];
      this.stopHold();
      return;
    }
    if (this.missed) {
      this.missed = false;
      this.resume();
    }
  }

  deliver(batch: E[]): void {
    if (!batch.length) return;
    if (!this.on) {
      this.missed = true;
      return;
    }
    if (this.holdT !== null) this.pending.push(...batch);
    else this.emit(batch);
  }

  hold(ms: number): void {
    if (!this.on) return;
    this.stopHold();
    this.holdT = setTimeout(() => this.release(), Math.max(0, ms) + HOLD_SLACK);
  }
  release(): void {
    this.stopHold();
    const out = this.pending;
    this.pending = [];
    if (out.length && this.on) this.emit(out);
  }

  private stopHold(): void {
    if (this.holdT !== null) clearTimeout(this.holdT);
    this.holdT = null;
  }
}
