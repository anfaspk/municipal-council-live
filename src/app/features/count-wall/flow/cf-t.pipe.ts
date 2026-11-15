import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../core/i18n/i18n';
import { cf } from './cf-strings';
@Pipe({ name: 'cfT' })
export class CfTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return cf(key, params);
  }
}
