import ar from '../../../../assets/i18n/tv-flow-ar.json';
import { fill, Params, TextPart, tParts } from '../../../core/i18n/i18n';
import { t as tv } from '../../../shared/ui/tv-strings';
const STR: Record<string, string> = ar;
export function tvf(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : tv(key, params);
}
export const tvfParts = (key: string, params: Params, bold: readonly string[] = []): TextPart[] =>
  tParts(key, params, bold, STR);
