export interface SentinelEntry {
  intersecting: boolean;
  top: number;
  rootTop: number;
}

export const slimOf = (e: SentinelEntry): boolean => !e.intersecting && e.top < e.rootTop;

export const scrollPadOf = (bar: number, safeTop: number): string =>
  Math.max(0, Math.ceil(bar + safeTop)) + 'px';
