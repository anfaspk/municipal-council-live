import { t } from '../../../core/i18n/i18n';
import { GEO } from '../../../domain/geo/geo.data';
import { ViewBox } from '../../../domain/geo/projection';
import { pathRings, Pt } from '../../../domain/geo/shapes';
import { Gov } from '../../../domain/stats/stats';
import { setMarkup, svgEl as el } from '../../../shared/ui/markup';
import { mapDefs } from './oman-map-defs';
import { LABEL_OFFSET, SIDE_LAYERS } from './oman-map.model';

export interface MapNode {
  h?: number;
  ax: number;
  ay: number;
  g: SVGElement;
  sides: SVGElement[];
  top: SVGElement;
  pat: SVGElement;
  act: SVGElement;
  edge: SVGElement;
  raised: SVGElement[];
  lead?: SVGElement | undefined;
  lab: HTMLElement;
  nm: HTMLElement;
  pc: HTMLElement;
  rs: Pt[][];
}
export interface MapDom {
  svg: SVGElement;
  layers: SVGElement[];
  pats: [SVGElement, SVGElement, SVGElement];
  gReg: SVGElement;
  gWil: SVGElement;
  nodes: Record<string, MapNode>;
}

export function buildMap(
  tilt: HTMLElement,
  labels: HTMLElement,
  id: string,
  vb0: ViewBox,
  order: readonly Gov[],
): MapDom {
  const vb = vb0.join(' ');
  const layer = (cls: string, a: Record<string, string> = { 'aria-hidden': 'true' }) =>
    el('svg', { class: cls, viewBox: vb, preserveAspectRatio: 'xMidYMid meet', ...a }, tilt);
  const ground = layer('om-svg om-ground'),
    halo = layer('om-svg om-halo-layer');
  const svg = layer('om-svg', { role: 'group', 'aria-label': t('map') });
  const defs = el('defs', null, svg);
  setMarkup(defs, mapDefs(id));
  const patternOf = (k: string) => defs.querySelector<SVGElement>('#' + id + '-' + k)!,
    pats: MapDom['pats'] = [patternOf('low'), patternOf('mid'), patternOf('grid')];
  const ref = (k: string) => '#' + id + '-' + k,
    url = (k: string) => 'url(#' + id + '-' + k + ')';
  el('use', { href: ref('ol'), class: 'om-shadow', filter: url('soft') }, ground);
  el('use', { href: ref('ol'), class: 'om-halo', filter: url('glow') }, halo);
  el('use', { href: ref('ol'), class: 'om-rim' }, svg);
  const gReg = el('g', { class: 'om-regions' }, svg);
  const gTex = el('g', { class: 'om-tex', 'clip-path': url('clip') }, svg);
  const W = GEO.w + 20,
    H = GEO.h + 20;
  el('rect', { x: -10, y: -10, width: W, height: H, fill: url('grid'), class: 'om-grid' }, gTex);
  el('rect', { x: -10, y: -60, width: W, height: 60, fill: url('scan'), class: 'om-scan' }, gTex);
  const gLead = el('g', { class: 'om-leads' }, svg);
  const gWil = el('g', { class: 'om-wils' }, svg);

  const nodes: Record<string, MapNode> = {};
  order.forEach((g) => {
    const grp = el('g', { class: 'rg', tabindex: 0, role: 'button', 'data-id': g.id }, gReg);
    const shape = { href: ref(g.id) };
    const sides: SVGElement[] = [];
    for (let s = 0; s < SIDE_LAYERS; s++) sides.push(el('use', { ...shape, class: 'side' }, grp));
    const top = el('use', { ...shape, class: 'top' }, grp);
    const pat = el('use', { ...shape, class: 'pat' }, grp);
    const act = el('g', { class: 'act', 'clip-path': url('c-' + g.id) }, grp);
    const edge = el('use', { ...shape, class: 'edge' }, grp);
    const lead = LABEL_OFFSET[g.id] ? el('path', { class: 'om-lead' }, gLead) : undefined;
    const lab = document.createElement('div'),
      nm = document.createElement('span'),
      pc = document.createElement('b');
    lab.className = 'om-lab';
    nm.className = 'nm';
    lab.append(nm, pc);
    labels.appendChild(lab);
    top.style.fillOpacity = '1.00';
    const rs = pathRings(GEO.g[g.id]!.d);
    const raised = [top, pat, edge, act];
    nodes[g.id] = {
      ax: 0,
      ay: 0,
      g: grp,
      sides,
      top,
      pat,
      act,
      edge,
      raised,
      lead,
      lab,
      nm,
      pc,
      rs,
    };
  });
  return { svg, layers: [ground, halo, svg], pats, gReg, gWil, nodes };
}
