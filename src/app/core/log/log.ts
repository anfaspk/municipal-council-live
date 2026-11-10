const open = new Map<string, string>();

export const log = {
  warn(text: string, ...detail: unknown[]): void {
    console.warn(text, ...detail);
  },
  error(text: string, ...detail: unknown[]): void {
    console.error(text, ...detail);
  },
  once(key: string, text: string, level: 'warn' | 'error' = 'warn', ...detail: unknown[]): boolean {
    if (open.has(key)) return false;
    open.set(key, text);
    (level === 'error' ? console.error : console.warn)(text, ...detail);
    return true;
  },
  clear(key: string): void {
    open.delete(key);
  },
  get seen(): string[] {
    return [...open.values()];
  },
};

export function guard(key: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (e) {
    log.once('guard:' + key, key + ' failed', 'error', e);
    return false;
  }
}
