import ar from '../../../../assets/i18n/winners-flow-ar.json';
import { fill, Params } from '../../../core/i18n/i18n';
import { wt } from '../winners-strings';
const STR: Record<string, string> = ar;
export function wf(key: string, params?: Params): string {
  const value = STR[key];
  return value ? fill(value, params) : wt(key, params);
}
