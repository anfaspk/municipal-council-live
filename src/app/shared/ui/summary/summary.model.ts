import { fmt, pct } from '../../../domain/format';

export type SummaryKind = 'pct' | 'num';

export function summaryFigure(value: number | null | undefined, kind: SummaryKind): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return kind === 'pct' ? pct(value) : fmt(value);
}
