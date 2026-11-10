import { CGov, CWil } from './count';

export interface CountIndex {
  gov(id: string): CGov | null;
  wil(id: number): CWil | null;
  govOf(wid: number): CGov | null;
}

export function indexCount(govs: readonly CGov[]): CountIndex {
  const byId = new Map<string, CGov>(),
    wils = new Map<number, { g: CGov; w: CWil }>();
  govs.forEach((g) => {
    if (!byId.has(g.id)) byId.set(g.id, g);
    g.wil.forEach((w) => {
      if (!wils.has(w.id)) wils.set(w.id, { g, w });
    });
  });
  return {
    gov: (id) => byId.get(id) ?? null,
    wil: (id) => wils.get(id)?.w ?? null,
    govOf: (id) => wils.get(id)?.g ?? null,
  };
}
