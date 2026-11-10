import { CGov, CNat, CWil } from '../../domain/count/count';
import { CountShellView } from './count-wall-shell.component';

export interface CountWallState {
  theme: string;
  done: boolean;
  res: boolean;
  mode: 'nat' | 'gov' | null;
  gov: string | null;
  wil: string | null;
  pendWil: string | null;
  natHot: string | null;
  onFly?: (ms: number | null) => void;
}

export interface PanelView {
  key: number;
  kind: 'national' | 'governorate' | 'wilayat';
  national?: CNat;
  governors?: CGov[];
  governorate?: CGov | undefined;
  wilayat?: CWil | undefined;
  results: boolean;
}

export const CHROME0: CountShellView = {
  slides: [],
  index: 0,
  done: false,
  results: false,
  theme: 'night',
  paused: false,
  still: false,
  osMotion: false,
  seconds: 6,
  next: '',
  subtitle: '',
};
