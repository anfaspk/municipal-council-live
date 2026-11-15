import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../core/i18n/i18n';
import { tvf } from './tvf-strings';
@Pipe({ name: 'tvfT' })
export class TvfTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return tvf(key, params);
  }
}
