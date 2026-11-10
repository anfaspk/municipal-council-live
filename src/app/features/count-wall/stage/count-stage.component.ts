import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CountStore } from '../../../data/count.store';
import { FrameHandle, FrameLoop } from '../../../shared/motion/frame-loop.service';
import { flushStyle, restartAnimation } from '../../../shared/motion/restart-animation';
import { uid } from '../../../shared/ui/uid';
import { IconComponent } from '../../../shared/ui/icon.component';
import { fragment } from '../../../shared/ui/markup';
import { ct } from '../../../core/i18n/count-strings';
import { CGov, CWil } from '../../../domain/count/count';
import { GEO } from '../../../domain/geo/geo.data';
import { cameraTransform, FlatCamera, projectFlat, Size } from '../../../domain/geo/projection';
import { Box, boundsOf, pathRings, Pt } from '../../../domain/geo/shapes';
import { CountWallState } from '../count-wall-state';
import * as C from './stage-camera';
import { CountStageActions, findEls, StageContext, StageEls } from './stage-context';
import { GovernorateOverlay } from './stage-governorate';
import { NationalOverlay } from './stage-national';
import { stageMarkup } from './stage-markup';

export type { CountStageActions } from './stage-context';

const NO_CAM = { k: 1, tx: 0, ty: 0 };

@Component({
  selector: 'div.cx-stage',
  template: `<button
    type="button"
    class="mj-btn cx-back"
    [title]="text('cxOmanL') + ' (Esc)'"
    (click)="back()"
  >
    <svg mjIcon="prev"></svg><span>{{ text('cxOman') }}</span>
  </button>`,
  imports: [IconComponent],
  host: { dir: 'ltr' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountStage implements AfterViewInit {
  protected readonly text = ct;
  protected back(): void {
    this.actions().backToNational();
  }
  readonly context = input.required<CountWallState>();
  readonly actions = input.required<CountStageActions>();
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly feed = inject(CountStore);
  private readonly frames = inject(FrameLoop);
  private relayout: FrameHandle | null = null;
  private readonly els = {} as StageEls;
  private cam: FlatCamera | null = null;
  private transform = NO_CAM;
  private flight: FrameHandle | null = null;
  private readonly rings: Record<string, Pt[][]> = {};
  private readonly bounds: Record<string, Box> = {};
  private readonly x: StageContext = {
    els: this.els,
    feed: this.feed,
    frames: this.frames,
    state: () => this.context(),
    actions: () => this.actions(),
    still: () => this.actions().still(),
    proj: (p) => projectFlat(p, this.transform),
    size: () => this.size(),
    box: (id) => this.boxOf(id),
    gov: (id) => this.feed.gov(id)!,
    relayout: () => this.relayoutLabels(),
  };
  private readonly gov = new GovernorateOverlay(this.x);
  private readonly nat = new NationalOverlay(this.x);
  private get state(): CountWallState {
    return this.context();
  }
  private still(): boolean {
    return this.actions().still();
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }
  ngAfterViewInit(): void {
    const u = uid('cx');
    this.host.prepend(fragment(stageMarkup(u, (id) => this.feed.gov(id)?.ar ?? null)));
    this.host.appendChild(this.host.querySelector('.cx-legend')!);
    this.initStage();
  }
  stop(): void {
    this.flight?.stop();
    this.flight = null;
    this.relayout?.stop();
    this.relayout = null;
  }
  private ringsOf(id: string): Pt[][] {
    return (this.rings[id] ??= pathRings(id === '__ol' ? GEO.outline : (GEO.g[id]?.d ?? '')));
  }
  private boxOf(id: string): Box {
    if (this.bounds[id]) return this.bounds[id];
    const pts = this.ringsOf(id).flat();
    (this.feed.gov(id)?.wil ?? []).forEach((w) => {
      if (w.pt) pts.push(w.pt);
    });
    return (this.bounds[id] = boundsOf(pts));
  }
  private size(): Size {
    return { width: this.els.el.offsetWidth || 800, height: this.els.el.offsetHeight || 800 };
  }
  private viewGov(id: string): FlatCamera {
    return C.viewGov(this.boxOf(id), this.size());
  }
  private viewWil(w: CWil): FlatCamera {
    const size = this.size(),
      fb = this.actions().face()?.getBoundingClientRect() ?? { left: 0, right: 0 },
      sb = this.els.el.getBoundingClientRect(),
      z = size.width / (sb.width || 1),
      span = C.freeSpan([fb.left, fb.right], [sb.left, sb.right], z, size.width),
      free = { width: span[1] - span[0], height: size.height };
    return C.inset(C.viewWil(C.viewGov(this.boxOf(this.state.gov!), free), w.pt), size, span);
  }
  private screenPath(id: string): string {
    return C.screenPath(this.ringsOf(id), this.transform);
  }
  private applyCam(c: FlatCamera): void {
    const els = this.els,
      state = this.state;
    this.cam = c;
    this.transform = cameraTransform(c, this.size());
    els.cam.setAttribute('transform', C.camMatrix(this.transform));
    const id = state.mode === 'nat' ? '__ol' : state.gov;
    if (!id) return this.placeOverlay();
    const d = this.screenPath(id);
    [els.edge, els.edgeG, els.clipP, els.comet, els.comet2].forEach((e) => e.setAttribute('d', d));
    const rb = C.screenBox(this.ringsOf(id), this.transform);
    if (state.mode === 'nat') {
      els.hot.setAttribute('d', state.natHot ? this.screenPath(state.natHot) : '');
      const bw = Math.max(120, (rb[2] - rb[0]) * 0.42);
      els.sweep.setAttribute('x', C.f1(rb[0] - bw));
      els.sweep.setAttribute('width', C.f1(bw));
      els.sweep.setAttribute('y', C.f1(rb[1] - 10));
      els.sweep.setAttribute('height', C.f1(rb[3] - rb[1] + 20));
      els.sweep.style.setProperty('--tr', C.f1(rb[2] - rb[0] + bw) + 'px');
    } else {
      const band = Math.max(60, (rb[3] - rb[1]) * 0.28);
      els.scan.setAttribute('x', C.f1(rb[0] - 4));
      els.scan.setAttribute('width', C.f1(rb[2] - rb[0] + 8));
      els.scan.setAttribute('y', C.f1(rb[1] - band));
      els.scan.setAttribute('height', C.f1(band));
      els.scan.style.setProperty('--tr', C.f1(rb[3] - rb[1] + band) + 'px');
    }
    this.placeOverlay();
  }
  private flyTo(c: FlatCamera, dur: number | null, done?: () => void): void {
    if (this.flight) {
      this.flight.stop();
      this.flight = null;
      this.state.onFly?.(null);
    }
    if (!this.cam || this.still() || this.actions().settled() || dur === 0) {
      this.applyCam(c);
      if (done) done();
      return;
    }
    const ip = C.interpZoom([this.cam.cx, this.cam.cy, this.cam.s], [c.cx, c.cy, c.s]);
    const duration = dur || C.flightMs(ip.distance),
      t0 = performance.now();
    this.els.el.classList.add('flying');
    this.state.onFly?.(duration);
    const step = (now: number) => {
      const t = C.clamp((now - t0) / duration, 0, 1),
        v = ip.fn(C.easeIO(t));
      this.applyCam({ cx: v[0], cy: v[1], s: v[2] });
      if (t < 1) return;
      me.stop();
      this.flight = null;
      this.els.el.classList.remove('flying');
      this.state.onFly?.(null);
      if (done) done();
    };
    step(t0);
    const me = (this.flight = this.frames.add({ write: step }, 'wall'));
  }

  private initStage(): void {
    const el = this.host,
      state = this.state;
    findEls(el, this.els);
    el.querySelectorAll('.cx-g').forEach((p) => {
      const id = p.getAttribute('data-g')!;
      p.addEventListener('pointerenter', () => {
        if (state.mode === 'nat') this.nat.hover(id, true);
      });
      p.addEventListener('pointerleave', () => {
        if (state.mode === 'nat') this.nat.hover(id, false);
      });
      p.addEventListener('click', () => {
        if (state.mode === 'nat') {
          this.actions().goGov(id);
          return;
        }
        if (state.mode !== 'gov') return;
        if (id === state.gov) {
          if (state.wil) this.actions().backToList(true);
          return;
        }
        this.actions().goGov(id);
      });
    });
  }
  private clearOverlay(instant?: boolean): void {
    const els = this.els;
    const old = [els.nodes, els.labels, els.streams, els.hub, els.natg].flatMap((e) =>
      Array.from(e.children),
    );
    this.gov.clear();
    this.nat.clear();
    els.el.classList.remove('landed', 'has-sel');
    els.lock.classList.remove('go');
    if (instant || this.still()) {
      old.forEach((e) => e.remove());
      return;
    }
    old.forEach((e) => e.classList.add('out'));
    setTimeout(() => {
      old.forEach((e) => e.remove());
    }, 420);
  }
  private land(instant: boolean | undefined, build: () => void): void {
    this.clearOverlay(true);
    build();
    const el = this.els.el;
    el.classList.toggle('now', !!(instant || this.still()));
    flushStyle(el);
    el.classList.add('landed');
  }
  private placeOverlay(): void {
    if (this.state.mode === 'nat') this.nat.place();
    else this.gov.place();
  }
  private relayoutLabels(): void {
    if (this.relayout) return;
    this.relayout = this.frames.once(
      {
        read: () => {
          if (this.state.mode === 'nat') this.nat.layout();
          else if (this.state.mode === 'gov' && this.gov.length) this.gov.layout();
        },
        write: () => {
          this.relayout = null;
          if (this.state.mode === 'nat') this.nat.place();
          else if (this.state.mode === 'gov' && this.gov.hasHub) this.gov.place();
        },
      },
      'wall',
    );
  }

  natPing(id: string, big?: boolean): void {
    this.nat.ping(id, big);
  }
  natHover(id: string, on: boolean): void {
    this.nat.hover(id, on);
  }
  natLive(id: string): void {
    this.nat.live(id);
  }
  natHot(id: string | null): void {
    const state = this.state,
      els = this.els;
    state.natHot = id;
    if (!els.el) return;
    this.nat.hot(id);
    els.hot.setAttribute('d', id && state.mode === 'nat' ? this.screenPath(id) : '');
    restartAnimation(els.hot, 'trace', !!id && !this.still());
    els.el.classList.toggle('has-hot', !!id);
    if (id) this.nat.ping(id, true);
  }
  setSel(wn: string | null): void {
    this.gov.setSel(wn);
  }
  updNode(w: CWil): void {
    this.gov.update(w);
  }
  hoverWilayat(name: string | null, on: boolean): void {
    this.gov.hover(name, on);
  }
  prepareNational(instant?: boolean): void {
    const els = this.els;
    this.clearOverlay(instant);
    els.el.classList.remove('m-gov', 'nat-on');
    els.el.classList.add('m-nat');
    els.el.querySelectorAll('.cx-g.on').forEach((path) => path.classList.remove('on'));
    [els.edge, els.edgeG, els.clipP, els.comet].forEach((path) => path.setAttribute('d', ''));
    els.hint.textContent = ct('cxMapHint');
  }
  showNational(instant?: boolean): void {
    this.els.hot.setAttribute('d', '');
    this.flyTo(C.viewNat(GEO.w, GEO.h, this.size()), null, () => {
      if (this.state.mode !== 'nat') return;
      this.els.el.classList.add('nat-on');
      this.land(instant, () => {
        this.nat.build(this.feed.govs.map((g) => g.id));
        this.nat.layout();
        this.nat.place();
      });
      if (this.state.natHot) this.actions().highlight(this.state.natHot);
      restartAnimation(this.els.edge, 'trace', !instant && !this.still());
    });
  }
  prepareGovernorate(id: string, instant?: boolean): void {
    const els = this.els;
    this.clearOverlay(instant);
    els.el.classList.remove('m-nat', 'nat-on', 'has-hot');
    els.el.classList.add('m-gov');
    els.el.querySelectorAll('.cx-g.hot,.cx-g.hov').forEach((p) => p.classList.remove('hot', 'hov'));
    els.hot.setAttribute('d', '');
    els.el
      .querySelectorAll('.cx-g')
      .forEach((path) => path.classList.toggle('on', path.getAttribute('data-g') === id));
    els.hint.textContent = ct('cxWilHint');
  }
  showGovernorate(governorate: CGov, instant: boolean | undefined, landed: () => void): void {
    this.flyTo(this.viewGov(governorate.id), null, () => {
      if (this.state.gov !== governorate.id) return;
      this.land(instant, () => {
        this.gov.build(governorate);
        this.gov.layout();
        this.gov.place();
      });
      this.gov.lockOn(governorate);
      restartAnimation(this.els.edge, 'trace', !instant && !this.still());
      landed();
    });
  }
  relock(): void {
    if (this.state.mode !== 'gov' || this.state.wil || !this.gov.length || this.still()) return;
    restartAnimation(this.els.el, 'landed');
    restartAnimation(this.els.edge, 'trace');
    this.gov.lockOn(this.feed.gov(this.state.gov!)!);
  }
  get landed(): boolean {
    return this.els.el.classList.contains('landed');
  }
  showWilayat(wilayat: CWil): void {
    this.flyTo(this.viewWil(wilayat), 1300);
  }
  returnToGovernorate(): void {
    this.flyTo(this.viewGov(this.state.gov!), 1100);
  }
  fontsReady(): void {
    if (this.state.mode === 'gov' && this.gov.length) {
      this.gov.layout();
      this.placeOverlay();
    }
  }
  resize(): void {
    const state = this.state;
    if (state.mode === 'nat') {
      this.applyCam(C.viewNat(GEO.w, GEO.h, this.size()));
      this.nat.layout();
      this.nat.place();
    } else if (state.mode === 'gov') {
      const w = state.wil ? this.feed.wil(state.gov!, state.wil) : null;
      this.applyCam(w ? this.viewWil(w) : this.viewGov(state.gov!));
      this.gov.layout();
      this.placeOverlay();
      this.gov.lockOn(this.feed.gov(state.gov!)!);
    }
  }
}
