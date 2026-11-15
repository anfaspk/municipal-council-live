export type StoryStep = 'next' | 'prev';
export type StoryKey = StoryStep | 'toggle' | 'close' | 'first' | 'last';
export type SegState = 'done' | 'on' | 'todo';

export function tapZone(x: number, left: number, width: number, rtl: boolean): StoryStep {
  const endHalf = rtl ? x < left + width / 2 : x >= left + width / 2;
  return endHalf ? 'next' : 'prev';
}

export function stepTo(i: number, n: number, step: StoryStep, loop: boolean): number | null {
  if (n <= 0) return null;
  const j = step === 'next' ? i + 1 : i - 1;
  if (j >= 0 && j < n) return j;
  if (!loop) return step === 'prev' ? 0 : null;
  return (j + n) % n;
}

export function storyKey(key: string, rtl: boolean): StoryKey | null {
  switch (key) {
    case 'ArrowLeft':
      return rtl ? 'next' : 'prev';
    case 'ArrowRight':
      return rtl ? 'prev' : 'next';
    case ' ':
    case 'k':
    case 'K':
    case 'MediaPlayPause':
      return 'toggle';
    case 'Escape':
      return 'close';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

export const segState = (k: number, index: number): SegState =>
  k < index ? 'done' : k === index ? 'on' : 'todo';

export function liveLine(name: string, inside: boolean, said: string | null): string | null {
  if (inside || !name || name === said) return null;
  return name;
}
