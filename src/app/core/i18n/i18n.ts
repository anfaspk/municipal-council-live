import ar from '../../../assets/i18n/ar.json';

export type Params = Record<string, string | number>;

const STR: Record<string, string> = ar;

export function t(key: string, params?: Params): string {
  return fill(STR[key] || key, params);
}

const iso = (v: string) => '\u2068' + v + '\u2069';
const RULES = new Intl.PluralRules('ar');

export function plural(noun: string, n: number, shown = String(n)): string {
  return form(noun, n).split('{n}').join(iso(shown));
}
const form = (noun: string, n: number) =>
  STR[noun + '.' + RULES.select(n)] ?? STR[noun + '.other'] ?? '{n}';
const count = (v: string) => Number(v.replace(/,/g, ''));

export function fill(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)(?:\|(\w+))?\}/g, (piece, k: string, noun?: string) => {
    if (!Object.hasOwn(params, k)) return piece;
    const v = String(params[k]);
    return noun ? plural(noun, count(v), v) : iso(v);
  });
}

export interface TextPart {
  text: string;
  bold: boolean;
  key?: string;
}
export function tParts(
  key: string,
  params: Params,
  bold: readonly string[] = [],
  table: Readonly<Record<string, string>> = STR,
): TextPart[] {
  return (table[key] || STR[key] || key)
    .split(/(\{\w+(?:\|\w+)?\})/)
    .filter((s) => s !== '')
    .flatMap((s): TextPart[] => {
      const m = /^\{(\w+)(?:\|(\w+))?\}$/.exec(s),
        k = m?.[1];
      if (k === undefined || !(k in params)) return [{ text: s, bold: false }];
      const v = String(params[k]),
        piece = { text: iso(v), bold: bold.includes(k), key: k };
      if (!m?.[2]) return [piece];
      return form(m[2], count(v))
        .split(/(\{n\})/)
        .filter((x) => x !== '')
        .map((x) => (x === '{n}' ? piece : { text: x, bold: false }));
    });
}
