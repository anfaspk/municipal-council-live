import { CountStore } from '../../../data/count.store';
import { CGov, CWil } from '../../../domain/count/count';
import { Size } from '../../../domain/geo/projection';
import { Box, Pt } from '../../../domain/geo/shapes';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { CountWallState } from '../count-wall-state';

export interface CountStageActions {
  goGov(id: string): void;
  backToList(user: boolean): void;
  selectWil(w: CWil, user: boolean): void;
  backToNational(): void;
  face(): HTMLElement | undefined;
  highlight(id: string): void;
  settled(): boolean;
  still(): boolean;
}

export interface StageEls {
  el: HTMLElement;
  cam: HTMLElement;
  edge: HTMLElement;
  edgeG: HTMLElement;
  clipP: HTMLElement;
  ov: HTMLElement;
  nodes: HTMLElement;
  labels: HTMLElement;
  scan: HTMLElement;
  comet: HTMLElement;
  comet2: HTMLElement;
  hot: HTMLElement;
  sweep: HTMLElement;
  natg: HTMLElement;
  lock: HTMLElement;
  hint: HTMLElement;
}

export interface StageContext {
  readonly els: StageEls;
  readonly feed: CountStore;
  readonly frames: FrameLoop;
  state(): CountWallState;
  actions(): CountStageActions;
  still(): boolean;
  proj(p: Pt): Pt;
  size(): Size;
  box(id: string): Box;
  gov(id: string): CGov;
  relayout(): void;
}

const ELS: Record<keyof StageEls, string> = {
  el: '',
  cam: '.cx-cam',
  edge: '.cx-edge',
  edgeG: '.cx-edgeg',
  clipP: '.cx-clipp',
  ov: '.cx-ov',
  nodes: '.cx-nodes',
  labels: '.cx-labels',
  scan: '.cx-scan',
  comet: '.cx-comet',
  comet2: '.cx-comet.c2',
  hot: '.cx-hot',
  sweep: '.cx-sweep',
  natg: '.cx-natg',
  lock: '.cx-lock',
  hint: '.cx-hint',
};
export function findEls(host: HTMLElement, els: StageEls): void {
  const out = els as unknown as Record<string, HTMLElement>;
  for (const [k, s] of Object.entries(ELS)) out[k] = s ? host.querySelector<HTMLElement>(s)! : host;
}
