
export interface Named {
  ar: string;
}

const WHOLE = new Intl.NumberFormat('en-US');
const MUSCAT_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Muscat',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const fmt = (n: number): string => WHOLE.format(Math.round(n));

const EPS = 1e-7;
const two = (h: number): string => {
  const s = String(Math.abs(h)).padStart(3, '0');
  return (h < 0 ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2);
};
const cutOf = (x: number): number =>
  Number.isFinite(x) ? Math.sign(x) * Math.floor(Math.abs(x) * 100 + EPS) : 0;
export function hundredthsOf(part: number, whole: number): number {
  const a = Math.round(part) * 10000,
    b = Math.round(whole);
  if (!(b > 0) || !Number.isFinite(a)) return 0;
  let q = Math.floor(a / b);
  if (q * b > a) q--;
  else if ((q + 1) * b <= a) q++;
  return q;
}
export const pctNum = (x: number): string => two(cutOf(x));
export const pct = (x: number): string => pctNum(x) + '%';
export const pctOf = (part: number, whole: number): string => two(hundredthsOf(part, whole)) + '%';
export const pts = (x: number): string => {
  const h = cutOf(x);
  return (h < 0 ? '' : '+') + two(h);
};
export function sharePct(x: number | string | null | undefined): string {
  if (x === null || x === undefined || x === '') return '';
  const m = /^(\d+)(?:\.(\d+))?$/.exec(typeof x === 'number' ? String(x) : x.trim());
  if (!m) return typeof x === 'number' ? pct(x) : '';
  return String(+m[1]!) + '.' + ((m[2] ?? '') + '00').slice(0, 2) + '%';
}
export const clockStr = (ms: number): string => MUSCAT_CLOCK.format(ms);

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export const esc = (s: unknown): string => String(s).replace(/[&<>"']/g, (c) => ESC[c]!);
export const name = (o: Named): string => o.ar;
