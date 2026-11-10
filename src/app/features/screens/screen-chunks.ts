
const FACES: readonly [string, readonly number[], string][] = [
  ['IBM Plex Sans Arabic', [400, 500, 600, 700], 'بa0'],
];
export const SCREEN_FONTS = FACES.flatMap(([family, weights, text]) =>
  weights.map((w) => ({ font: w + ' 16px "' + family + '"', text })),
);

const RETRY_MS = 4000;
const CHUNKS: readonly (() => Promise<unknown>)[] = [
  () => import('../tv/tv.component'),
  () => import('../count-wall/count-wall.component'),
  () => import('../winners/winners.component'),
  () => import('../count-wall/draw/draw.component'),
];

export function prefetchScreens(doc: Document): void {
  CHUNKS.forEach((load) =>
    load().catch(() => setTimeout(() => load().catch(() => undefined), RETRY_MS)),
  );
  SCREEN_FONTS.forEach(({ font, text }) => doc.fonts?.load(font, text).catch(() => undefined));
}
