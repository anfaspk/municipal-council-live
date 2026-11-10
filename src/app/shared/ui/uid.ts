let n = 0;
export const uid = (prefix: string): string => prefix + ++n;
