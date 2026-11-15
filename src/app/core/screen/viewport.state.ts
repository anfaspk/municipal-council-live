import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  InjectionToken,
  linkedSignal,
  type Signal,
  signal,
} from '@angular/core';
import {
  type Display,
  type Form,
  FLOW_READY,
  formOf,
  fxOf,
  type Layout,
  type LayoutEnv,
  layoutOf,
  parseForm,
  type ScreenComp,
  screenComp,
  zoomOf,
} from './layout.model';
import type { Screen } from './screen-prefs';
import { ScreenState } from './screen.state';

export interface ViewportReading {
  vw: number;
  vh: number;
  outer: number;
  dpr: number;
  keyboard: number;
  safeT: number;
  safeR: number;
  safeB: number;
  safeL: number;
  coarse: boolean;
  anyCoarse: boolean;
  hover: boolean;
  display: Display;
  dark: boolean;
  saveData: boolean;
}

export type ViewportChange = 'resize' | 'other';

export interface ViewportHost {
  read(): ViewportReading;
  listen(change: (kind: ViewportChange) => void): () => void;
  search(): string;
}

export interface FrameReads {
  once(task: { read(now: number): void }): unknown;
}
export const FRAME_READS = new InjectionToken<FrameReads>('one frame read');

export const VIEWPORT_HOST = new InjectionToken<ViewportHost>('viewport host', {
  providedIn: 'root',
  factory: browserViewportHost,
});

const REST = 150;
const same = (a: ViewportReading, b: ViewportReading) =>
  (Object.keys(a) as (keyof ViewportReading)[]).every((k) => a[k] === b[k]);
const portrait = (r: ViewportReading) => r.vh > r.vw;
const sameLayout = (a: Layout, b: Layout) =>
  (Object.keys(a) as (keyof Layout)[]).every((k) => a[k] === b[k]);

@Injectable({ providedIn: 'root' })
export class ViewportState {
  private readonly host = inject(VIEWPORT_HOST);
  private readonly frames = inject(FRAME_READS);
  private readonly screens = inject(ScreenState);
  private readonly forced: Form | null = parseForm(this.host.search());
  private readonly reading = signal(this.host.read(), { equal: same });
  private readonly held = signal<{ screen: string; form: Form } | null>(null);
  private settled = this.reading();
  private rest = 0;
  private queued = false;

  readonly layout = computed<Layout>(
    () => {
      const env = this.env(),
        held = this.held();
      if (!held || held.screen !== env.screen) return layoutOf(env);
      return layoutOf({ ...env, forced: this.forced ?? held.form }, FLOW_READY, held.form);
    },
    { equal: sameLayout },
  );
  readonly form = computed(() => this.layout().form);
  private readonly dash = linkedSignal<{ on: boolean; form: Form; env: LayoutEnv }, Form>({
    source: () => ({ on: this.screens.is('dashboard'), form: this.form(), env: this.env() }),
    computation: (s, prev) =>
      s.on ? s.form : formOf({ ...s.env, screen: 'dashboard' }, FLOW_READY, prev?.value),
  });
  readonly dashForm = computed(() => this.dash());
  formFor(s: Screen): Form {
    return this.screens.is(s) ? this.form() : formOf({ ...this.env(), screen: s }, FLOW_READY);
  }
  readonly tier = computed(() => this.layout().tier);
  readonly size = computed(() => ({ w: this.reading().vw, h: this.reading().vh }), {
    equal: (a, b) => a.w === b.w && a.h === b.h,
  });
  readonly orientation = computed(() => (portrait(this.reading()) ? 'portrait' : 'landscape'));
  readonly coarse = computed(() => this.reading().coarse);
  readonly anyCoarse = computed(() => this.reading().anyCoarse);
  readonly hover = computed(() => this.reading().hover);
  readonly dpr = computed(() => this.reading().dpr);
  readonly display = computed(() => this.reading().display);
  readonly scheme = computed(() => (this.reading().dark ? 'dark' : 'light'));
  readonly saveData = computed(() => this.reading().saveData);
  readonly keyboard = computed(() => this.reading().keyboard);
  readonly fx = computed(() => {
    const r = this.reading();
    return fxOf(this.form(), r.vw - r.safeL - r.safeR, r.coarse, r.saveData);
  });
  readonly safe = computed(() => {
    const r = this.reading();
    return { top: r.safeT, left: r.safeL, width: r.vw - r.safeL - r.safeR };
  });

  constructor() {
    const stop = this.host.listen((kind) => {
      if (kind === 'resize') {
        clearTimeout(this.rest);
        this.rest = setTimeout(() => this.settle(), REST) as unknown as number;
      }
      this.queue();
    });
    inject(DestroyRef).onDestroy(() => {
      stop();
      clearTimeout(this.rest);
    });
  }

  private queue(): void {
    if (this.queued) return;
    this.queued = true;
    this.frames.once({ read: () => this.measure() });
  }

  private measure(): void {
    this.queued = false;
    const next = this.host.read(),
      on = this.layout().form;
    this.held.set({ screen: this.screens.screen(), form: on });
    this.reading.set(next);
    if (portrait(next) !== portrait(this.settled)) this.settle();
  }

  private settle(): void {
    this.reading.set(this.host.read());
    this.settled = this.reading();
    const held = this.held();
    if (!held || held.screen !== this.screens.screen()) return;
    const form = formOf(this.env(), FLOW_READY, held.form);
    if (form !== held.form) this.held.set({ screen: held.screen, form });
  }

  private env(): LayoutEnv {
    const r = this.reading();
    return {
      vw: r.vw - r.safeL - r.safeR,
      vh: r.vh - r.safeT - r.safeB,
      zoom: zoomOf(r.outer, r.vw),
      screen: this.screens.screen(),
      forced: this.forced,
      coarse: r.coarse,
      display: r.display,
    };
  }
}

function browserViewportHost(): ViewportHost {
  const mq = (q: string) => matchMedia(q);
  const queries = {
    coarse: mq('(pointer: coarse)'),
    anyCoarse: mq('(any-pointer: coarse)'),
    hover: mq('(hover: hover)'),
    standalone: mq('(display-mode: standalone)'),
    full: mq('(display-mode: fullscreen)'),
    dark: mq('(prefers-color-scheme: dark)'),
  };
  const conn = (navigator as { connection?: EventTarget & { saveData?: boolean } }).connection;
  return {
    read() {
      const vv = window.visualViewport,
        vh = window.innerHeight,
        cs = getComputedStyle(document.documentElement),
        inset = (side: string) => parseFloat(cs.getPropertyValue('--safe-' + side)) || 0;
      return {
        vw: window.innerWidth,
        vh,
        outer: window.outerWidth,
        dpr: window.devicePixelRatio || 1,
        keyboard: vv ? Math.max(0, Math.round(vh - vv.height * vv.scale)) : 0,
        safeT: inset('top'),
        safeR: inset('right'),
        safeB: inset('bottom'),
        safeL: inset('left'),
        coarse: queries.coarse.matches,
        anyCoarse: queries.anyCoarse.matches,
        hover: queries.hover.matches,
        display:
          queries.full.matches || !!document.fullscreenElement
            ? 'fullscreen'
            : queries.standalone.matches
              ? 'standalone'
              : 'browser',
        dark: queries.dark.matches,
        saveData: !!conn?.saveData,
      };
    },
    listen(change) {
      const resize = () => change('resize'),
        other = () => change('other');
      let dpr = mq(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      const density = () => {
        dpr.removeEventListener('change', density);
        dpr = mq(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
        dpr.addEventListener('change', density);
        other();
      };
      dpr.addEventListener('change', density);
      window.addEventListener('resize', resize);
      window.visualViewport?.addEventListener('resize', other);
      document.addEventListener('fullscreenchange', other);
      conn?.addEventListener?.('change', other);
      for (const q of Object.values(queries)) q.addEventListener('change', other);
      return () => {
        dpr.removeEventListener('change', density);
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', other);
        document.removeEventListener('fullscreenchange', other);
        conn?.removeEventListener?.('change', other);
        for (const q of Object.values(queries)) q.removeEventListener('change', other);
      };
    },
    search: () => location.search,
  };
}

export function injectScreenComp(): Signal<ScreenComp> {
  const v = inject(ViewportState);
  return computed(() => {
    const { w, h } = v.size();
    return screenComp(w, h, v.anyCoarse());
  });
}
