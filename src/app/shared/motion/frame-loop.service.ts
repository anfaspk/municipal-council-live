import { Injectable, InjectionToken } from '@angular/core';
import { log } from '../../core/log/log';

export type FrameScope = 'dashboard' | 'tv' | 'wall' | 'winners' | 'draw' | 'detail';
export const FRAME_SCOPE = new InjectionToken<FrameScope>('screen motion scope', {
  providedIn: 'root',
  factory: () => 'dashboard',
});

export interface FrameTask {
  read?(now: number): void;
  write?(now: number): void;
  paused?(): void;
  resumed?(): void;
}

export interface FrameHandle {
  stop(): void;
}

export interface FrameHost {
  request(frame: (now: number) => void): number;
  cancel(id: number): void;
}

interface Entry {
  task: FrameTask;
  scope: FrameScope | null;
  once: boolean;
  live: boolean;
}

@Injectable({ providedIn: 'root', useFactory: browserFrameLoop })
export class FrameLoop {
  private entries: Entry[] = [];
  private readonly holds = new Map<FrameScope, Set<unknown>>();
  private pending = 0;

  constructor(private readonly host: FrameHost) {}

  add(task: FrameTask, scope: FrameScope | null = null): FrameHandle {
    return this.enter(task, scope, false);
  }

  once(task: FrameTask, scope: FrameScope | null = null): FrameHandle {
    return this.enter(task, scope, true);
  }

  pause(scope: FrameScope, by: unknown = scope): void {
    let holders = this.holds.get(scope);
    if (!holders) this.holds.set(scope, (holders = new Set()));
    const was = holders.size > 0;
    holders.add(by);
    if (!was)
      for (const e of this.entries.slice())
        if (e.scope === scope && e.live) this.guard(() => e.task.paused?.());
    if (!this.entries.some((e) => this.runnable(e))) this.cancel();
  }

  resume(scope: FrameScope, by: unknown = scope): void {
    const holders = this.holds.get(scope);
    if (!holders?.delete(by) || holders.size) return;
    for (const e of this.entries.slice())
      if (e.scope === scope && e.live) this.guard(() => e.task.resumed?.());
    this.wake();
  }

  isPaused(scope: FrameScope): boolean {
    return !!this.holds.get(scope)?.size;
  }

  count(scope: FrameScope): { registered: number; runnable: number } {
    const entries = this.entries.filter((e) => e.live && e.scope === scope);
    return { registered: entries.length, runnable: entries.filter((e) => this.runnable(e)).length };
  }

  private enter(task: FrameTask, scope: FrameScope | null, once: boolean): FrameHandle {
    const entry: Entry = { task, scope, once, live: true };
    this.entries.push(entry);
    this.wake();
    return { stop: () => this.drop(entry) };
  }

  private drop(entry: Entry): void {
    if (!entry.live) return;
    entry.live = false;
    this.entries = this.entries.filter((e) => e !== entry);
    if (!this.entries.some((e) => this.runnable(e))) this.cancel();
  }

  private runnable(e: Entry): boolean {
    return e.live && !!(e.task.read || e.task.write) && !(e.scope && this.isPaused(e.scope));
  }

  private wake(): void {
    if (!this.pending && this.entries.some((e) => this.runnable(e)))
      this.pending = this.host.request(this.frame);
  }

  private cancel(): void {
    if (this.pending) this.host.cancel(this.pending);
    this.pending = 0;
  }

  private readonly frame = (now: number): void => {
    this.pending = 0;
    const due = this.entries.filter((e) => this.runnable(e));
    if (due.some((e) => e.once))
      this.entries = this.entries.filter((e) => !e.once || !due.includes(e));
    for (const e of due) if (e.live && e.task.read) this.guard(() => e.task.read!(now));
    for (const e of due) if (this.runnable(e) && e.task.write) this.guard(() => e.task.write!(now));
    for (const e of due) if (e.once) e.live = false;
    this.wake();
  };

  private guard(run: () => void): void {
    try {
      run();
    } catch (err) {
      log.once(
        'frame:' + String((err as Error)?.message ?? err),
        'frame task failed',
        'error',
        err,
      );
    }
  }
}

function browserFrameLoop(): FrameLoop {
  return new FrameLoop({
    request: (frame) => requestAnimationFrame(frame),
    cancel: (id) => cancelAnimationFrame(id),
  });
}
