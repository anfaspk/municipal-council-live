import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../core/i18n/i18n';
import { wt } from './winners-strings';
@Pipe({ name: 'wnT' })
export class WnTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return wt(key, params);
  }
}
