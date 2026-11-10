import { ct } from '../../../core/i18n/count-strings';
import { CCand, CGov, countGov, countRace, CSt, CWil, seedOf } from '../../../domain/count/count';
import { pct } from '../../../domain/format';
import { GEO } from '../../../domain/geo/geo.data';
import { Pt } from '../../../domain/geo/shapes';
import { html, Markup } from '../../../shared/ui/markup';
import { f1, f2 } from './stage-camera';

export const STATUS_LABEL: Record<CSt, string> = {
  await: 'stAwait',
  count: 'stCount',
  pend: 'cxCountedSt',
  decl: 'stDecl',
};

export function stGlyph(st: CSt, s = 16): Markup {
  const h = s / 2,
    r = s * 0.38,
    sw = Math.max(1.2, s / 11);
  const tick = html`<path d="M${f2(h - r * 0.48)} ${f2(h + r * 0.02)}l${f2(r * 0.36)} ${f2(r * 0.36)}l${f2(r * 0.62)} ${f2(-r * 0.7)}"/>`;
  const body =
    st === 'await'
      ? html`<circle cx="${h}" cy="${h}" r="${f2(r)}" class="o"/>`
      : st === 'count'
        ? html`<circle cx="${h}" cy="${h}" r="${f2(r)}" class="t"/><path class="a" d="M${h} ${f2(h - r)}A${f2(r)} ${f2(r)} 0 1 1 ${f2(h - r)} ${h}"/>`
        : html`<circle cx="${h}" cy="${h}" r="${f2(r)}" class="d"/>${tick}`;
  return html`<svg class="cxg ${st}" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="--sw:${f2(sw)}px" aria-hidden="true">${body}</svg>`;
}
export function avatar(c: CCand): Markup {
  return c.photo
    ? html`<i class="cx-av ph "><img src="${c.photo}" alt="" decoding="async"></i>`
    : html`<i class="cx-av ">${c.ini}</i>`;
}

export function stageMarkup(u: string, govName: (id: string) => string | null): Markup {
  const paths = Object.entries(GEO.g).map(
    ([id, g]) =>
      html`<path class="cx-g" data-g="${id}" d="${g.d}"><title>${govName(id) ?? ''}</title></path>`,
  );
  const keys = (['decl', 'pend', 'count', 'await'] as CSt[]).map(
    (k) => html`<span class="${k}">${stGlyph(k, 14)}${ct(STATUS_LABEL[k])}</span>`,
  );
  return html`<div class="cx-grid" aria-hidden="true"></div><svg class="cx-geo" aria-hidden="true"><defs><pattern id="${u}-dots" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.05"/></pattern><linearGradient id="${u}-sweep" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(18 .5 .5)"><stop offset="0" class="w0"/><stop offset=".42" class="w1"/><stop offset=".5" class="w2"/><stop offset=".58" class="w1"/><stop offset="1" class="w0"/></linearGradient><radialGradient id="${u}-fill" cx="50%" cy="45%" r="70%"><stop offset="0" class="s0"/><stop offset="1" class="s1"/></radialGradient><linearGradient id="${u}-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="k0"/><stop offset=".78" class="k1"/><stop offset=".97" class="k2"/><stop offset="1" class="k3"/></linearGradient><clipPath id="${u}-clip"><path class="cx-clipp"/></clipPath></defs><g class="cx-cam">${paths}</g><path class="cx-area" clip-path="url(#${u}-clip)" fill="url(#${u}-fill)" d="M0 0H4000V4000H0Z"/><rect class="cx-dots" clip-path="url(#${u}-clip)" fill="url(#${u}-dots)" width="100%" height="100%"/><g clip-path="url(#${u}-clip)"><rect class="cx-scan" fill="url(#${u}-scan)" x="0" y="0" width="0" height="0"/><rect class="cx-sweep" fill="url(#${u}-sweep)" x="0" y="0" width="0" height="0"/></g><path class="cx-hot" pathLength="1"/><path class="cx-edgeg"/><path class="cx-edge" pathLength="1"/><path class="cx-comet" pathLength="1"/><path class="cx-comet c2" pathLength="1"/></svg><svg class="cx-ov"><g class="cx-natg"></g><g class="cx-streams"></g><g class="cx-hub"></g><g class="cx-nodes"></g></svg><div class="cx-labels"></div><div class="cx-lock" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></div><div class="cx-hud" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="cx-legend"><div class="cx-key">${keys}</div><div class="cx-hint"></div></div>`;
}

export const HUB = html`<circle class="p1" r="9"/><circle class="p2" r="9"/><path class="hx" d="M0 -9 7.8 -4.5 7.8 4.5 0 9 -7.8 4.5 -7.8 -4.5Z"/><circle class="c" r="3"/>`;
export const STREAM = html`<path class="b" pathLength="1"/><path class="k" pathLength="100"/>`;

export function nodeInner(w: CWil): Markup {
  const r = countRace(w),
    lead = r.top[0],
    st = w.st;
  const core =
    st === 'await' || !w.counted || !lead
      ? html`<circle class="dot" r="2.6"/>`
      : lead.photo
        ? html`<image class="ph" href="${lead.photo}" x="-12" y="-12" width="24" height="24" preserveAspectRatio="xMidYMid slice"/><circle class="rim" r="12"/>`
        : html`<text class="ini" y="4.2" aria-hidden="true">${lead.ini}</text>`;
  return html`<circle class="hit" r="30"/><circle class="halo" r="24"/><g class="tk"><circle r="20.5" pathLength="120"/></g><circle class="trk" r="15"/><circle class="arc" r="15" pathLength="100" stroke-dasharray="${f2(st === 'count' ? r.p : st === 'await' ? 0 : 100)} 100" transform="rotate(-90)"/><circle class="core" r="10.5"/>${core}`;
}
export const nodeMarkup = (w: CWil): Markup =>
  html`<path class="ln"/><g class="in">${nodeInner(w)}</g>`;
export function labelInner(w: CWil): Markup {
  const r = countRace(w),
    lead = r.top[0],
    st = w.st;
  const head = html`<b>${w.n}</b><span class="pc mj-num">${pct(r.p)}</span>`;
  if (st === 'decl' && w.counted && lead)
    return html`${head}${r.top.map((c) => html`<span class="ld el">${avatar(c)}<span>${c.ar}</span></span>`)}`;
  const sub =
    st === 'await'
      ? ct('stAwait')
      : !w.counted || !lead
        ? ct('cStarting')
        : html`${avatar(lead)}${lead.ar}`;
  return html`${head}<span class="ld">${sub}</span>`;
}
export function natLabelInner(gv: CGov): Markup {
  const s = countGov(gv);
  return html`<b>${gv.ar}</b><span class="pc mj-num">${pct(s.p)}</span><i class="bar"><s style="--fill:${f1(s.p)}%"></s></i>`;
}
export function natGroups(): Markup {
  const dots = Object.keys(GEO.wilPt || {}).flatMap((gid) =>
    (GEO.wilPt[gid] || []).map(
      (x) =>
        html`<circle class="cx-wd" r="2" data-x="${x.c[0]}" data-y="${x.c[1]}" style="--d:${((seedOf(String(x.i)) % 37) / 10).toFixed(1)}"/>`,
    ),
  );
  return html`<g class="cx-nlines"></g><g class="cx-wds">${dots}</g><g class="cx-pings"></g>`;
}
export const natLine = (p: Readonly<Pt>, dx: number, dy: number): Markup =>
  html`<path d="M${f1(p[0])} ${f1(p[1])}L${f1(p[0] + dx * 0.72)} ${f1(p[1] + dy * 0.72)}"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="2.4"/>`;
export function lockReadout(gv: CGov): Markup {
  const s = countGov(gv);
  return html`<b>${gv.ar}</b> ${ct('cxLock', { n: s.n, p: pct(s.p) })}`;
}
