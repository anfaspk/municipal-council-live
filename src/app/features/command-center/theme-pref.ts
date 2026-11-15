import type { Form } from '../../core/screen/layout.model';

export type Theme = 'night' | 'daylight';
export const THEME_KEY = 'majlis.theme';

export function parseTheme(raw: string | null | undefined): Theme | null {
  return raw === 'night' || raw === 'daylight' ? raw : null;
}

export function themeOf(saved: Theme | null, form: Form, scheme: 'dark' | 'light'): Theme {
  if (saved) return saved;
  return form === 'flow' && scheme === 'light' ? 'daylight' : 'night';
}

export function loadTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
}
export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
  }
}
