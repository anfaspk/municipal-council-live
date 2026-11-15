export type SplitMode = 'split' | 'stack';
export const SPLIT_MD = 900;
export const SPLIT_SM = 600;

export function splitMode(width: number, vw: number, vh: number): SplitMode {
  if (width >= SPLIT_MD) return 'split';
  return width >= SPLIT_SM && vw > vh ? 'split' : 'stack';
}
