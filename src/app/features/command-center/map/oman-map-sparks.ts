import { GEO } from '../../../domain/geo/geo.data';
import { insideRings, Pt, randomIn } from '../../../domain/geo/shapes';
import { Gov } from '../../../domain/stats/stats';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { svgEl } from '../../../shared/ui/markup';

export interface SparkTarget {
  act: SVGElement;
  rs: Pt[][];
}
export interface SparkHost {
  frames: FrameLoop;
  targets: Record<string, SparkTarget>;
  govs(): readonly Gov[];
  current(): string | null;
  visible(): boolean;
  dead(): boolean;
}

export class MapSparks {
  constructor(private readonly host: SparkHost) {}

  spark(gid: string, big?: boolean, at?: Pt): void {
    const n = this.host.targets[gid],
      q = n && (at || randomIn(n.rs, GEO.g[gid]?.b ?? [0, 0, 0, 0]));
    if (!q) return;
    const c = svgEl(
      'circle',
      { class: 'vp', cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: big ? 2.2 : 1.5 },
      n.act,
    );
    c.animate(
      [
        { transform: 'translateY(0)', opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: 'translateY(-' + (big ? 22 : 15) + 'px)', opacity: 0 },
      ],
      { duration: big ? 1700 : 1400, easing: 'cubic-bezier(.16,1,.3,1)' },
    ).onfinish = () => c.remove();
  }
  burst(gid: string): void {
    const n = this.host.targets[gid],
      b = GEO.g[gid]?.b;
    if (!n || !b || !this.host.visible() || this.host.frames.isPaused('dashboard')) return;
    for (let i = 0; i < 3; i++) {
      const q = randomIn(n.rs, b);
      if (!q) continue;
      const r = svgEl(
        'circle',
        { class: 'vr', cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 4 },
        n.act,
      );
      r.animate(
        [
          { transform: 'scale(.4)', opacity: 1 },
          { transform: 'scale(7)', opacity: 0 },
        ],
        { duration: 1500, delay: i * 180, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' },
      ).onfinish = () => r.remove();
    }
    for (let j = 0; j < 9; j++) setTimeout(() => this.spark(gid, true), j * 90);
  }
  private sparkAnywhere(): void {
    const ids = Object.keys(this.host.targets).filter((id) => GEO.g[id]),
      b = ids.map((id) => GEO.g[id]!.b);
    const x0 = Math.min(...b.map((v) => v[0])),
      y0 = Math.min(...b.map((v) => v[1])),
      x1 = Math.max(...b.map((v) => v[2])),
      y1 = Math.max(...b.map((v) => v[3]));
    for (let i = 0; i < 40; i++) {
      const x = x0 + Math.random() * (x1 - x0),
        y = y0 + Math.random() * (y1 - y0),
        id = ids.find((k) => insideRings(x, y, this.host.targets[k]!.rs));
      if (id) {
        this.spark(id, false, [x, y]);
        return;
      }
    }
  }
  activity(): void {
    const h = this.host;
    if (h.dead()) return;
    if (!reducedMotion() && !document.hidden && h.visible() && !h.frames.isPaused('dashboard')) {
      let tot = 0;
      h.govs().forEach((g) => {
        tot += g.voted;
      });
      const cur = h.current();
      if (cur && Math.random() < 0.35) this.spark(cur);
      else if (tot) this.sparkAnywhere();
    }
    setTimeout(() => this.activity(), 120);
  }
}
