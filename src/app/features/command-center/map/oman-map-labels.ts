import { clampLabelX, spreadTags } from '../../../domain/geo/label-layout';
import { projector, Size, ViewBox } from '../../../domain/geo/projection';
import { Gov } from '../../../domain/stats/stats';
import { MapNode } from './oman-map-build';
import { MapWilayat } from './oman-map-wilayat';

export class MapLabels {
  size: Size = { width: 0, height: 0 };
  private readonly labSize = new WeakMap<Element, Size>();
  private readonly labAt = new WeakMap<HTMLElement, string>();

  constructor(private readonly host: HTMLElement) {}

  measure(entries: ResizeObserverEntry[]): boolean {
    let host = false;
    for (const e of entries) {
      const box = e.borderBoxSize[0]!;
      if (e.target === this.host) {
        host = true;
        this.size = { width: box.inlineSize, height: box.blockSize };
        this.host.classList.toggle('compact', box.blockSize > 0 && box.blockSize < 420);
      } else
        this.labSize.set(e.target, {
          width: Math.round(box.inlineSize),
          height: Math.round(box.blockSize),
        });
    }
    return host;
  }
  place(
    vb: ViewBox,
    govs: readonly Gov[],
    nodes: Record<string, MapNode>,
    wil: MapWilayat,
    dh: number,
  ): void {
    const { width: W, height: H } = this.size,
      project = projector(vb, this.size);
    govs.forEach((g) => {
      const n = nodes[g.id];
      if (!n) return;
      const p = project(n.ax, n.ay),
        w = this.labSize.get(n.lab)?.width ?? 0;
      this.move(n.lab, clampLabelX(p.x, w, W), p.y);
    });
    if (!wil.length) return;
    const tags = wil.tags(project, dh, (e) => this.labSize.get(e));
    spreadTags(tags, W, H).forEach((t, i) => this.move(wil.label(i), t.x, t.y));
  }
  private move(lab: HTMLElement, x: number, y: number): void {
    const at = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
    if (this.labAt.get(lab) === at) return;
    this.labAt.set(lab, at);
    lab.style.translate = at;
  }
}
