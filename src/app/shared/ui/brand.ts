export const LOGO = 'assets/logos/election-logo-2026.png';
export const LOGO_DARK = 'assets/logos/election-logo-2026-dark.png';
export const MOI_LOGO = 'assets/logos/moi-logo.png';
export const MOI_LOGO_DARK = 'assets/logos/moi-logo-dark.png';

export interface LogoFile {
  src: string | null;
  srcset: string | null;
}
export const NO_LOGO: LogoFile = { src: null, srcset: null };
export function logoFor(file: string, flow: boolean, off = false): LogoFile {
  if (off) return NO_LOGO;
  if (!flow) return { src: file, srcset: null };
  const at = (h: number) => file.replace(/\.png$/, `-h${h}.png`);
  return { src: at(64), srcset: `${at(64)} 1x, ${at(128)} 2x, ${at(256)} 3x` };
}
