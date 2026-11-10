import { GEO } from '../../../domain/geo/geo.data';
import { html, Markup } from '../../../shared/ui/markup';

export function mapDefs(id: string): Markup {
  return html`${Object.keys(GEO.g).map(
    (k) =>
      html`<path id="${id}-${k}" d="${GEO.g[k]!.d}" pathLength="1"/><clipPath id="${id}-c-${k}"><use href="#${id}-${k}"/></clipPath>`,
  )}<path id="${id}-ol" d="${GEO.outline}"/><clipPath id="${id}-clip"><use href="#${id}-ol"/></clipPath><filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter><filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter><pattern id="${id}-low" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="om-hatch" width="2" height="7"/></pattern><pattern id="${id}-mid" width="8" height="8" patternUnits="userSpaceOnUse"><circle class="om-hatch" cx="4" cy="4" r="1.1"/></pattern><pattern id="${id}-grid" width="12" height="12" patternUnits="userSpaceOnUse"><circle class="om-dot" cx="1" cy="1" r=".8"/></pattern><linearGradient id="${id}-scan" x1="0" y1="0" x2="0" y2="1"><stop class="om-scan-s" offset="0" stop-opacity="0"/><stop class="om-scan-s" offset=".85" stop-opacity=".12"/><stop class="om-scan-s" offset="1" stop-opacity=".55"/></linearGradient>`;
}
