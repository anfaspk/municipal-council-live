import { pct } from '../../../domain/format';
import { GEO } from '../../../domain/geo/geo.data';
import { Tag } from '../../../domain/geo/label-layout';
import { band } from '../../../domain/stats/turnout';
import { html, setMarkup, svgEl } from '../../../shared/ui/markup';
import { WilPoint } from './oman-map.model';

interface WilNode {
  i: number;
  n: string;
  c: [number, number];
  g: SVGElement;
  stem: SVGElement;
  ring: SVGElement;
  halo: SVGElement;
  core: SVGElement;
  lab: HTMLElement;
}

export class MapWilayat {
  private wil: WilNode[] = [];
  private data: Record<number, WilPoint> = {};
  hot: string | null = null;
  sel: string | null = null;

  constructor(
    private readonly points: SVGElement,
    private readonly labels: HTMLElement,
    private readonly ro: () => ResizeObserver | undefined,
  ) {}

  get length(): number {
    return this.wil.length;
  }
  build(gid: string | null): void {
    this.wil.forEach((w) => this.ro()?.unobserve(w.lab));
    this.points.replaceChildren();
    this.labels.replaceChildren();
    this.wil = [];
    this.hot = null;
    this.sel = null;
    if (!gid) return;
    (GEO.wilPt[gid] || []).forEach((p, i) => {
      const n = this.data[p.i]?.name ?? String(p.i);
      const g = svgEl(
          'g',
          { class: 'om-wp', 'data-w': n, tabindex: -1, style: '--j:' + i },
          this.points,
        ),
        x = p.c[0].toFixed(2);
      const stem = svgEl('line', { class: 'stem', x1: x, x2: x }, g),
        ring = svgEl('circle', { class: 'ring', cx: x }, g),
        halo = svgEl('circle', { class: 'halo', cx: x }, g),
        core = svgEl('circle', { class: 'core', cx: x }, g);
      const lab = document.createElement('div');
      lab.className = 'om-wl';
      lab.style.setProperty('--j', String(i));
      lab.setAttribute('data-w', n);
      this.labels.appendChild(lab);
      this.ro()?.observe(lab);
      this.wil.push({ i: p.i, n, c: p.c, g, stem, ring, halo, core, lab });
    });
    this.paint();
  }
  paint(): void {
    this.wil.forEach((w) => {
      const d = this.data[w.i],
        t = d ? d.t : null,
        b = t == null ? 'mid' : band(t),
        st = (w.n === this.hot ? ' is-hot' : '') + (w.n === this.sel ? ' is-sel' : '');
      w.g.setAttribute('class', 'om-wp ' + b + st);
      w.lab.className = 'om-wl ' + b + st;
      setMarkup(
        w.lab,
        html`<span class="nm">${w.n}</span>${t == null ? null : html`<b>${pct(t)}</b>`}`,
      );
    });
  }
  setData(rows: readonly WilPoint[]): void {
    this.data = {};
    rows.forEach((r) => {
      this.data[r.id] = r;
    });
    this.wil.forEach((w) => {
      const d = this.data[w.i];
      if (d && d.name !== w.n) {
        w.n = d.name;
        w.g.setAttribute('data-w', d.name);
        w.lab.setAttribute('data-w', d.name);
      }
    });
    this.paint();
  }
  layout(dh: number, zs: number): void {
    this.wil.forEach((w) => {
      const y = (w.c[1] - dh).toFixed(2);
      w.core.setAttribute('cy', y);
      w.halo.setAttribute('cy', y);
      w.ring.setAttribute('cy', y);
      w.stem.setAttribute('y1', y);
      w.stem.setAttribute('y2', (w.c[1] - dh - 14 / zs).toFixed(2));
      w.core.setAttribute('r', (3.4 / zs).toFixed(3));
      w.halo.setAttribute('r', (7.5 / zs).toFixed(3));
      w.ring.setAttribute('r', (11 / zs).toFixed(3));
    });
  }
  tags(
    project: (x: number, y: number) => { x: number; y: number },
    dh: number,
    size: (e: Element) => { width: number; height: number } | undefined,
  ): Tag[] {
    return this.wil.map((w) => {
      const p = project(w.c[0], w.c[1] - dh),
        sz = size(w.lab);
      return { x: p.x, y: p.y - 12, width: sz?.width ?? 0, height: sz?.height ?? 0 };
    });
  }
  label(i: number): HTMLElement {
    return this.wil[i]!.lab;
  }
}
