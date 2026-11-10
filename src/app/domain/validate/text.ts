const BIDI = /[‪-‮⁦-⁩‎‏؜]/g;

export const cleanText = (s: unknown): string =>
  typeof s === 'string' ? s.replace(BIDI, '').trim() : '';
export const hasBidi = (s: unknown): boolean => typeof s === 'string' && s.search(BIDI) >= 0;
