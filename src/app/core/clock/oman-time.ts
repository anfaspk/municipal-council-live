const OMAN_OFFSET = '+04:00';
const OMAN_MS = 4 * 3600 * 1000;
const PARTS = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;

export function parseOman(s: string): number | null {
  const t = s.trim(),
    v = Date.parse(t.replace(' ', 'T') + OMAN_OFFSET);
  if (Number.isNaN(v)) return null;
  const m = PARTS.exec(t);
  if (!m) return v;
  const at = new Date(v + OMAN_MS),
    [y, mo, d, h, mi, se] = m.slice(1).map((x) => Number(x ?? 0));
  return at.getUTCFullYear() === y &&
    at.getUTCMonth() + 1 === mo &&
    at.getUTCDate() === d &&
    at.getUTCHours() === h &&
    at.getUTCMinutes() === mi &&
    at.getUTCSeconds() === se
    ? v
    : null;
}
