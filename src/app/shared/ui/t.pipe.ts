import { Pipe, PipeTransform } from '@angular/core';
import { Params, t } from '../../core/i18n/i18n';

@Pipe({ name: 't' })
export class TPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return t(key, params);
  }
}
