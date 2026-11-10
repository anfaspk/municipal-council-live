const STAMP = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?$/i;
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

export function stampOf(lV: unknown): string | null {
  const s = typeof lV === 'string' ? lV.trim() : '',
    m = STAMP.exec(s),
    iso = m ? null : ISO.exec(s);
  if (!m && !iso) return null;
  const a = +(m ? m[1]! : iso![3]!),
    b = +(m ? m[2]! : iso![2]!),
    min = +(m ? m[5]! : iso![5]!),
    ap = m?.[7]?.toUpperCase();
  let h = +(m ? m[4]! : iso![4]!);
  if (a < 1 || b < 1 || a > 31 || b > 31 || Math.min(a, b) > 12 || min > 59) return null;
  if (iso && b > 12) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === 'PM' ? 12 : 0);
  } else if (h > 23) return null;
  return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
}
