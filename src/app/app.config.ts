import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { OnceErrorHandler } from './core/log/error-handler';
import { NavHistory } from './core/screen/nav-history';
import { FRAME_READS } from './core/screen/viewport.state';
import { FrameLoop } from './shared/motion/frame-loop.service';
import { SHEET_HISTORY, type SheetHistory } from './shared/ui/sheet/sheet-history';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: OnceErrorHandler },
    { provide: FRAME_READS, useExisting: FrameLoop },
    { provide: SHEET_HISTORY, useFactory: sheetHistory },
  ],
};

function sheetHistory(): SheetHistory {
  const nav = inject(NavHistory);
  return {
    enter(back) {
      nav.push('sheet', {}, location.pathname + location.search + location.hash);
      const stop = nav.listen('sheet', () => {
        stop();
        back();
      });
      return () => {
        stop();
        nav.back('sheet');
      };
    },
  };
}
