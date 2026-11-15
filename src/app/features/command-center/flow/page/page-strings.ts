import ar from '../../../../../assets/i18n/flow-page-ar.json';
import { fill, Params, TextPart, tParts } from '../../../../core/i18n/i18n';
import { fl } from '../flow-strings';
const STR: Record<string, string> = ar;
export function fp(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : fl(key, params);
}
export const fpParts = (key: string, params: Params, bold: readonly string[] = []): TextPart[] =>
  tParts(key, params, bold, STR);
