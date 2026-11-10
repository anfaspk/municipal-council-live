import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { t } from '../../../core/i18n/i18n';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';
import { TILT_CSS } from '../../../domain/geo/projection';
import { FrameHandle, FrameLoop } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { restartAnimation } from '../../../shared/motion/restart-animation';
import { tween } from '../../../shared/motion/tween';
import { uid } from '../../../shared/ui/uid';
import { name, pct } from '../../../domain/format';
import { GEO } from '../../../domain/geo/geo.data';
import { Gov } from '../../../domain/stats/stats';
import { band, bandFill, turnout } from '../../../domain/stats/turnout';
import { CommandCenterState } from '../command-center.state';
import { guard } from '../../../core/log/log';
import { easeExpo } from '../../../shared/motion/easing';
import { MapSparks } from './oman-map-sparks';
import { MapWilayat } from './oman-map-wilayat';
import { buildMap, MapDom, MapNode } from './oman-map-build';
import { MapExtrusion } from './oman-map-motion';
import { MapLabels } from './oman-map-labels';
import { arrange, hoverWiring } from './oman-map-dom';
import * as M from './oman-map.model';

@Component({
  selector: '.map-stage',
  host: { class: 'mj-map mj-omap' },
  template:
    '<div class="om-hud" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="om-tilt"></div><div class="om-labels" aria-hidden="true"></div><div class="om-wlabels" aria-hidden="true"></div>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OmanMapComponent implements AfterViewInit {
  private readonly state = inject(CommandCenterState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly stats = inject(TurnoutStore);
  private readonly updates = inject(ScreenUpdates);
  private readonly id = uid('om');
  private govs: Gov[] = this.stats.govs().filter((g) => GEO.g[g.id]);
  private nodes: Record<string, MapNode> = {};
  private readonly motion = new MapExtrusion(
    this.frames,
    () => this.layout(),
    () => this.govs.map((g) => g.id),
  );
  private current: string | null = null;
  private pin: string | null = null;
  private order: Gov[] = [];
  private svg!: SVGElement;
  private layers: SVGElement[] = [];
  private labels!: HTMLElement;
  private gReg!: SVGElement;
  private built = false;
  private dead = false;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private visible = true;
  private readonly tags = new MapLabels(this.host);
  private readonly VB0 = M.mapViewBox0(GEO.w, GEO.h);
  private vb: M.MapViewBox = [...this.VB0];
  private zs = 1;
  private drillId: string | null = null;
  private zoomTw: FrameHandle | null = null;
  private wil!: MapWilayat;
  private pats!: MapDom['pats'];
  private sparks!: MapSparks;

  constructor() {
    effect(() => {
      const p = this.state.pinned();
      untracked(() => {
        if (this.built) {
          this.drill(p);
          this.setPinned(p);
        }
      });
    });
    effect(() => {
      const h = this.state.hot();
      untracked(() => {
        if (this.built) this.setHot(h, false);
      });
    });
    effect(() => {
      const n = this.state.wilHot();
      untracked(() => {
        if (this.built) this.setWilHot(n);
      });
    });
    effect(() => {
      const n = this.state.wilSel();
      untracked(() => {
        if (this.built) this.setWil(n);
      });
    });
    this.destroyRef.onDestroy(() => {
      this.dead = true;
      this.ro?.disconnect();
      this.io?.disconnect();
    });
  }

  ngAfterViewInit(): void {
    this.build();
    this.updates.map.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.type !== 'change' && e.type !== 'resume') return;
      this.update(this.stats.govs());
      if (e.type === 'change') this.pulse(e.id);
      const g = this.drillId && this.stats.gov(this.drillId);
      if (g && (e.type === 'resume' || e.id === this.drillId)) this.setWilData(M.wilPoints(g));
    });
  }

  private build(): void {
    const host = this.host,
      id = this.id,
      govs = this.govs;
    this.order = govs.slice().sort((a, b) => GEO.g[a.id]!.c[1] - GEO.g[b.id]!.c[1]);
    const tilt = host.querySelector<HTMLElement>('.om-tilt')!;
    this.labels = host.querySelector<HTMLElement>('.om-labels')!;
    const dom = buildMap(tilt, this.labels, id, this.VB0, this.order);
    ({
      svg: this.svg,
      layers: this.layers,
      pats: this.pats,
      gReg: this.gReg,
      nodes: this.nodes,
    } = dom);
    const svg = dom.svg;
    this.wil = new MapWilayat(
      dom.gWil,
      host.querySelector<HTMLElement>('.om-wlabels')!,
      () => this.ro,
    );
    this.order.forEach((g) => this.motion.add(g.id));
    govs.forEach((g) => guard('map ' + g.id, () => this.paint(g)));
    tilt.style.transform = TILT_CSS;
    this.tags.size = { width: host.offsetWidth, height: host.offsetHeight };
    this.ro = new ResizeObserver((entries) => this.resized(entries));
    this.ro.observe(host);
    this.order.forEach((g) => this.ro!.observe(this.nodes[g.id]!.lab));
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e!.isIntersecting;
    });
    this.io.observe(host);
    this.layout();
    hoverWiring(svg, {
      drilled: () => !!this.drillId,
      wilHot: () => this.wil.hot,
      wilEmit: (n) => this.wilEmit(n),
      setHot: (gid) => this.setHot(gid, true),
      pickWil: (n) => this.state.pickWil(n),
      select: (gid) => this.state.open(gid),
    });
    this.built = true;
    if (this.state.hot()) this.setHot(this.state.hot(), false);
    if (this.state.pinned()) this.setPinned(this.state.pinned());
    this.sparks = new MapSparks({
      frames: this.frames,
      targets: this.nodes,
      govs: () => this.govs,
      current: () => this.current,
      visible: () => this.visible,
      dead: () => this.dead,
    });
    this.sparks.activity();
  }

  private paint(g: Gov): void {
    const n = this.nodes[g.id];
    if (!n) return;
    const p = turnout(g),
      b = band(p),
      hot = g.id === this.current,
      pinned = g.id === this.pin;
    n.g.setAttribute('class', M.regionClass(b, hot, pinned));
    n.sides.forEach((s, i) => {
      s.style.fill = M.sideFill(b, i === M.SIDE_LAYERS - 1);
    });
    n.top.style.fill = bandFill(p);
    n.pat.style.fill = b === 'high' ? 'none' : 'url(#' + this.id + '-' + b + ')';
    n.lab.className = M.labelClass(b, hot, pinned, !!M.LABEL_OFFSET[g.id]);
    n.nm.textContent = g.ar;
    n.pc.textContent = pct(p);
    n.g.setAttribute('aria-label', name(g) + ', ' + pct(p) + ', ' + t(b));
  }

  private layout(): void {
    this.govs.forEach((g) => {
      const n = this.nodes[g.id];
      if (!n) return;
      const c = GEO.g[g.id]!.c,
        h =
          (M.extrusion(turnout(g)) * this.motion.ext[g.id]! + this.motion.hov[g.id]! * 10) /
          this.zs;
      const off = M.labelOffset(g.id);
      n.ax = c[0] + off[0];
      n.ay = c[1] + off[1] - h;
      if (h === n.h) return;
      if (n.h === undefined || h > 0.4 !== n.h > 0.4)
        n.sides.forEach((s) => {
          s.style.opacity = h > 0.4 ? '1' : '0';
        });
      n.h = h;
      n.sides.forEach((s, i) =>
        s.setAttribute('transform', 'translate(0 ' + ((-h * i) / M.SIDE_LAYERS).toFixed(2) + ')'),
      );
      const top = 'translate(0 ' + (-h).toFixed(2) + ')';
      for (const e of n.raised) e.setAttribute('transform', top);
      if (n.lead) n.lead.setAttribute('d', M.leadPath(c, h, n.ax, n.ay));
    });
    if (this.drillId && this.wil.length) this.wil.layout(this.nodes[this.drillId]?.h || 0, this.zs);
    this.placeLabels();
  }

  private resized(entries: ResizeObserverEntry[]): void {
    if (this.tags.measure(entries) && this.drillId) {
      this.vb = this.vbFor(this.drillId);
      this.applyVB();
      this.layout();
    } else this.placeLabels();
  }
  private placeLabels(): void {
    const dh = this.nodes[this.drillId!]?.h || 0;
    this.tags.place(this.vb, this.govs, this.nodes, this.wil, dh);
  }

  private vbFor(gid: string | null): M.MapViewBox {
    const g = gid ? GEO.g[gid] : undefined;
    return M.drillViewBox(
      this.VB0,
      g ? g.b : null,
      (GEO.wilPt[gid!] || []).map((w) => w.c),
    );
  }
  private applyVB(): void {
    const vb = this.vb.map((x) => x.toFixed(2)).join(' ');
    this.layers.forEach((l) => l.setAttribute('viewBox', vb));
    this.zs = Math.max(1, M.zoomOf(this.vb, this.VB0, this.tags.size));
    const k = (1 / this.zs).toFixed(4);
    this.pats[0].setAttribute('patternTransform', 'scale(' + k + ') rotate(45)');
    this.pats[1].setAttribute('patternTransform', 'scale(' + k + ')');
    this.pats[2].setAttribute('patternTransform', 'scale(' + k + ')');
  }
  private wilEmit(n: string | null): void {
    if (n === this.wil.hot) return;
    this.setWilHot(n);
    this.state.wilHot.set(n);
  }

  private drill(gid: string | null): void {
    const gov = gid ? this.stats.gov(gid) : null;
    if (gov) this.setWilData(M.wilPoints(gov));
    if (gid === this.drillId || (gid && !this.nodes[gid])) return;
    const nodes = this.nodes,
      host = this.host,
      from = [...this.vb] as const,
      to = this.vbFor(gid),
      was = this.drillId;
    this.drillId = gid;
    if (this.current) {
      nodes[this.current]!.g.classList.remove('is-hot');
      nodes[this.current]!.lab.classList.remove('is-hot');
      this.motion.lift(this.current, 0);
      this.current = null;
    }
    this.svg.classList.remove('has-hot');
    this.labels.classList.remove('has-hot');
    if (gid) {
      host.classList.add('is-drill');
      this.raise(gid);
    }
    this.layers.forEach((l) => l.classList.toggle('is-drill', !!gid));
    this.labels.classList.toggle('is-drill', !!gid);
    host.classList.remove('wil-on');
    this.wil.build(gid);
    this.motion.flatten(gid);
    if (this.zoomTw) this.zoomTw.stop();
    this.zoomTw = tween(
      this.frames,
      gid && was ? 900 : 1100,
      (t) => {
        M.lerpViewBox(this.vb, from, to, t);
        this.applyVB();
        this.layout();
      },
      () => {
        if (this.drillId) host.classList.add('wil-on');
        else {
          host.classList.remove('is-drill');
          this.restack();
        }
        this.layout();
      },
      easeExpo,
    );
    if (gid)
      setTimeout(
        () => {
          if (this.drillId === gid) {
            host.classList.add('wil-on');
            this.placeLabels();
          }
        },
        reducedMotion() ? 0 : 520,
      );
  }
  private setWilData(rows: M.WilPoint[]): void {
    this.wil.setData(rows);
    this.placeLabels();
  }
  private setWilHot(n: string | null): void {
    this.wil.hot = n || null;
    this.wil.paint();
  }
  private setWil(n: string | null): void {
    this.wil.sel = n || null;
    this.wil.paint();
    this.placeLabels();
  }

  private raise(gid: string): void {
    const g = this.nodes[gid]!.g;
    arrange(this.gReg, [...Array.from(this.gReg.children).filter((n) => n !== g), g]);
  }
  private restack(): void {
    arrange(
      this.gReg,
      this.order.map((g) => this.nodes[g.id]!.g),
    );
  }

  private setHot(gid: string | null, doEmit: boolean): void {
    if (this.current === gid || (gid && !this.nodes[gid])) return;
    const nodes = this.nodes;
    if (this.current) {
      nodes[this.current]!.g.classList.remove('is-hot');
      nodes[this.current]!.lab.classList.remove('is-hot');
      this.motion.lift(this.current, 0);
    }
    this.current = gid;
    this.svg.classList.toggle('has-hot', !!gid);
    this.labels.classList.toggle('has-hot', !!gid);
    if (gid) {
      nodes[gid]!.g.classList.add('is-hot');
      nodes[gid]!.lab.classList.add('is-hot');
      this.motion.lift(gid, 1);
      this.raise(gid);
    } else this.restack();
    this.motion.flatten(gid);
    if (doEmit) this.state.setHot(gid);
  }
  private setPinned(gid: string | null): void {
    this.pin = gid;
    this.govs.forEach((g) => guard('map ' + g.id, () => this.paint(g)));
  }
  private update(g: Gov[]): void {
    this.govs = g.filter((x) => GEO.g[x.id]);
    this.govs.forEach((x) => guard('map ' + x.id, () => this.paint(x)));
    this.layout();
  }
  private pulse(gid: string): void {
    const n = this.nodes[gid];
    if (!n || reducedMotion()) return;
    this.sparks.burst(gid);
    restartAnimation(n.top, 'flash');
    restartAnimation(n.lab, 'flash');
  }
}
