export const FLUID_BELOW = 1200;
export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

const STEPS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.1, 1.2, 1.25, 1.33, 1.5, 1.7, 1.75, 2, 2.4, 2.5, 3, 4, 5,
];

export function zoomOf(outerWidth: number, innerWidth: number): number {
  if (!outerWidth || !innerWidth) return 1;
  const r = outerWidth / innerWidth;
  return STEPS.find((s) => Math.abs(r - s) / s < 0.012) ?? 1;
}

export type Fit =
  | { kind: 'fluid' }
  | { kind: 'scale'; scale: number; width: number; height: number; scroll: boolean };

export function fitOf(vw: number, vh: number, zoom: number, fluidOk: boolean): Fit {
  if (fluidOk && vw < FLUID_BELOW) return { kind: 'fluid' };
  const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H) * zoom,
    width = Math.max(DESIGN_W, vw / scale),
    height = Math.max(DESIGN_H, vh / scale);
  return {
    kind: 'scale',
    scale,
    width,
    height,
    scroll: width * scale > vw + 0.5 || height * scale > vh + 0.5,
  };
}
