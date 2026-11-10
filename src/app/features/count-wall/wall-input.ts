import { screenKey } from '../../shared/motion/screen-keys';
import { trapTab } from '../../shared/ui/focus-trap';
import { CountShellAction } from './count-wall-shell.component';
import { CountWallState } from './count-wall-state';
import { RACE_SCROLL } from './wall-live';

export interface InputHost {
  root: HTMLElement;
  tv(): HTMLElement | null;
  state: CountWallState;
  wake(): void;
  manualHold(): void;
  release(): void;
  toggle(pause?: boolean): void;
  show(k: number): void;
  at(): { k: number; n: number };
  backToList(): void;
  resTab(t: string): void;
  leave(): void;
  setTheme(): void;
  setSec(v: number): void;
  toggleStill(): void;
}

export function fullscreen(): void {
  const d = document.documentElement;
  try {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else d.requestFullscreen?.();
  } catch {
  }
}

export function wallAction(action: CountShellAction, h: InputHost): void {
  const { k } = h.at();
  switch (action.type) {
    case 'close':
      return h.leave();
    case 'theme':
      return h.setTheme();
    case 'fullscreen':
      return fullscreen();
    case 'pause':
      return h.toggle();
    case 'previous':
    case 'next':
    case 'slide':
      h.release();
      return h.show(action.type === 'slide' ? action.index : k + (action.type === 'next' ? 1 : -1));
    case 'seconds':
      return h.setSec(action.value);
    case 'motion':
      return h.toggleStill();
  }
}

export function wallKey(e: KeyboardEvent, h: InputHost): void {
  const tv = h.tv();
  if (!tv || !tv.classList.contains('on') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key,
    t = e.target as Element | null,
    state = h.state;
  const onBtn = t && t.closest && t.closest('button,[role="button"]'),
    inList = t && t.closest && t.closest(RACE_SCROLL);
  h.wake();
  if (k === 'Tab') return trapTab(h.root, e, 'button');
  if ((k === ' ' || k === 'Enter') && onBtn) return;
  const tabs = t && t.closest && t.closest('.cxr-tabs');
  if (tabs && (k === 'ArrowLeft' || k === 'ArrowRight')) {
    e.preventDefault();
    const nt = tabs.getAttribute('data-t') === 'win' ? 'race' : 'win';
    h.manualHold();
    h.resTab(nt);
    tabs.querySelector<HTMLElement>('[data-t="' + nt + '"]')!.focus();
    return;
  }
  if (inList && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(k)) return;
  const action = screenKey(
    { key: k, onButton: !!onBtn, onField: !!(t && t.closest && t.closest('select, input')) },
    'wall',
  );
  if (!action) return;
  if (action.type === 'close') {
    e.preventDefault();
    if (state.wil) h.backToList();
    else if (state.mode === 'gov') {
      h.manualHold();
      h.show(0);
    } else h.leave();
    return;
  }
  if (action.type === 'fullscreen') {
    e.preventDefault();
    fullscreen();
    return;
  }
  if (action.type === 'play') {
    if (action.pause === undefined) e.preventDefault();
    h.toggle(action.pause);
    return;
  }
  if (action.type === 'go') {
    e.preventDefault();
    const { k: at, n } = h.at();
    const go = { next: at + 1, prev: at - 1, first: 0, last: n - 1 }[action.to];
    h.release();
    h.show(go);
  }
}
