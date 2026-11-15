
const FACES: readonly [string, readonly number[], string][] = [
  ['IBM Plex Sans Arabic', [400, 500, 600, 700], 'بa0'],
];
export const SCREEN_FONTS = FACES.flatMap(([family, weights, text]) =>
  weights.map((w) => ({ font: w + ' 16px "' + family + '"', text })),
);

const RETRY_MS = 4000;
const CHUNKS = {
  tv: () => import('../tv/tv.component'),
  tvFlow: () => import('../tv/flow/tv-flow.component'),
  wall: () => import('../count-wall/count-wall.component'),
  wallFlow: () => import('../count-wall/flow/count-flow.component'),
  drawFlow: () => import('../count-wall/draw/flow/draw-flow.component'),
  winners: () => import('../winners/winners.component'),
  winnersFlow: () => import('../winners/flow/winners-flow.component'),
  draw: () => import('../count-wall/draw/draw.component'),
} as const;
export type Ahead = keyof typeof CHUNKS;

const fetch = (load: () => Promise<unknown>) =>
  load().catch(() => setTimeout(() => load().catch(() => undefined), RETRY_MS));

export function prefetchScreens(doc: Document, next: Ahead | null = null, saveData = false): void {
  if (next) {
    if (saveData) return;
    const idle = (window as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback;
    if (idle) idle(() => fetch(CHUNKS[next]));
    else setTimeout(() => fetch(CHUNKS[next]), 1000);
    return;
  }
  [CHUNKS.tv, CHUNKS.wall, CHUNKS.winners, CHUNKS.draw].forEach(fetch);
  SCREEN_FONTS.forEach(({ font, text }) => doc.fonts?.load(font, text).catch(() => undefined));
}
