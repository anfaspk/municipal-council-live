export const TV_SECS = [16, 24, 32];
export interface TvPrefs {
  sec: number;
  still: boolean;
}

export interface TvPrefsConfig {
  key: string;
  seconds: readonly number[];
  defaultSeconds: number;
}
const TV_PREFS: TvPrefsConfig = { key: 'majlis.tv', seconds: TV_SECS, defaultSeconds: 16 };
export const COUNT_TV_PREFS: TvPrefsConfig = {
  key: 'majlis.ctv2',
  seconds: [4, 6, 8],
  defaultSeconds: 6,
};

export function loadTvPrefs(config: TvPrefsConfig = TV_PREFS): TvPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(config.key) || '{}') || {};
    return {
      sec: config.seconds.includes(p.sec) ? p.sec : config.defaultSeconds,
      still: !!p.still,
    };
  } catch {
    return { sec: config.defaultSeconds, still: false };
  }
}
export function saveTvPrefs(p: TvPrefs, config: TvPrefsConfig = TV_PREFS): void {
  try {
    localStorage.setItem(config.key, JSON.stringify(p));
  } catch {
  }
}
