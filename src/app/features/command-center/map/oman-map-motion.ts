import { easeExpo, easeSpring } from '../../../shared/motion/easing';
import { FrameHandle, FrameLoop } from '../../../shared/motion/frame-loop.service';
import { tween } from '../../../shared/motion/tween';

export class MapExtrusion {
  readonly ext: Record<string, number> = {};
  readonly hov: Record<string, number> = {};
  private readonly hovTw: Record<string, FrameHandle> = {};
  private extTw: FrameHandle | null = null;

  constructor(
    private readonly frames: FrameLoop,
    private readonly draw: () => void,
    private readonly ids: () => readonly string[],
  ) {}

  add(id: string): void {
    this.hov[id] = 0;
    this.ext[id] = 1;
  }
  flatten(gid: string | null): void {
    if (this.extTw) this.extTw.stop();
    const ids = this.ids();
    const from: Record<string, number> = {},
      to: Record<string, number> = {};
    ids.forEach((id) => {
      from[id] = this.ext[id]!;
      to[id] = !gid || id === gid ? 1 : 0;
    });
    this.extTw = tween(
      this.frames,
      650,
      (t) => {
        ids.forEach((id) => {
          this.ext[id] = from[id]! + (to[id]! - from[id]!) * t;
        });
        this.draw();
      },
      null,
      easeExpo,
    );
  }
  lift(gid: string, v: number): void {
    if (this.hovTw[gid]) this.hovTw[gid].stop();
    const from = this.hov[gid]!;
    this.hovTw[gid] = tween(
      this.frames,
      420,
      (t) => {
        this.hov[gid] = from + (v - from) * t;
        this.draw();
      },
      null,
      easeSpring,
    );
  }
}
