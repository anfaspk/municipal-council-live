import { FrameHandle, FrameLoop, FrameScope } from './frame-loop.service';
import { pager } from './pager';
import { ClockJob, SlideClock } from './slide-clock';

export interface PagerRun {

  time: number;

  travel: boolean;

  wait(ms: number): void;
}

interface Rows {

  tops: number[];
  fit: number;
  max: number;
}

const QUIT = ['wheel', 'pointerdown', 'touchstart', 'keydown', 'focusin'] as const;

function rowsOf(el: HTMLElement): Rows | null {
  const kids = Array.from(el.children) as HTMLElement[];
  if (!kids.length || !el.clientHeight) return null;
  const rows: { top: number; bottom: number }[] = [];
  for (const k of kids.sort((a, b) => a.offsetTop - b.offsetTop)) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(k.offsetTop - last.top) < 2)
      last.bottom = Math.max(last.bottom, k.offsetTop + k.offsetHeight);
    else rows.push({ top: k.offsetTop, bottom: k.offsetTop + k.offsetHeight });
  }
  const cs = getComputedStyle(el),
    view = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
    first = rows[0]!.top;
  return {
    tops: rows.map((r) => r.top - first),
    fit: Math.max(1, rows.filter((r) => r.bottom - first <= view + 1).length),
    max: el.scrollHeight - el.clientHeight,
  };
}

export class ListPager {
  private jobs: ClockJob[] = [];
  private frame: FrameHandle | null = null;
  private el: HTMLElement | null = null;

  private sized: ResizeObserver | null = null;
  private readonly quit = () => this.stop();

  constructor(
    private readonly frames: FrameLoop,
    private readonly clock: SlideClock,
    private readonly scope: FrameScope,
  ) {}

  run(find: () => HTMLElement | null, run: PagerRun): void {
    this.stop();
    const t0 = this.clock.now();
    const measure = () => {
      if (this.frame) return;
      let rows: Rows | null = null;
      this.frame = this.frames.once(
        {
          read: () => {
            const el = find();
            rows = el && rowsOf(el);
          },
          write: () => {
            this.frame = null;
            if (!rows) return;
            this.sized?.disconnect();
            this.sized = null;
            this.plan(find, rows, { ...run, time: run.time - (this.clock.now() - t0) });
          },
        },
        this.scope,
      );
    };
    const el = find();
    if (el && typeof ResizeObserver === 'function') {
      this.sized = new ResizeObserver(measure);
      this.sized.observe(el);
    }
    measure();
  }

  stop(): void {
    this.frame?.stop();
    this.frame = null;
    this.sized?.disconnect();
    this.sized = null;
    this.jobs.forEach((j) => this.clock.cancel(j));
    this.jobs = [];
    this.listen(null);
  }

  private plan(find: () => HTMLElement | null, rows: Rows, run: PagerRun): void {
    const { steps, need } = pager(rows.tops.length, rows.fit, Math.max(0, run.time));
    if (!steps.length) return;
    if (need > run.time) run.wait(need - Math.max(0, run.time));
    const now = this.clock.now();
    this.listen(find());
    this.jobs = steps.map((s) =>
      this.clock.at(now + s.at, () => {
        const el = find();
        if (!el) return;
        this.listen(el);
        const last = s.row + rows.fit >= rows.tops.length;
        el.scrollTo({
          top: last ? rows.max : Math.min(rows.max, rows.tops[s.row]!),
          behavior: run.travel ? 'smooth' : 'auto',
        });
      }),
    );
  }

  private listen(el: HTMLElement | null): void {
    if (el === this.el) return;
    QUIT.forEach((t) => this.el?.removeEventListener(t, this.quit));
    this.el = el;
    QUIT.forEach((t) => el?.addEventListener(t, this.quit, { passive: true }));
  }
}
