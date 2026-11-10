import { CountStage, CountStageActions } from './stage/count-stage.component';
import { CHROME0, CountWallState } from './count-wall-state';
import { CountWallShell, CountShellView, CountShellAction } from './count-wall-shell.component';
import { NationalPanel } from './panels/national-panel.component';
import { GovernoratePanel } from './panels/governorate-panel.component';
import { WilayatPanel } from './panels/wilayat-panel.component';
import { CountBanner } from './panels/count-banner.component';
import {
  AfterViewInit,
  ChangeDetectorRef,
  signal,
  viewChild,
  viewChildren,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CountStore } from '../../data/count.store';
import { ScreenState } from '../../core/screen/screen.state';
import { EventPacer, PacedEvent } from './event-pacer';
import { FRAME_SCOPE, FrameLoop } from '../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../shared/motion/reduced-motion';
import { ct } from '../../core/i18n/count-strings';
import { CEvent, CGov, SHOW_WINNERS } from '../../domain/count/count';
import { guard } from '../../core/log/log';
import { WallFaces } from './wall-faces';
import { WallBanners } from './wall-live';
import { WallPlayback } from './wall-playback';
import { WallScreens } from './wall-screens';
import { wallAction, wallKey } from './wall-input';
import { handOffToWinners } from './wall-handoff';

@Component({
  selector: 'div.ct-root',
  providers: [{ provide: FRAME_SCOPE, useValue: 'wall' }],
  templateUrl: './count-wall.component.html',
  imports: [CountWallShell, CountStage, NationalPanel, GovernoratePanel, WilayatPanel, CountBanner],
  styleUrls: ['../tv/tv.scss', '../tv/tv-slides.scss', './count-wall.scss'],
  host: {
    class: 'mj-root mj-cc ctv-root',
    hidden: '',
    role: 'dialog',
    'aria-modal': 'true',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountWallComponent implements AfterViewInit {
  private readonly screen = inject(ScreenState);
  readonly theme = input('night');
  protected readonly mounts = signal<number[]>([]);
  protected readonly chrome = signal<CountShellView>(CHROME0);
  private readonly governoratePanels = viewChildren(GovernoratePanel);
  private readonly wilayatPanels = viewChildren(WilayatPanel);
  private mountNumber = 0;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly stage = viewChild(CountStage);
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly feed = inject(CountStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state: CountWallState = {
    theme: 'night',
    done: false,
    res: false,
    mode: null,
    gov: null,
    wil: null,
    pendWil: null,
    natHot: null,
    onFly: (ms) => (ms === null ? this.pacer.release() : this.pacer.hold(ms)),
  };
  protected readonly stageActions: CountStageActions = {
    goGov: (id) => this.goGovUser(id),
    backToList: (user) => this.screens.backToList(user),
    selectWil: (wilayat, user) => this.screens.selectWil(wilayat, user),
    backToNational: () => {
      this.play.manualHold();
      this.tvShow(0, true);
    },
    face: () => this.faces.current(),
    highlight: (id) => this.screens.natHot(id),
    settled: () => this.settledNow,
    still: () => this.still(),
  };
  private readonly pacer = new EventPacer(
    this.feed.every,
    (e) => ({ ...e, gov: this.feed.gov(e.gov.id) ?? e.gov, w: this.feed.wilById(e.w.id) ?? e.w }),
    (ev) => guard('wall ' + ('e' in ev ? ev.e.w.id : ev.type), () => this.paced(ev)),
  );
  private listening = false;
  private readonly faces = new WallFaces({
    root: this.root,
    frames: this.frames,
    instant: () => this.still() || this.settledNow,
    detectChanges: () => this.changeDetector.detectChanges(),
    national: () => this.feed.national(),
    governors: () => this.feed.govs.slice(),
    results: () => this.state.res,
  });
  protected readonly panels = this.faces.panels;
  private readonly bannerQ = new WallBanners({
    detectChanges: () => this.changeDetector.detectChanges(),
    destroyed: () => this.destroyRef.destroyed,
  });
  protected readonly banners = this.bannerQ.list;
  private readonly play = new WallPlayback({
    tv: () => this.tvEl(),
    render: () => this.renderChrome(),
  });
  private readonly screens = new WallScreens({
    feed: this.feed,
    frames: this.frames,
    state: this.state,
    faces: this.faces,
    play: this.play,
    stage: () => this.stage()!,
    still: () => this.still(),
    instant: () => this.still() || this.settledNow,
    govPanel: (f, w) =>
      this.governoratePanels()
        .find((p) => p.element.parentElement === f)
        ?.update(w),
    wilPanel: (f) => this.wilayatPanels().find((p) => p.element.parentElement === f),
    detectChanges: () => this.changeDetector.detectChanges(),
    goGovUser: (id) => this.goGovUser(id),
    say: (text, polite) => this.tvSay(text, polite),
    sec: () => this.play.sec,
  });
  private tvList: string[] = [];
  private tvK = 0;
  private settledNow = false;
  private rzT?: ReturnType<typeof setTimeout>;
  private readonly onKey = (e: KeyboardEvent) => wallKey(e, this.input);
  private readonly onResize = () => this.resized();
  private readonly input = {
    root: this.root,
    tv: () => this.tvEl(),
    state: this.state,
    wake: () => this.play.wake(),
    manualHold: () => this.play.manualHold(),
    release: () => this.play.release(),
    toggle: (v?: boolean) => this.tvToggle(v),
    show: (k: number) => this.tvShow(k, true),
    at: () => ({ k: this.tvK, n: this.tvList.length }),
    backToList: () => this.screens.backToList(true),
    resTab: (t: string) => this.screens.live.resTab(this.faces.current()!, t),
    leave: () => this.screen.leave('wall'),
    setTheme: () => this.setTheme(this.state.theme === 'night' ? 'daylight' : 'night'),
    setSec: (v: number) => this.tvSetSec(v),
    toggleStill: () => this.toggleStill(),
  };

  private renderChrome(): void {
    const next = this.tvList[(this.tvK + 1) % this.tvList.length];
    this.chrome.set({
      slides: this.tvList.map((_, index) => this.tvLabel(index)),
      index: this.tvK,
      done: this.state.done,
      results: this.state.res,
      theme: this.state.theme,
      paused: this.play.paused,
      still: this.play.still,
      osMotion: reducedMotion(),
      seconds: this.play.sec,
      next: (next && next !== 'nat' ? this.feed.gov(next)?.ar : null) ?? ct('cTvNat'),
      subtitle: ct(
        this.state.res ? 'cxResSub' : this.tvList[this.tvK] === 'nat' ? 'cTvNatSub' : 'cTvSub',
      ),
    });
  }
  protected act(action: CountShellAction): void {
    wallAction(action, this.input);
  }

  ngAfterViewInit(): void {
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    ['pointermove', 'pointerout'].forEach((ev) =>
      this.root.addEventListener(ev, (e) => e.stopPropagation()),
    );
  }
  constructor() {
    handOffToWinners();
    effect(() => {
      const on = this.screen.is('wall');
      untracked(() => (on ? this.openWall(this.theme()) : this.closeWall()));
    });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('keydown', this.onKey);
      window.removeEventListener('resize', this.onResize);
      this.play.destroy();
      clearTimeout(this.rzT);
      this.stage()?.stop();
      this.feed.stop(this);
      this.pacer.stop();
    });
  }

  private openWall(theme: string): void {
    this.play.paused = false;
    this.play.release();
    this.setTheme(theme);
    this.root.hidden = false;
    if (!this.listening) {
      this.listening = true;
      this.feed.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
        if (e.type === 'ready') {
          this.state.done = this.feed.done();
          this.state.res = this.feed.done() && SHOW_WINNERS;
          if (this.tvOn()) this.mount(this.tvK || this.regionK());
        } else this.pacer.deliver(e.events, e.complete);
      });
    }
    this.state.done = this.feed.done();
    this.state.res = this.feed.done() && SHOW_WINNERS;
    this.mount(this.regionK(this.screens.fromDraw()));
    this.feed.start(this);
  }
  private closeWall(): void {
    const tv = this.tvEl();
    if (!tv || !tv.classList.contains('on')) return;
    tv.classList.remove('on');
    this.root.hidden = true;
    this.play.reset();
    this.play.release();
    this.stage()?.stop();
    this.feed.stop(this);
    this.pacer.stop();
  }

  private still(): boolean {
    return this.play.still || reducedMotion();
  }
  private gov(id: string): CGov {
    return this.feed.gov(id)!;
  }
  private regionK(gid?: string | null): number {
    return Math.max(0, ['nat'].concat(this.govOrder()).indexOf(gid || this.screen.region()));
  }
  private govOrder(): string[] {
    return this.feed.govs.map((g) => g.id);
  }
  private tvEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('.ct-tv');
  }
  private tvOn(): boolean {
    return !!this.tvEl()?.classList.contains('on');
  }
  private tvLabel(k: number): string {
    const key = this.tvList[k]!,
      g = key === 'nat' ? null : this.feed.gov(key);
    return ct('tvGoTo', { n: k + 1, m: this.tvList.length, name: g ? g.ar : ct('cTvNat') });
  }
  private tvSay(text: string, polite?: boolean): void {
    const r = this.root.querySelector('.ct-tv .tva-live');
    if (!r) return;
    r.setAttribute('aria-live', polite ? 'polite' : 'off');
    r.textContent = text;
  }
  private goGovUser(id: string, wn?: string): void {
    const k = this.tvList.indexOf(id);
    if (k < 0) return;
    this.state.pendWil = wn || null;
    this.play.manualHold();
    if (this.state.mode === 'gov' && this.state.gov === id) {
      const w = wn ? this.feed.wil(id, wn) : null;
      if (w) this.screens.selectWil(w, true);
      return;
    }
    this.tvShow(k, true);
  }
  private tvShow(k: number, user?: boolean): void {
    if (!this.tvOn()) return;
    this.tvK = ((k % this.tvList.length) + this.tvList.length) % this.tvList.length;
    const key = this.tvList[this.tvK]!;
    this.settledNow = this.play.paused;
    this.play.clock.reset();
    this.renderChrome();
    if (key === 'nat') this.screens.goNat(this.settledNow);
    else this.screens.goGov(key, this.settledNow);
    this.settledNow = false;
    if (key === 'nat') this.screens.planNat();
    else this.screens.planGov(this.gov(key));
    this.tvSay(this.tvLabel(this.tvK), user || this.play.paused);
    if (user) this.screen.setRegion(key);
    this.play.sync();
  }

  private paced(ev: PacedEvent): void {
    if (ev.type === 'pull') {
      if (this.state.mode === 'nat') this.screens.live.natNums();
    } else if (ev.type === 'complete') {
      this.state.done = true;
      if (SHOW_WINNERS) {
        this.state.res = true;
        if (this.tvOn()) this.mount(this.tvK);
        return;
      }
      this.renderChrome();
    } else if (ev.type === 'declare') this.tvDeclared(ev.e);
    else if (this.tvOn()) this.screens.answer(ev.e);
  }
  private tvDeclared(e: CEvent): void {
    if (this.tvOn() && this.bannerQ.show(e) && this.state.mode === 'nat')
      this.stage()!.natPing(e.gov.id, true);
  }

  private tvToggle(v?: boolean): void {
    this.play.toggle(v);
    this.tvSay(this.play.paused ? ct('tvPaused') : this.tvLabel(this.tvK), true);
  }
  private tvSetSec(v: number): void {
    this.play.setSec(v);
    this.tvShow(this.tvK, true);
  }
  private toggleStill(): void {
    if (!this.play.toggleStill()) return;
    this.tvEl()?.classList.toggle('tva-still', this.play.still);
    this.tvShow(this.tvK, true);
  }

  private mount(k: number): void {
    const root = this.root,
      state = this.state;
    root.setAttribute('dir', 'rtl');
    root.setAttribute('lang', 'ar');
    root.setAttribute('aria-label', ct('cLiveCount'));
    this.play.reset();
    this.stage()?.stop();
    this.faces.reset();
    this.bannerQ.list.set([]);
    Object.assign(state, { mode: null, gov: null, wil: null });
    this.tvList = ['nat'].concat(this.govOrder());
    this.play.hold = {};
    this.play.initStill();
    this.renderChrome();
    this.mounts.set([++this.mountNumber]);
    this.changeDetector.detectChanges();
    const tv = this.tvEl()!;
    this.play.listen(tv);
    tv.classList.toggle('tva-still', this.play.still);
    tv.classList.add('on');
    this.tvShow(k || 0);
    this.play.wake();
    tv.setAttribute('tabindex', '-1');
    tv.focus({ preventScroll: true });
    const ow = () => {
      const oo = tv.querySelector<HTMLElement>('.tva-opts');
      if (oo && oo.offsetWidth) tv.style.setProperty('--tva-ow', oo.offsetWidth + 'px');
    };
    ow();
    const stage = this.stage();
    document.fonts?.ready.then(() => {
      if (this.destroyRef.destroyed || stage !== this.stage()) return;
      ow();
      stage?.fontsReady();
    });
  }
  private setTheme(v: string): void {
    this.state.theme = v === 'daylight' ? 'daylight' : 'night';
    this.root.setAttribute('data-theme', this.state.theme);
    this.renderChrome();
  }
  private resized(): void {
    clearTimeout(this.rzT);
    this.rzT = setTimeout(() => {
      if (this.tvOn()) this.stage()?.resize();
    }, 120);
  }
}
