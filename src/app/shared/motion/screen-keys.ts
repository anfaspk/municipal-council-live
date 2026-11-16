export type ScreenKeyAction =
  | { type: 'tab' }
  | { type: 'close' }
  | { type: 'fullscreen' }
  | { type: 'wil'; step: 1 | -1 }
  | { type: 'play'; pause?: boolean }
  | { type: 'go'; to: 'next' | 'prev' | 'first' | 'last' };

export interface KeyInfo {
  key: string;
  keyCode?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  onButton?: boolean;
  onField?: boolean;
}

const BACK_KEYS: readonly string[] = ['GoBack', 'BrowserBack'];
const BACK_CODES: readonly number[] = [461, 10009];
export const isBack = (e: { key: string; keyCode?: number }): boolean =>
  BACK_KEYS.includes(e.key) || (e.keyCode !== undefined && BACK_CODES.includes(e.keyCode));
export const keyOf = (e: { key: string; keyCode?: number }): string =>
  e.key === 'Escape' || isBack(e) ? 'Escape' : e.key;

const GO: Record<string, 'next' | 'prev' | 'first' | 'last'> = {
  ArrowLeft: 'next',
  ArrowRight: 'prev',
  PageDown: 'next',
  MediaTrackNext: 'next',
  PageUp: 'prev',
  MediaTrackPrevious: 'prev',
  Home: 'first',
  End: 'last',
};

export function screenKey(e: KeyInfo, screen: 'tv' | 'wall' = 'tv'): ScreenKeyAction | null {
  const k = keyOf(e);
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (k === 'Tab') return { type: 'tab' };
  if (k === 'Escape') return { type: 'close' };
  if (e.onField) return null;
  if ((k === ' ' || k === 'Enter') && e.onButton) return null;
  if (k === 'f' || k === 'F') return { type: 'fullscreen' };
  if (screen === 'tv' && (k === 'ArrowUp' || k === 'ArrowDown'))
    return { type: 'wil', step: k === 'ArrowDown' ? 1 : -1 };
  if (k === ' ' || k === 'k' || k === 'K' || k === 'MediaPlayPause' || k === 'Pause')
    return { type: 'play' };
  if (k === 'MediaPlay') return { type: 'play', pause: false };
  if (k === 'MediaPause' || k === 'MediaStop') return { type: 'play', pause: true };
  const to = Object.hasOwn(GO, k) ? GO[k] : undefined;
  return to ? { type: 'go', to } : null;
}
