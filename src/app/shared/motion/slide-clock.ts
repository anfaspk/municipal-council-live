export interface ClockJob {
  at: number;
  readonly fn: () => void;
  handle?: ReturnType<typeof setTimeout>;
  done: boolean;
}

export class SlideClock {
  private jobs: ClockJob[] = [];
  private startedAt = 0;
  private elapsed = 0;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }
  now(): number {
    return this.elapsed + (this.running ? performance.now() - this.startedAt : 0);
  }

  at(ms: number, fn: () => void): ClockJob {
    if (this.jobs.length > 80) this.jobs = this.jobs.filter((job) => !job.done);
    const job: ClockJob = { at: ms, fn, done: false };
    this.jobs.push(job);
    if (this.running) this.arm(job);
    return job;
  }
  retime(job: ClockJob, ms: number): void {
    job.at = ms;
    if (this.running && !job.done) this.arm(job);
  }
  cancel(job: ClockJob): void {
    job.done = true;
    clearTimeout(job.handle);
  }
  start(): void {
    if (this.running) return;
    this.startedAt = performance.now();
    this.running = true;
    this.jobs.forEach((j) => {
      if (!j.done) this.arm(j);
    });
  }
  stop(): void {
    if (!this.running) return;
    this.elapsed = this.now();
    this.running = false;
    this.jobs.forEach((j) => clearTimeout(j.handle));
  }
  reset(): void {
    this.jobs.forEach((j) => clearTimeout(j.handle));
    this.jobs = [];
    this.elapsed = 0;
    this.running = false;
  }

  private arm(job: ClockJob): void {
    clearTimeout(job.handle);
    job.handle = setTimeout(
      () => {
        job.done = true;
        job.fn();
      },
      Math.max(0, job.at - this.now()),
    );
  }
}
