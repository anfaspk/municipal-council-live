import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../core/i18n/i18n';
import { t } from './tv-strings';
@Pipe({ name: 't' })
export class TvTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return t(key, params);
  }
}
