
const NUMERIC_TEXT = /^\d+(\.\d+)?$/;
const WHOLE_TEXT = /^-?\d+$/;

export const isNumericText = (x: unknown): x is string =>
  typeof x === 'string' && NUMERIC_TEXT.test(x);

export const num = (x: unknown): number | null => {
  const n = isNumericText(x) ? Number(x) : x;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

export const wholeId = (x: unknown): number | null => {
  const n = typeof x === 'string' && WHOLE_TEXT.test(x) ? Number(x) : x;
  return typeof n === 'number' && Number.isSafeInteger(n) ? n : null;
};
