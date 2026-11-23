import { bareGov, REGIONS } from '../../../domain/places/places';

export interface CueGov {
  id: string;
  name: string;
}
export const CUE_GOVS: readonly CueGov[] = REGIONS.map((r) => ({
  id: String(r.id),
  name: bareGov(r.ar),
}));
