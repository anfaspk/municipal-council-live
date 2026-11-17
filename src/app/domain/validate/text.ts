const BIDI = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;
const INVISIBLE =
  /[\u00AD\u200B\uFEFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const BREAKS = /[\p{Cc}\u2028\u2029]+/gu;
const MAX_MARKS = 4;
const MARK_RUN = new RegExp(`(\\p{M}{${MAX_MARKS}})\\p{M}+`, 'gu');
const MAX_NAME = 200;

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  let out = '',
    n = 0;
  for (const ch of s) {
    if (n++ === max) break;
    out += ch;
  }
  return out;
}

export const cleanText = (s: unknown): string =>
  typeof s === 'string'
    ? clip(
        s.replace(BIDI, '').replace(INVISIBLE, '').replace(BREAKS, ' ').replace(MARK_RUN, '$1'),
        MAX_NAME,
      ).trim()
    : '';
export const hasBidi = (s: unknown): boolean => typeof s === 'string' && s.search(BIDI) >= 0;
