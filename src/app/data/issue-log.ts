import { log } from '../core/log/log';
import { Issue } from '../domain/stats/check';

export class IssueLog {
  private open = new Map<string, Issue>();

  constructor(private readonly prefix: string) {}

  get current(): Issue[] {
    return [...this.open.values()];
  }

  report(found: readonly Issue[]): void {
    const next = new Map<string, Issue>();
    found.forEach((i) => {
      if (!next.has(i.key)) next.set(i.key, i);
    });
    next.forEach((i, k) => {
      if (!this.open.has(k)) log.warn(this.prefix + ' check: ' + i.text);
    });
    this.open = next;
  }
}
