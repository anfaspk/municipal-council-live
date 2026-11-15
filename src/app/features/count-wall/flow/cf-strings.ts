import ar from '../../../../assets/i18n/count-flow-ar.json';
import { ct } from '../../../core/i18n/count-strings';
import { fill, Params } from '../../../core/i18n/i18n';
const STR: Record<string, string> = ar;
export function cf(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : ct(key, params);
}
