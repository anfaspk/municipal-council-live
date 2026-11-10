import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../core/i18n/i18n';
import { at } from './accept-strings';
@Pipe({ name: 'caT' })
export class CaTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return at(key, params);
  }
}
