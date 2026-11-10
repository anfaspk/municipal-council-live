import { esc } from '../../domain/format';

export class Markup {
  constructor(readonly html: string) {}
  toString(): string {
    return this.html;
  }
}
export type Part = Markup | string | number | null | undefined | false | readonly Part[];

const part = (v: Part): string =>
  v instanceof Markup
    ? v.html
    : Array.isArray(v)
      ? v.map(part).join('')
      : v === null || v === undefined || v === false
        ? ''
        : esc(v);

export function html(strings: TemplateStringsArray, ...values: Part[]): Markup {
  let s = strings[0]!;
  for (let i = 0; i < values.length; i++) s += part(values[i]) + strings[i + 1]!;
  return new Markup(s);
}

export function setMarkup(el: Element, m: Markup): void {
  el.innerHTML = m.html;
}
export function fragment(m: Markup): DocumentFragment {
  return document.createRange().createContextualFragment(m.html);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svgEl(
  tag: string,
  attrs: Record<string, string | number> | null,
  parent?: Element,
): SVGElement {
  const e = document.createElementNS(SVG_NS, tag) as SVGElement;
  if (attrs) Object.keys(attrs).forEach((k) => e.setAttribute(k, String(attrs[k])));
  if (parent) parent.appendChild(e);
  return e;
}
