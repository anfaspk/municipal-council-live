export type NavOwner = 'detail' | 'sheet' | 'screen' | 'level';
const OWNERS: readonly NavOwner[] = ['detail', 'sheet', 'screen', 'level'];

export interface NavState {
  mjNav?: unknown;
  dtDepth?: unknown;
  [k: string]: unknown;
}

export const asState = (s: unknown): NavState =>
  s && typeof s === 'object' ? (s as NavState) : {};

export function stackOf(s: unknown): NavOwner[] {
  const st = asState(s);
  if (Array.isArray(st.mjNav)) return st.mjNav.filter((o): o is NavOwner => OWNERS.includes(o));
  const d = st.dtDepth;
  return typeof d === 'number' && d > 0 ? Array<NavOwner>(Math.floor(d)).fill('detail') : [];
}

export const pushedState = (s: unknown, owner: NavOwner, own: object = {}): NavState => ({
  ...own,
  mjNav: [...stackOf(s), owner],
});

export const replacedState = (s: unknown, own: object = {}): NavState => ({
  ...own,
  mjNav: stackOf(s),
});

export function backOver(stack: readonly NavOwner[], owner: NavOwner): number {
  const i = stack.indexOf(owner);
  return i < 0 ? 0 : stack.length - i;
}

export const topOf = (stack: readonly NavOwner[]): NavOwner | null =>
  stack[stack.length - 1] ?? null;

export function popOf(
  from: readonly NavOwner[],
  to: readonly NavOwner[],
): { left: NavOwner[]; entered: NavOwner[] } {
  let k = 0;
  while (k < from.length && k < to.length && from[k] === to[k]) k++;
  const left = from.slice(k).reverse(),
    entered = to.slice(k);
  if (!left.length && !entered.length) {
    const top = topOf(to);
    return { left: [], entered: top ? [top] : [] };
  }
  return { left, entered };
}

export const ownersOf = (p: { left: NavOwner[]; entered: NavOwner[] }): NavOwner[] => [
  ...new Set([...p.left, ...p.entered]),
];
