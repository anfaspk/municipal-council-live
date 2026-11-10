import { signal } from '@angular/core';
import { ct } from '../../core/i18n/count-strings';
import { CountStore } from '../../data/count.store';
import { CEvent, CGov, countGov, CWil } from '../../domain/count/count';
import { fmt, pct } from '../../domain/format';
import { FrameLoop } from '../../shared/motion/frame-loop.service';
import { restartAnimation } from '../../shared/motion/restart-animation';
import { countUp } from '../../shared/motion/tween';
import { CountWallState } from './count-wall-state';
import { CountStage } from './stage/count-stage.component';
import { f1 } from './stage/stage-camera';
import { Face, Origin, WallFaces } from './wall-faces';

export const RACE_SCROLL = '.cx-race .rs-grid';
export const cssEscape = (s: string): string => (window.CSS && CSS.escape ? CSS.escape(s) : s);

export interface LiveHost {
  feed: CountStore;
  frames: FrameLoop;
  faces: WallFaces;
  state: CountWallState;
  stage(): CountStage;
  still(): boolean;
  instant(): boolean;
  govPanel(face: Face, w: CWil): void;
  detectChanges(): void;
  manualHold(): void;
  goGovUser(id: string): void;
  selectWil(w: CWil, user: boolean, origin?: Origin): void;
  backToList(user: boolean): void;
}

export class WallLive {
  constructor(private readonly h: LiveHost) {}

  countUps(face: Element): void {
    if (this.h.instant()) return;
    face
      .querySelectorAll('[data-cu]')
      .forEach((e) =>
        countUp(this.h.frames, e, +e.getAttribute('data-cu')!, { dur: 1500, scope: 'wall' }),
      );
    face.querySelectorAll('[data-pct]').forEach((e) =>
      countUp(this.h.frames, e, +e.getAttribute('data-pct')!, {
        dur: 1700,
        format: (v) => pct(v),
        scope: 'wall',
      }),
    );
  }
  wireNat(face: Face): void {
    face.querySelectorAll('.cx-gr').forEach((b) => {
      const id = b.getAttribute('data-g')!;
      b.addEventListener('click', () => this.h.goGovUser(id));
      b.addEventListener('pointerenter', () => this.h.stage().natHover(id, true));
      b.addEventListener('pointerleave', () => this.h.stage().natHover(id, false));
    });
    this.countUps(face);
  }
  wireGov(face: Face, gv: CGov): void {
    face.querySelectorAll('.cx-w,.cxr-c').forEach((b) => {
      b.addEventListener('click', () => {
        const w = this.h.feed.wil(gv.id, b.getAttribute('data-w')!);
        if (w) this.h.selectWil(w, true, WallFaces.origin(face, b));
      });
      b.addEventListener('pointerenter', () => {
        this.h.stage().hoverWilayat(b.getAttribute('data-w'), true);
      });
      b.addEventListener('pointerleave', () => {
        this.h.stage().hoverWilayat(b.getAttribute('data-w'), false);
      });
    });
    this.countUps(face);
  }
  wireWil(face: Face): void {
    const bk = face.querySelector('.cx-bk');
    if (bk) bk.addEventListener('click', () => this.h.backToList(true));
    face.querySelectorAll('.cxr-tab').forEach((b) =>
      b.addEventListener('click', () => {
        this.h.manualHold();
        this.resTab(face, b.getAttribute('data-t')!);
      }),
    );
    if (this.h.state.res) this.countUps(face);
    const cl = face.querySelector(RACE_SCROLL);
    if (cl)
      ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
        cl.addEventListener(ev, () => this.h.manualHold(), { passive: true }),
      );
  }
  resTab(face: Face, t: string): void {
    const tl = face.querySelector('.cxr-tabs');
    if (!tl) return;
    tl.setAttribute('data-t', t);
    tl.querySelectorAll<HTMLElement>('.cxr-tab').forEach((b) => {
      const on = b.getAttribute('data-t') === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    face.querySelectorAll<HTMLElement>('.cxr-pane').forEach((p) => {
      const on = p.getAttribute('data-t') === t;
      p.hidden = !on;
      if (on) {
        restartAnimation(p, 'in', !this.h.still());
        if (t === 'win') this.countUps(p);
      }
    });
  }
  natNums(gid?: string): void {
    const f = this.h.faces.current(),
      { feed, state } = this.h;
    if (!f || state.mode !== 'nat' || !f.querySelector('.cx-natp')) return;
    const n = feed.national();
    const set = (s: string, v: string) => {
      const e = f.querySelector(s);
      if (e) e.textContent = v;
    };
    set('.cx-xc', fmt(n.counted));
    set('.cx-xl', fmt(n.cast - n.counted));
    set('.cx-xp', pct(n.p));
    set('.cx-xpp', pct(n.p));
    set('.cx-nd', ct('cxDeclN', { d: n.decl, t: n.wil }));
    (gid ? [gid] : feed.govs.map((g) => g.id)).forEach((id) => {
      const row = f.querySelector<HTMLElement>('.cx-gr[data-g="' + id + '"]'),
        gv = feed.gov(id);
      if (!row || !gv) return;
      const s = countGov(gv);
      row.className =
        'cx-w cx-gr ' +
        (s.decl === s.n ? 'decl' : s.counted ? 'count' : 'await') +
        (state.natHot === id ? ' hot' : '') +
        (gid ? ' upd' : '');
      row.querySelector('.pc')!.textContent = pct(s.p);
      row.querySelector<HTMLElement>('.pg i')!.style.width = f1(s.p) + '%';
      row.querySelector('.n.c')!.textContent = fmt(s.counted);
      row.querySelector('.n.l')!.textContent = fmt(s.cast - s.counted);
      row.querySelector('.dc')!.textContent = ct('cDeclOf', { d: s.decl, t: s.n });
      if (gid) setTimeout(() => row.classList.remove('upd'), 1200);
    });
  }
  govLive(gv: CGov, w: CWil): void {
    const f = this.h.faces.current();
    if (!f || !f.querySelector('.cx-gov')) return;
    const row = f.querySelector<HTMLElement>('.cx-w[data-w="' + cssEscape(w.n) + '"]');
    if (row) {
      const p = w.cast ? (w.counted / w.cast) * 100 : 0;
      row.className = 'cx-w ' + w.st + ' upd' + (row.classList.contains('was') ? ' was' : '');
      this.h.govPanel(f, w);
      this.h.detectChanges();
      row.querySelector('.pc')!.textContent = pct(p);
      row.querySelector<HTMLElement>('.pg i')!.style.width = f1(p) + '%';
      row.querySelector('.n.c')!.textContent = fmt(w.counted);
      row.querySelector('.n.l')!.textContent = fmt(w.cast - w.counted);
      setTimeout(() => row.classList.remove('upd'), 1200);
    }
    const s = countGov(gv),
      set = (q2: string, v: string) => {
        const e = f.querySelector(q2);
        if (e) e.textContent = v;
      };
    set('.cx-gc', fmt(s.counted));
    set('.cx-gl', fmt(s.cast - s.counted));
    set('.cx-gp', pct(s.p));
  }
}

export class WallBanners {
  readonly list = signal<{ id: number; event: CEvent; out: boolean }[]>([]);
  private n = 0;
  private last = 0;
  constructor(private readonly h: { detectChanges(): void; destroyed(): boolean }) {}

  show(e: CEvent): boolean {
    const now = Date.now();
    if (now - this.last < 7000) return false;
    this.last = now;
    const id = ++this.n;
    this.list.update((bs) => [...bs, { id, event: e, out: false }]);
    this.h.detectChanges();
    setTimeout(() => {
      if (this.h.destroyed()) return;
      this.list.update((bs) => bs.map((b) => (b.id === id ? { ...b, out: true } : b)));
      setTimeout(() => {
        if (!this.h.destroyed()) this.list.update((bs) => bs.filter((b) => b.id !== id));
      }, 900);
    }, 5200);
    return true;
  }
}
