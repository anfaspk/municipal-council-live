import places from '../../../assets/places-ar.json';

export interface Region {
  id: number;
  ar: string;
  order: number;
}
export interface Wilayat {
  id: number;
  ar: string;
  region: number;
  order: number;
  regionOrder: number;
}

const byOrder = (a: { order: number; id: number }, b: { order: number; id: number }) =>
  a.order - b.order || a.id - b.id;

export const REGIONS: readonly Region[] = [...places.regions].sort(byOrder);
export const WILAYAT: readonly Wilayat[] = [...places.wilayat].sort(
  (a, b) => a.regionOrder - b.regionOrder || byOrder(a, b),
);

const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
const WILS_BY_REGION = new Map<number, Wilayat[]>();
for (const w of WILAYAT) WILS_BY_REGION.set(w.region, [...(WILS_BY_REGION.get(w.region) ?? []), w]);

export const regionWils = (id: number): readonly Wilayat[] => WILS_BY_REGION.get(id) ?? [];

export const bareGov = (ar: string): string => ar.replace(/^محافظة\s+/, '');
export const regionName = (id: number): string => bareGov(REGION_BY_ID.get(id)?.ar ?? '');
