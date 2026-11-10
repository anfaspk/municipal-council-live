import ar from '../../../../assets/i18n/detail-ar.json';
import { fill, Params, t as common, TextPart, tParts } from '../../../core/i18n/i18n';
const STR: Record<string, string> = ar;
export function dt(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : common(key, params);
}
export const dtParts = (key: string, params: Params, bold: readonly string[] = []): TextPart[] =>
  tParts(key, params, bold, STR);
