import { Injectable } from '@angular/core';


@Injectable()
export class DetailFlight {
  private armed = true;
  take(): boolean {
    const a = this.armed;
    this.armed = false;
    return a;
  }
}

export interface FlyBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface FlyShape {
  d: string;
  band: string;
}

const EASE = 'cubic-bezier(.6,0,.2,1)';

export function boxIn(el: HTMLElement, frame: HTMLElement): FlyBox | null {
  let x = 0,
    y = 0,
    n: HTMLElement | null = el;
  while (n && n !== frame) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return n === frame && el.offsetWidth > 0 ? { x, y, w: el.offsetWidth, h: el.offsetHeight } : null;
}

export function homeOf(frame: HTMLElement, gid: string): DOMRect | null {
  const els = [
    frame.querySelector('.map-stage .rg[data-id="' + gid + '"] .top'),
    frame.querySelector('.mj-drawer .dsw'),
  ];
  for (const el of els) {
    const r = el?.getBoundingClientRect();
    if (r && r.width > 2 && r.height > 2) return r;
  }
  return null;
}

function ghost(frame: HTMLElement, box: FlyBox, s: FlyShape): [HTMLElement, SVGPathElement] {
  const ns = 'http://www.w3.org/2000/svg',
    el = document.createElement('div'),
    svg = document.createElementNS(ns, 'svg'),
    path = document.createElementNS(ns, 'path');
  el.className = 'cc-fly ' + s.band;
  el.setAttribute('aria-hidden', 'true');
  el.style.left = box.x + 'px';
  el.style.top = box.y + 'px';
  el.style.width = box.w + 'px';
  el.style.height = box.h + 'px';
  svg.setAttribute('class', 'cc-fly-svg');
  svg.setAttribute('viewBox', '0 0 ' + box.w + ' ' + box.h);
  path.setAttribute('d', s.d);
  svg.append(path);
  el.append(svg);
  frame.append(el);
  return [el, path];
}

function moveTo(el: HTMLElement, at: DOMRect, to: DOMRect, frame: HTMLElement): string {
  const c = el.getBoundingClientRect(),
    sc = frame.getBoundingClientRect().width / frame.offsetWidth || 1,
    kx = to.width / at.width,
    ky = to.height / at.height,
    tx = (to.left - c.left - kx * (at.left - c.left)) / sc,
    ty = (to.top - c.top - ky * (at.top - c.top)) / sc;
  return 'translate(' + tx + 'px,' + ty + 'px) scale(' + kx + ',' + ky + ')';
}

export function flyIn(frame: HTMLElement, from: DOMRect, box: FlyBox, s: FlyShape): void {
  const [el, path] = ghost(frame, box, s),
    at = path.getBoundingClientRect();
  if (at.width < 2 || at.height < 2) return el.remove();
  el.animate(
    [
      { transform: moveTo(el, at, from, frame), opacity: 0.85, easing: EASE },
      { transform: 'none', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 0 },
    ],
    { duration: 1000, fill: 'both' },
  ).onfinish = () => el.remove();
}

export function flyOut(
  frame: HTMLElement,
  box: FlyBox,
  s: FlyShape,
  home: () => DOMRect | null,
): () => void {
  const [el, path] = ghost(frame, box, s);
  return () => {
    const at = path.getBoundingClientRect(),
      to = home();
    if (!to || at.width < 2 || at.height < 2) return el.remove();
    const there = moveTo(el, at, to, frame);
    el.animate(
      [
        { transform: 'none', opacity: 1, easing: EASE },
        { transform: there, opacity: 0.9, offset: 0.8 },
        { transform: there, opacity: 0 },
      ],
      { duration: 800, fill: 'both' },
    ).onfinish = () => el.remove();
  };
}
