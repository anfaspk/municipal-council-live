import { ct } from '../../../core/i18n/count-strings';
import { CGov, CWil } from '../../../domain/count/count';
import { GEO } from '../../../domain/geo/geo.data';
import { CountLabelBox as Box, layoutCountLabels } from '../../../domain/geo/label-layout';
import { Box as Rect, Pt } from '../../../domain/geo/shapes';
import { restartAnimation } from '../../../shared/motion/restart-animation';
import { setMarkup, svgEl } from '../../../shared/ui/markup';
import * as C from './stage-camera';
import { StageContext } from './stage-context';
import {
  HUB,
  labelInner,
  lockReadout,
  nodeInner,
  nodeMarkup,
  STATUS_LABEL,
  STREAM,
} from './stage-markup';

interface Node {
  wid: number;
  n: string;
  pt: Pt;
  g: SVGGElement;
  s: SVGGElement;
  lb: HTMLElement;
  dx: number;
  dy: number;
}

export class GovernorateOverlay {
  private nodes: Node[] = [];
  private hub: { c: Pt; g: SVGGElement } | null = null;

  constructor(private readonly x: StageContext) {}

  get length(): number {
    return this.nodes.length;
  }
  get hasHub(): boolean {
    return !!this.hub;
  }
  clear(): void {
    this.nodes = [];
    this.hub = null;
  }
  build(gv: CGov): void {
    const els = this.x.els,
      c = GEO.g[gv.id]?.c;
    if (!c) return;
    const hg = svgEl('g', { class: 'cx-hb' }, els.hub) as SVGGElement;
    setMarkup(hg, HUB);
    this.hub = { c, g: hg };
    gv.wil.forEach((w, i) => {
      if (!w.pt) return;
      const g = svgEl(
        'g',
        {
          class: 'cx-n ' + w.st,
          'data-w': w.n,
          tabindex: '0',
          role: 'button',
          'aria-label': w.n + ', ' + ct(STATUS_LABEL[w.st]),
        },
        els.nodes,
      ) as SVGGElement;
      g.style.setProperty('--j', String(i));
      setMarkup(g, nodeMarkup(w));
      const st = svgEl('g', { class: 'cx-s ' + w.st, 'data-w': w.n }, els.streams) as SVGGElement;
      st.style.setProperty('--j', String(i));
      setMarkup(st, STREAM);
      const lb = document.createElement('div');
      lb.className = 'cx-lb ' + w.st;
      lb.setAttribute('data-w', w.n);
      lb.style.setProperty('--j', String(i));
      setMarkup(lb, labelInner(w));
      els.labels.appendChild(lb);
      this.nodes.push({ wid: w.id, n: w.n, pt: w.pt, g, s: st, lb, dx: 0, dy: -46 });
      const pick = () => {
        const cur = this.x.feed.wilById(w.id);
        if (cur) this.x.actions().selectWil(cur, true);
      };
      g.addEventListener('click', pick);
      lb.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      });
      const hov = (on: boolean) => {
        g.classList.toggle('hov', on);
        lb.classList.toggle('hov', on);
        st.classList.toggle('hov', on);
      };
      [g, lb].forEach((e) => {
        e.addEventListener('pointerenter', () => hov(true));
        e.addEventListener('pointerleave', () => hov(false));
      });
    });
  }
  layout(): void {
    if (!this.nodes.length || !this.hub) return;
    const { width: W, height: H } = this.x.size(),
      hc = this.x.proj(this.hub.c),
      items: (Box & { nd: Node; X: number; Y: number })[] = [];
    this.nodes.forEach((nd) => {
      const p = this.x.proj(nd.pt),
        dx = p[0] - hc[0],
        dy = p[1] - hc[1],
        d = Math.hypot(dx, dy) || 1;
      const w = nd.lb.offsetWidth || 120,
        h = nd.lb.offsetHeight || 44,
        R = 44 + Math.max(w, h) * 0.3;
      const ux = this.nodes.length > 1 ? dx / d : 0,
        uy = this.nodes.length > 1 ? dy / d : -1;
      items.push({
        nd,
        X: p[0],
        Y: p[1],
        x: p[0] + ux * (R + w * 0.25),
        y: p[1] + uy * R - 6,
        w,
        h,
      });
    });
    const obst: Box[] = this.nodes.map((nd) => {
      const p = this.x.proj(nd.pt);
      return { fixed: 1, soft: 1, x: p[0], y: p[1], w: 52, h: 52 };
    });
    obst.push({ fixed: 1, x: hc[0], y: hc[1], w: 30, h: 30 });
    obst.push({ fixed: 1, x: 140, y: 42, w: 270, h: 70 });
    const lr = this.lockRect(this.x.state().gov!),
      rw = Math.min(420, lr[2] - lr[0] + 120);
    obst.push({ fixed: 1, x: lr[0] + rw / 2, y: lr[1] - 16, w: rw, h: 30 });
    obst.push({ fixed: 1, x: W / 2, y: H - 34, w: W, h: 64 });
    const placed = layoutCountLabels([...items, ...obst], W, H, C.labelInset(W, H));
    items.forEach((it, index) => {
      const p = placed[index]!;
      it.nd.dx = p.px - it.X;
      it.nd.dy = p.py - it.Y;
    });
  }
  place(): void {
    if (!this.hub) return;
    const hc = this.x.proj(this.hub.c);
    this.hub.g.setAttribute('transform', 'translate(' + C.f1(hc[0]) + ' ' + C.f1(hc[1]) + ')');
    this.nodes.forEach((nd) => {
      const p = this.x.proj(nd.pt);
      nd.g.setAttribute('transform', 'translate(' + C.f1(p[0]) + ' ' + C.f1(p[1]) + ')');
      nd.lb.style.transform = C.labelAt(p[0] + nd.dx, p[1] + nd.dy);
      nd.g
        .querySelector('.ln')!
        .setAttribute(
          'd',
          C.connectorPath(nd.dx, nd.dy, nd.lb.offsetWidth / 2, nd.lb.offsetHeight / 2),
        );
      const sd = C.streamPath(hc, p);
      (nd.s.firstChild as Element).setAttribute('d', sd);
      (nd.s.lastChild as Element).setAttribute('d', sd);
    });
  }
  private lockRect(id: string): Rect {
    const b = this.x.box(id);
    return C.lockRect(this.x.proj([b[0], b[1]]), this.x.proj([b[2], b[3]]), this.x.size());
  }
  lockOn(gv: CGov): void {
    const [x0, y0, x1, y1] = this.lockRect(gv.id);
    const lk = this.x.els.lock,
      el = this.x.els.el;
    lk.style.left = C.f1(x0) + 'px';
    lk.style.top = C.f1(y0) + 'px';
    lk.style.width = C.f1(x1 - x0) + 'px';
    lk.style.height = C.f1(y1 - y0) + 'px';
    setMarkup(lk.querySelector('span')!, lockReadout(gv));
    const rw = Math.min(460, x1 - x0 + 140),
      boxes = this.nodes.map((nd): Rect => {
        const r = nd.lb.getBoundingClientRect(),
          sb = el.getBoundingClientRect(),
          z = el.offsetWidth / (sb.width || 1);
        return [
          (r.left - sb.left) * z,
          (r.top - sb.top) * z,
          (r.right - sb.left) * z,
          (r.bottom - sb.top) * z,
        ];
      });
    const hit = (y: number) =>
      boxes.some((b) => b[0] < x0 + rw && b[2] > x0 && b[1] < y + 16 && b[3] > y - 16);
    lk.classList.remove('bot', 'mute');
    if (hit(y0 - 16)) {
      if (!hit(y1 + 16)) lk.classList.add('bot');
      else lk.classList.add('mute');
    }
    restartAnimation(lk, 'go');
  }
  private nodeOf(wn: string | null): Node | null {
    return this.nodes.find((node) => node.n === wn) ?? null;
  }
  setSel(wn: string | null): void {
    this.x.els.el.classList.toggle('has-sel', !!wn);
    this.nodes.forEach((nd) => {
      const on = nd.n === wn;
      nd.g.classList.toggle('sel', on);
      nd.lb.classList.toggle('sel', on);
      nd.s.classList.toggle('sel', on);
    });
  }
  update(w: CWil): void {
    const nd = this.nodeOf(w.n);
    if (!nd) return;
    const has = (e: Element, c: string) => (e.classList.contains(c) ? ' ' + c : '');
    nd.g.setAttribute('class', 'cx-n ' + w.st + has(nd.g, 'sel') + has(nd.g, 'hov'));
    const inner = nd.g.querySelector('.in')!;
    setMarkup(inner, nodeInner(w));
    nd.lb.className = 'cx-lb ' + w.st + has(nd.lb, 'sel');
    setMarkup(nd.lb, labelInner(w));
    this.x.relayout();
    nd.s.setAttribute('class', 'cx-s ' + w.st + has(nd.s, 'sel'));
    if (this.x.still()) return;
    const rp = svgEl('circle', { class: 'cx-rip ' + w.st, r: '16' }, inner);
    rp.animate(
      [
        { transform: 'scale(.8)', opacity: 0.9 },
        { transform: 'scale(2.4)', opacity: 0 },
      ],
      { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' },
    ).onfinish = () => rp.remove();
  }
  hover(name: string | null, on: boolean): void {
    const node = this.nodeOf(name);
    if (node) [node.g, node.lb, node.s].forEach((element) => element.classList.toggle('hov', on));
  }
}
