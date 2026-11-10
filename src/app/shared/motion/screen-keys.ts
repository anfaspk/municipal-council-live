export type ScreenKeyAction =
  | { type: 'tab' }
  | { type: 'close' }
  | { type: 'fullscreen' }
  | { type: 'wil'; step: 1 | -1 }
  | { type: 'play'; pause?: boolean }
  | { type: 'go'; to: 'next' | 'prev' | 'first' | 'last' };

export interface KeyInfo {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  onButton?: boolean;
  onField?: boolean;
}

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
  const k = e.key;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (k === 'Tab') return { type: 'tab' };
  if (k === 'Escape') return { type: 'close' };
  if (e.onField) return null;
  if ((k === ' ' || k === 'Enter') && e.onButton) return null;
  if (screen === 'wall' && (k === 'f' || k === 'F')) return { type: 'fullscreen' };
  if (screen === 'tv' && (k === 'ArrowUp' || k === 'ArrowDown'))
    return { type: 'wil', step: k === 'ArrowDown' ? 1 : -1 };
  if (k === ' ' || k === 'k' || k === 'K' || k === 'MediaPlayPause' || k === 'Pause')
    return { type: 'play' };
  if (k === 'MediaPlay') return { type: 'play', pause: false };
  if (k === 'MediaPause' || k === 'MediaStop') return { type: 'play', pause: true };
  const to = Object.hasOwn(GO, k) ? GO[k] : undefined;
  return to ? { type: 'go', to } : null;
}
