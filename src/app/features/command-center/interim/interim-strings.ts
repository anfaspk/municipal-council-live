import ar from '../../../../assets/i18n/interim-ar.json';
import { fill, Params, t as common } from '../../../core/i18n/i18n';
const STR: Record<string, string> = ar;
export function irT(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : common(key, params);
}
