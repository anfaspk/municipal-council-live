import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../../core/i18n/i18n';
import { fp } from './page-strings';
@Pipe({ name: 'fpT' })
export class FpTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return fp(key, params);
  }
}
