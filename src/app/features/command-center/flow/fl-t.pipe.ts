import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../core/i18n/i18n';
import { fl } from './flow-strings';
@Pipe({ name: 'flT' })
export class FlTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return fl(key, params);
  }
}
