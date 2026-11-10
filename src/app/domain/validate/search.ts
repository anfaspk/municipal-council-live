import { cleanText } from './text';

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ‌‍]/g;
const LETTERS: Readonly<Record<string, string>> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ى: 'ي',
  ئ: 'ي',
  ؤ: 'و',
  ة: 'ه',
};
const SWAP = new RegExp('[' + Object.keys(LETTERS).join('') + ']', 'g');
const DIGITS = /[٠-٩۰-۹]/g;

export function normalizeAr(s: string): string {
  return cleanText(s)
    .replace(MARKS, '')
    .replace(SWAP, (c) => LETTERS[c]!)
    .replace(DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
