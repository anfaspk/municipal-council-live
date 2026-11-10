
export type ViewBox = readonly [x: number, y: number, width: number, height: number];

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

const TILT = { perspective: 1800, rotateX: 30, rotateZ: -5, scale: 1.1 } as const;

export const TILT_CSS =
  `perspective(${TILT.perspective}px) rotateX(${TILT.rotateX.toFixed(2)}deg) ` +
  `rotateZ(${TILT.rotateZ.toFixed(2)}deg) scale(${TILT.scale.toFixed(3)})`;

const RAD = Math.PI / 180;
const COS_X = Math.cos(TILT.rotateX * RAD);
const SIN_X = Math.sin(TILT.rotateX * RAD);
const COS_Z = Math.cos(TILT.rotateZ * RAD);
const SIN_Z = Math.sin(TILT.rotateZ * RAD);

export function projector(viewBox: ViewBox, host: Size): (x: number, y: number) => Point {
  const [vx, vy, vw, vh] = viewBox;
  const { width, height } = host;
  const fit = Math.min(width / vw, height / vh);
  const offsetX = (width - vw * fit) / 2 - vx * fit;
  const offsetY = (height - vh * fit) / 2 - vy * fit;
  const originX = width / 2;
  const originY = height / 2;
  return (x, y) => {
    const sx = (offsetX + x * fit - originX) * TILT.scale;
    const sy = (offsetY + y * fit - originY) * TILT.scale;
    const rx = sx * COS_Z - sy * SIN_Z;
    const ry = sx * SIN_Z + sy * COS_Z;
    const ty = ry * COS_X;
    const tz = ry * SIN_X;
    const w = 1 - tz / TILT.perspective;
    return { x: originX + rx / w, y: originY + ty / w };
  };
}

export interface FlatCamera {
  cx: number;
  cy: number;
  s: number;
}
export interface FlatTransform {
  k: number;
  tx: number;
  ty: number;
}
export function cameraTransform(camera: FlatCamera, host: Size): FlatTransform {
  const k = host.width / camera.s;
  return { k, tx: host.width / 2 - camera.cx * k, ty: host.height / 2 - camera.cy * k };
}
export function projectFlat(
  point: readonly [number, number],
  transform: FlatTransform,
): [number, number] {
  return [point[0] * transform.k + transform.tx, point[1] * transform.k + transform.ty];
}
