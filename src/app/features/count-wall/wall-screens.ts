import { inject } from '@angular/core';
import { ScreenState } from '../../core/screen/screen.state';
import { ct } from '../../core/i18n/count-strings';
import { CEvent, CGov, CWil } from '../../domain/count/count';
import { ListPager } from '../../shared/motion/list-pager';
import { warmPortraits } from '../../shared/ui/portrait';
import { govWalk, natWalk } from './count-wall.model';
import { DrawFocus } from './draw/draw-focus';
import { WilayatPanel } from './panels/wilayat-panel.component';
import { STATUS_LABEL } from './stage/stage-markup';
import { Face, Origin, WallFaces } from './wall-faces';
import { cssEscape, LiveHost, RACE_SCROLL, WallLive } from './wall-live';
import { WallPlayback } from './wall-playback';
export interface ScreensHost extends Omit<LiveHost, 'manualHold' | 'selectWil' | 'backToList'> {
  play: WallPlayback;
  wilPanel(face: Face): WilayatPanel | undefined;
  detectChanges(): void;
  say(text: string, polite: boolean): void;
  sec(): number;
}
export class WallScreens {
  readonly live: WallLive;
  private readonly drawBack = inject(DrawFocus);
  private readonly screen = inject(ScreenState);
  private link: string | null = null;
  private linkWil: number | null = null;
  private readonly pager: ListPager;
  constructor(private readonly h: ScreensHost) {
    this.pager = new ListPager(h.frames, h.play.clock, 'wall');
    this.live = new WallLive({
      ...h,
      manualHold: () => h.play.manualHold(),
      selectWil: (w, user, origin) => this.selectWil(w, user, origin),
      backToList: (user) => this.backToList(user),
    });
  }
  fromDraw(): string | null {
    const b = this.drawBack.takeBack();
    this.h.state.pendWil = b?.n ?? null;
    return b?.gid ?? null;
  }
  fromLink(): string | null {
    const b = this.screen.takeBootWil();
    this.linkWil = b?.wil ?? null;
    return (this.link = b?.gov ?? null);
  }
  regionOf(gid?: string | null): string {
    const g = this.link;
    if (g && this.h.feed.gov(g)) this.link = null;
    return gid || g || this.screen.region();
  }
  natHot(id: string | null): void {
    this.h.stage().natHot(id);
    this.h.faces
      .current()
      ?.querySelectorAll('.cx-gr')
      .forEach((b) => b.classList.toggle('hot', b.getAttribute('data-g') === id));
  }
  private candIds(w: CWil): string {
    return w.cands
      .map((c) => c.id)
      .sort()
      .join(' ');
  }
  wilLive(gv: CGov, w: CWil): void {
    const f = this.h.faces.current(),
      pin = f && f.querySelector('.cx-wil');
    if (!f || !pin || pin.getAttribute('data-w') !== w.n) return;
    if (
      pin.getAttribute('data-st') !== (w.st === 'await' ? 'await' : 'on') ||
      pin.getAttribute('data-c') !== this.candIds(w)
    ) {
      const top = f.querySelector(RACE_SCROLL)?.scrollTop ?? 0;
      this.h.faces.render(this.h.faces.currentIndex(), this.h.faces.view('wilayat', gv, w));
      f.classList.add('now');
      this.live.wireWil(f);
      const sc2 = f.querySelector(RACE_SCROLL);
      if (sc2) sc2.scrollTop = top;
      return;
    }
    const panel = this.h.wilPanel(f);
    panel?.updateHead(gv, w);
    panel?.updateRace(w);
    this.h.detectChanges();
  }
  goNat(instant?: boolean): void {
    this.pager.stop();
    Object.assign(this.h.state, { mode: 'nat', gov: null, wil: null, natHot: null });
    this.h.feed.focus(null);
    const stage = this.h.stage();
    stage.prepareNational(instant);
    this.live.wireNat(this.h.faces.swap(this.h.faces.view('national'), null, instant));
    stage.showNational(instant);
  }
  goGov(id: string, instant?: boolean): void {
    const governorate = this.h.feed.gov(id)!,
      state = this.h.state;
    this.pager.stop();
    Object.assign(state, { mode: 'gov', gov: id, wil: null });
    this.h.feed.focus(id);
    const stage = this.h.stage();
    stage.prepareGovernorate(id, instant);
    const face = this.h.faces.swap(this.h.faces.view('governorate', governorate), null, instant);
    this.live.wireGov(face, governorate);
    stage.showGovernorate(governorate, instant, () => {
      if (state.pendWil || this.linkWil !== null) {
        const wilayat =
          this.linkWil !== null
            ? this.h.feed.wilById(this.linkWil)
            : this.h.feed.wil(id, state.pendWil!);
        state.pendWil = null;
        this.linkWil = null;
        if (wilayat) this.selectWil(wilayat, true);
      }
    });
  }
  selectWil(w: CWil, user?: boolean, origin?: Origin): void {
    const state = this.h.state;
    if (state.mode !== 'gov' || w.gid !== state.gov) return;
    const gv = this.h.feed.gov(state.gov)!,
      face = this.h.faces.current()!,
      same = state.wil === w.n;
    if (user) this.h.play.manualHold();
    if (!this.h.stage().landed) {
      state.pendWil = w.n;
      return;
    }
    if (same) return;
    state.wil = w.n;
    this.h.stage().setSel(w.n);
    const view = this.h.faces.view('wilayat', gv, w);
    this.live.wireWil(this.h.faces.swap(view, origin || WallFaces.origin(face)));
    this.h.stage().showWilayat(w);
    this.page(user);
    this.h.say(w.n + '، ' + ct(STATUS_LABEL[w.st]), !!user);
  }
  backToList(user?: boolean): void {
    const state = this.h.state;
    if (state.mode !== 'gov' || !state.wil) return;
    const gv = this.h.feed.gov(state.gov!)!;
    this.pager.stop();
    if (user) this.h.play.manualHold();
    const wn = cssEscape(state.wil);
    state.wil = null;
    this.h.stage().setSel(null);
    const f = this.h.faces.swap(
      this.h.faces.view('governorate', gv),
      WallFaces.origin(this.h.faces.current()!),
    );
    this.live.wireGov(f, gv);
    f.querySelector('.cx-w[data-w="' + wn + '"],.cxr-c[data-w="' + wn + '"]')?.classList.add('was');
    this.h.stage().returnToGovernorate();
  }
  planNat(): void {
    const ids = this.h.feed.govs.map((g) => g.id),
      walk = natWalk(ids.length, this.h.sec()),
      clock = this.h.play.clock;
    const cycle = (k: number) => {
      const s = walk.start(k);
      ids.forEach((id, i) => clock.at(s + i * walk.step, () => this.natHot(id)));
      clock.at(s + walk.off, () => this.natHot(null));
      clock.at(s + walk.length - 40, () => cycle(k + 1));
    };
    cycle(0);
  }
  planGov(gv: CGov): void {
    const walk = govWalk(gv.wil.length, this.h.sec()),
      clock = this.h.play.clock;
    const cycle = (k: number, s: number) => {
      if (k > 0) clock.at(s, () => this.h.stage().relock());
      clock.at(s, () => this.warm(gv.wil[0]));
      gv.wil.forEach((w, i) => {
        clock.at(s + walk.hold + i * walk.per, () => {
          const cur = this.h.feed.wilById(w.id);
          if (cur) this.selectWil(cur, false);
          this.warm(gv.wil[i + 1]);
        });
      });
      clock.at(s + walk.back, () => this.backToList(false));
      const next = clock.at(s + walk.length - 40, () => cycle(k + 1, next.at + 40));
    };
    cycle(0, walk.start(0));
  }
  private warm(w: CWil | undefined): void {
    const cur = w && this.h.feed.wilById(w.id);
    if (cur) warmPortraits(cur.cands.map((c) => c.photo));
  }
  private page(user?: boolean): void {
    this.pager.stop();
    if (user) return;
    const clock = this.h.play.clock;
    this.pager.run(() => this.h.faces.current()?.querySelector<HTMLElement>(RACE_SCROLL) ?? null, {
      time: this.h.sec() * 1000,
      travel: !this.h.still(),
      wait: (ms) => clock.shift(clock.now(), ms),
    });
  }
  answer(e: CEvent): void {
    const state = this.h.state;
    if (e.listed) {
      if (state.mode === 'gov' && state.gov === e.gov.id && state.wil === e.w.n)
        this.wilLive(e.gov, e.w);
      return;
    }
    if (state.mode === 'nat') {
      this.live.natNums(e.gov.id);
      this.h.stage().natLive(e.gov.id);
      return;
    }
    if (state.mode !== 'gov' || state.gov !== e.gov.id) return;
    this.h.stage().updNode(e.w);
    this.live.govLive(e.gov, e.w);
    if (state.wil === e.w.n) this.wilLive(e.gov, e.w);
  }
}
