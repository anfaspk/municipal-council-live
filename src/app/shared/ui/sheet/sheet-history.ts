import { InjectionToken } from '@angular/core';

export interface SheetHistory {
  enter(back: () => void): () => void;
}
export const SHEET_HISTORY = new InjectionToken<SheetHistory>('sheet history');
