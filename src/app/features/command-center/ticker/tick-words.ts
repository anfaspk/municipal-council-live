import { t, TextPart, tParts } from '../../../core/i18n/i18n';
import type { Tick } from '../../../data/ticker.store';
import { fmt, pct } from '../../../domain/format';

export function tickWords(tick: Tick): TextPart[] {
  if (tick.kind === 'counted') return tParts('counted', { g: tick.gov, v: fmt(tick.votes) }, ['v']);
  if (tick.kind === 'passes') return tParts('passes', { g: tick.gov, p: tick.p + '%' }, ['g']);
  return [
    { text: t('finalCount'), bold: true },
    { text: ' · ' + pct(tick.turnout), bold: false },
  ];
}
