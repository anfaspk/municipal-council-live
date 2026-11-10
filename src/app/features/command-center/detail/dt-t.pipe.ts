import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../core/i18n/i18n';
import { dt } from './detail-strings';
@Pipe({ name: 'dtT' })
export class DtTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return dt(key, params);
  }
}
