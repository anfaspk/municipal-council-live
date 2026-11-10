import { ErrorHandler, Injectable } from '@angular/core';
import { log } from './log';

@Injectable()
export class OnceErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const e = error as { message?: unknown; stack?: unknown } | null,
      text = String(e?.message ?? error),
      at =
        String(e?.stack ?? '')
          .split('\n')[1]
          ?.trim() ?? '';
    log.once('error:' + text + '@' + at, 'uncaught error: ' + text, 'error', error);
  }
}
