
export function arrange(parent: Element, nodes: Element[]): void {
  const keep = nodes.find((n) => n.contains(document.activeElement));
  if (!keep) {
    nodes.forEach((n) => parent.appendChild(n));
    return;
  }
  const k = nodes.indexOf(keep);
  nodes.slice(0, k).forEach((n) => parent.insertBefore(n, keep));
  nodes.slice(k + 1).forEach((n) => parent.appendChild(n));
}

export interface MapInput {
  drilled(): boolean;
  wilHot(): string | null;
  wilEmit(name: string | null): void;
  setHot(gid: string | null): void;
  pickWil(name: string): void;
  select(gid: string): void;
}
export function hoverWiring(svg: SVGElement, m: MapInput): void {
  const wp = (e: Event) => (e.target as Element).closest('.om-wp'),
    rg = (e: Event) => (e.target as Element).closest('.rg');
  svg.addEventListener('pointerover', (e) => {
    const w = wp(e);
    if (w) {
      m.wilEmit(w.getAttribute('data-w'));
      return;
    }
    if (m.drilled()) {
      if (m.wilHot()) m.wilEmit(null);
      return;
    }
    const g = rg(e);
    if (g) m.setHot(g.getAttribute('data-id'));
  });
  svg.addEventListener('pointerleave', () => {
    if (m.drilled()) {
      if (m.wilHot()) m.wilEmit(null);
      return;
    }
    m.setHot(null);
  });
  svg.addEventListener('focusin', (e) => {
    if (m.drilled()) return;
    const g = rg(e);
    if (g) m.setHot(g.getAttribute('data-id'));
  });
  svg.addEventListener('focusout', () => {
    if (m.drilled()) return;
    m.setHot(null);
  });
  svg.addEventListener('click', (e) => {
    const w = wp(e);
    if (w) {
      m.pickWil(w.getAttribute('data-w')!);
      return;
    }
    const g = rg(e);
    if (g) m.select(g.getAttribute('data-id')!);
  });
  svg.addEventListener('keydown', (e) => {
    const g = rg(e);
    if (!g) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      m.select(g.getAttribute('data-id')!);
    }
  });
}
