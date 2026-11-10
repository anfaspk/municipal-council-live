import { countGov } from '../../../domain/count/count';
import { GEO } from '../../../domain/geo/geo.data';
import { CountLabelBox as Box, layoutCountLabels } from '../../../domain/geo/label-layout';
import { Pt } from '../../../domain/geo/shapes';
import { html, setMarkup, svgEl } from '../../../shared/ui/markup';
import * as C from './stage-camera';
import { StageContext } from './stage-context';
import { natGroups, natLabelInner, natLine } from './stage-markup';

interface NatLabel {
  id: string;
  lb: HTMLElement;
  c: Pt;
  dx: number;
  dy: number;
}

export class NationalOverlay {
  private labels: NatLabel[] = [];

  constructor(private readonly x: StageContext) {}

  clear(): void {
    this.labels = [];
  }
  tint(id: string): void {
    const p = this.x.els.el.querySelector<HTMLElement>('.cx-g[data-g="' + id + '"]'),
      s = countGov(this.x.gov(id));
    if (p) p.style.setProperty('--pp', C.f1(6 + s.p * 0.2) + '%');
  }
  build(ids: readonly string[]): void {
    const els = this.x.els;
    setMarkup(els.natg, natGroups());
    ids.forEach((id, i) => {
      const gv = this.x.gov(id),
        s = countGov(gv),
        c = GEO.g[id]?.c;
      if (!c) return;
      const lb = document.createElement('div');
      lb.className = 'cx-nl' + (s.decl === s.n ? ' full' : '');
      lb.setAttribute('data-g', id);
      lb.style.setProperty('--j', String(i));
      setMarkup(lb, natLabelInner(gv));
      lb.addEventListener('click', () => this.x.actions().goGov(id));
      lb.addEventListener('pointerenter', () => this.hover(id, true));
      lb.addEventListener('pointerleave', () => this.hover(id, false));
      els.labels.appendChild(lb);
      this.labels.push({ id, lb, c, dx: 0, dy: 0 });
      this.tint(id);
    });
  }
  layout(): void {
    const { width: W, height: H } = this.x.size(),
      items = this.labels.map((n) => {
        const p = this.x.proj(n.c),
          w = n.lb.offsetWidth || 90,
          h = n.lb.offsetHeight || 46;
        return { n, X: p[0], Y: p[1], x: p[0], y: p[1], w, h } as Box & {
          n: NatLabel;
          X: number;
          Y: number;
        };
      });
    const placed = layoutCountLabels(
      [...items, { fixed: 1, x: W / 2, y: H - 34, w: W, h: 64 }],
      W,
      H,
      C.labelInset(W, H),
    );
    items.forEach((it, index) => {
      const p = placed[index]!;
      it.n.dx = p.px - it.X;
      it.n.dy = p.py - it.Y;
    });
  }
  place(): void {
    const lines = this.labels.map((n) => {
      const p = this.x.proj(n.c);
      n.lb.style.transform = C.labelAt(p[0] + n.dx, p[1] + n.dy);
      return Math.hypot(n.dx, n.dy) > 36 ? natLine(p, n.dx, n.dy) : null;
    });
    const ln = this.x.els.natg.querySelector('.cx-nlines');
    if (ln) setMarkup(ln, html`${lines}`);
    this.x.els.natg.querySelectorAll('.cx-wd').forEach((c) => {
      const p = this.x.proj([+c.getAttribute('data-x')!, +c.getAttribute('data-y')!]);
      c.setAttribute('cx', C.f1(p[0]));
      c.setAttribute('cy', C.f1(p[1]));
    });
  }
  ping(id: string, big?: boolean): void {
    const pings = this.x.els.natg.querySelector('.cx-pings'),
      c0 = GEO.g[id]?.c;
    if (this.x.state().mode !== 'nat' || this.x.still() || !pings || !c0) return;
    const p = this.x.proj(c0),
      c = svgEl(
        'circle',
        { class: 'cx-ping' + (big ? ' big' : ''), cx: C.f1(p[0]), cy: C.f1(p[1]), r: '10' },
        pings,
      );
    c.animate(
      [
        { transform: 'scale(.6)', opacity: 0.9 },
        { transform: 'scale(' + (big ? 5 : 3.4) + ')', opacity: 0 },
      ],
      { duration: big ? 2200 : 1500, easing: 'cubic-bezier(.16,1,.3,1)' },
    ).onfinish = () => c.remove();
  }
  hover(id: string, on: boolean): void {
    this.x.els.el
      .querySelectorAll('.cx-g[data-g="' + id + '"]')
      .forEach((p) => p.classList.toggle('hov', on));
    this.labels.forEach((n) => {
      if (n.id === id) n.lb.classList.toggle('hov', on);
    });
    const f = this.x.actions().face();
    if (f)
      f.querySelectorAll('.cx-gr[data-g="' + id + '"]').forEach((b) =>
        b.classList.toggle('hov', on),
      );
  }
  live(id: string): void {
    this.tint(id);
    this.labels.forEach((n) => {
      if (n.id !== id) return;
      const gv = this.x.gov(id),
        s = countGov(gv);
      setMarkup(n.lb, natLabelInner(gv));
      n.lb.classList.toggle('full', s.decl === s.n);
    });
    this.x.relayout();
    this.ping(id, false);
  }
  hot(id: string | null): void {
    this.x.els.el
      .querySelectorAll('.cx-g')
      .forEach((p) => p.classList.toggle('hot', p.getAttribute('data-g') === id));
    this.labels.forEach((n) => n.lb.classList.toggle('hot', n.id === id));
  }
}
