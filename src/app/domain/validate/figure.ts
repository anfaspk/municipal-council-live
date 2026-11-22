
const NUMERIC_TEXT = /^\d+(\.\d+)?$/;
const WHOLE_TEXT = /^-?\d+$/;

export const isNumericText = (x: unknown): x is string =>
  typeof x === 'string' && NUMERIC_TEXT.test(x);

const isBlank = (x: unknown): boolean => x === null || (typeof x === 'string' && x.trim() === '');

export const num = (x: unknown): number | null => {
  if (isBlank(x)) return 0;
  const n = isNumericText(x) ? Number(x) : x;
  return typeof n === 'number' && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n + 0 : null;
};

export const wholeId = (x: unknown): number | null => {
  const n = typeof x === 'string' && WHOLE_TEXT.test(x) ? Number(x) : x;
  return typeof n === 'number' && Number.isSafeInteger(n) ? n : null;
};
