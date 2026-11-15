import { Pipe, PipeTransform } from '@angular/core';
import { Params } from '../../../core/i18n/i18n';
import { wf } from './wf-strings';
@Pipe({ name: 'wfT' })
export class WfTPipe implements PipeTransform {
  transform(key: string, params?: Params): string {
    return wf(key, params);
  }
}
