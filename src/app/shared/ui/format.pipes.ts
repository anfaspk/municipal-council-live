import { Pipe, PipeTransform } from '@angular/core';
import { fmt, pct, sharePct } from '../../domain/format';

@Pipe({ name: 'fmt' })
export class FmtPipe implements PipeTransform {
  transform(n: number): string {
    return fmt(n);
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(x: number): string {
    return pct(x);
  }
}

@Pipe({ name: 'share' })
export class SharePipe implements PipeTransform {
  transform(x: number | null): string {
    return sharePct(x);
  }
}
