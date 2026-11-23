import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { guard } from '../../../core/log/log';
import { screenComp } from '../../../core/screen/layout.model';
import { NavHistory } from '../../../core/screen/nav-history';
import type { Screen } from '../../../core/screen/screen-prefs';
import { ScreenState } from '../../../core/screen/screen.state';
import { ViewportState } from '../../../core/screen/viewport.state';
import { CountStore } from '../../../data/count.store';
import { CEvent } from '../../../domain/count/count';
import { clockStr } from '../../../domain/format';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { screenKey } from '../../../shared/motion/screen-keys';
import { SwipeDirective } from '../../../shared/motion/swipe.directive';
import { AppbarComponent } from '../../../shared/ui/appbar/appbar.component';
import { trapTab } from '../../../shared/ui/focus-trap';
import { shareLink } from '../../../shared/ui/share';
import { SheetComponent } from '../../../shared/ui/sheet/sheet.component';
import { COUNT_TV_PREFS, loadTvPrefs, saveTvPrefs } from '../../../shared/ui/tv-prefs';
import { DrawFocus } from '../draw/draw-focus';
import { EventPacer, PacedEvent } from '../event-pacer';
import { handOffToWinners } from '../wall-handoff';
import { CfGovComponent } from './cf-gov.component';
import { CfFlyComponent } from './cf-fly.component';
import { CfGovsComponent } from './cf-govs.component';
import { CfIconComponent } from './cf-icon.component';
import { CfMapComponent } from './cf-map.component';
import { CfNatComponent } from './cf-nat.component';
import { type CfLine, type CfSheet, CfSheetsComponent } from './cf-sheets.component';
import { signageWalk } from './cf-sign';
import { cf } from './cf-strings';
import { CfTPipe } from './cf-t.pipe';
import { CfWalk } from './cf-walk';
import { CfWilComponent } from './cf-wil.component';
import { CfWideComponent } from './cf-wide.component';
import { NAT, type Place, placeKey, siblingOf, upOf } from './count-flow.model';
import { CountView } from './count.view';

const KEEP = 30;
const BAR: readonly { s: Screen; icon: 'box' | 'medal' | 'grid' | 'tv'; key: string }[] = [
  { s: 'wall', icon: 'box', key: 'cfBarCount' },
  { s: 'winners', icon: 'medal', key: 'cfBarWin' },
  { s: 'dashboard', icon: 'grid', key: 'cfBarDash' },
  { s: 'tv', icon: 'tv', key: 'cfBarTv' },
];

@Component({
  selector: 'div[countFlow]',
  imports: [
    AppbarComponent,
    SheetComponent,
    SwipeDirective,
    CfFlyComponent,
    CfGovsComponent,
    CfGovComponent,
    CfIconComponent,
    CfMapComponent,
    CfNatComponent,
    CfSheetsComponent,
    CfTPipe,
    CfWideComponent,
    CfWilComponent,
  ],
  providers: [CountView, { provide: FRAME_SCOPE, useValue: 'wall' }],
  host: {
    class: 'cf',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'label',
    '[attr.data-theme]': 'look()',
    '[class.on]': 'isOpen()',
    '[class.still]': 'still()',
    '[attr.data-comp]': 'comp()',
    '(document:keydown)': 'onKey($event)',
  },
  templateUrl: './count-flow.component.html',
  styleUrls: ['./count-flow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountFlowComponent {
  readonly theme = input('night');
  protected readonly view = inject(CountView);
  protected readonly screen = inject(ScreenState);
  private readonly store = inject(CountStore);
  private readonly nav = inject(NavHistory);
  private readonly focus = inject(DrawFocus);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly clock = inject(ServerClock);
  protected readonly counting = this.clock.counting;

  protected readonly label = cf('cfLabel');
  protected readonly bar = BAR;
  protected readonly isOpen = signal(false);
  protected readonly look = signal<'night' | 'daylight'>('night');
  protected readonly sheet = signal<CfSheet | null>(null);
  protected readonly lines = signal<CfLine[]>([]);
  protected readonly say = signal('');
  private readonly prefs = loadTvPrefs(COUNT_TV_PREFS);
  protected readonly secs = signal(this.prefs.sec);
  protected readonly secsList = COUNT_TV_PREFS.seconds;
  protected readonly osStill = signal(reducedMotion());
  protected readonly still = signal(this.prefs.still || reducedMotion());
  protected readonly place = this.view.place;
  protected readonly walk = new CfWalk((p) => this.go(p, 'walk'));
  private readonly viewport = inject(ViewportState);
  protected readonly comp = computed(() => {
    const { w, h } = this.viewport.size();
    return screenComp(w, h, this.viewport.anyCoarse());
  });
  protected readonly fly = computed(() => this.comp() === 'sign' && this.viewport.fx() !== 'lite');
  protected readonly stamp = computed(() => {
    const at = this.view.staleAt();
    return at ? cf('figuresAt', { t: at }) : cf('cfUpdated', { t: this.view.stamp() });
  });
  protected readonly crumbs = computed(() => {
    const g = this.view.gov(),
      w = this.view.wil();
    return { up: w ? (g?.ar ?? '') : cf('cfOman'), here: w ? w.ar : (g?.ar ?? '') };
  });
  protected readonly segList = computed(() => {
    const s = this.walk.segs();
    return Array.from({ length: s.n }, (_, i) => (i < s.at ? 'done' : i === s.at ? 'on' : ''));
  });
  protected readonly sheetLabel = computed(() =>
    cf(this.sheet() === 'act' ? 'cfAct' : 'cfSettings'),
  );
  private readonly scroll = viewChild<ElementRef<HTMLElement>>('scroll');
  private lineN = 0;
  private stopNav: (() => void) | null = null;
  protected readonly pacer = new EventPacer(
    this.store.every,
    (e) => ({ ...e, gov: this.store.gov(e.gov.id) ?? e.gov, w: this.store.wilById(e.w.id) ?? e.w }),
    (ev) => guard('count flow ' + ev.type, () => this.paced(ev)),
  );

  constructor() {
    handOffToWinners();
    effect(() => {
      const on = this.screen.is('wall');
      untracked(() => (on ? this.open() : this.shut()));
    });
    this.store.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.type === 'poll' && this.isOpen()) this.pacer.deliver(e.events, e.complete);
    });
    effect(() => {
      const p = this.place();
      if (this.isOpen())
        untracked(() => {
          this.store.focus(p.k === 'nat' ? null : p.gid);
          this.store.want(p.k === 'wil' ? p.wid : null);
        });
    });
    signageWalk({
      host: this.host,
      comp: this.comp,
      open: this.isOpen,
      counting: this.counting,
      walk: this.walk,
      secs: this.secs,
      still: this.still,
      place: this.place,
    });
    inject(DestroyRef).onDestroy(() => {
      this.store.stop(this);
      this.pacer.stop();
      this.walk.stop();
      this.stopNav?.();
    });
  }

  private open(): void {
    this.look.set(this.theme() === 'daylight' ? 'daylight' : 'night');
    this.osStill.set(reducedMotion());
    this.still.set(this.prefs.still || reducedMotion());
    this.sheet.set(null);
    this.isOpen.set(true);
    this.store.start(this, true);
    this.stopNav = this.nav.listen('level', () => this.popped());
    const back = this.focus.takeBack(),
      link = this.screen.takeBootWil(),
      w = back ? this.store.wil(back.gid, back.n) : null,
      r = this.screen.region();
    this.place.set(
      w
        ? { k: 'wil', gid: w.gid, wid: w.id }
        : link
          ? { k: 'wil', gid: link.gov, wid: link.wil }
          : r !== 'nat'
            ? { k: 'gov', gid: r }
            : NAT,
    );
    afterNextRender(() => this.host.focus({ preventScroll: true }), { injector: this.injector });
  }
  private shut(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.store.stop(this);
    this.pacer.stop();
    this.walk.stop();
    this.sheet.set(null);
    this.stopNav?.();
    this.stopNav = null;
    this.nav.back('level');
  }


  private go(p: Place, how: 'down' | 'side' | 'walk' | 'pop'): void {
    this.place.set(p);
    if (how === 'down') this.nav.push('level', { cf: placeKey(p) }, location.href);
    else if (how === 'side') this.nav.replace({ cf: placeKey(p) }, location.href);
    if (how !== 'walk' && how !== 'pop') this.screen.setRegion(p.k === 'nat' ? 'nat' : p.gid);
    if (how !== 'walk') this.walk.stop();
    this.say.set(this.placeName(p));
    afterNextRender(
      () => {
        this.scroll()?.nativeElement.scrollTo({ top: 0 });
        if (how !== 'walk')
          this.host.querySelector<HTMLElement>('.cf-name')?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  protected toGov(gid: string): void {
    this.go({ k: 'gov', gid }, 'down');
  }
  protected toWil(wid: number): void {
    const w = this.store.wilById(wid);
    if (w) this.go({ k: 'wil', gid: w.gid, wid }, 'down');
  }
  protected pickWil(wid: number): void {
    const w = this.store.wilById(wid);
    if (!w) return;
    if (this.place().k === 'wil') this.go({ k: 'wil', gid: w.gid, wid }, 'side');
    else this.toWil(wid);
  }
  protected up(): void {
    const p = this.place();
    if (p.k === 'nat') return this.screen.leave('wall');
    if (this.nav.state['cf'] === placeKey(p)) history.back();
    else this.go(upOf(p), 'side');
  }
  protected sibling(step: 1 | -1): void {
    const s = siblingOf(this.store.govs, this.place(), step);
    if (s) this.go(s, 'side');
  }
  private popped(): void {
    const k = this.nav.state['cf'];
    this.go(typeof k === 'string' ? this.fromKey(k) : NAT, 'pop');
  }
  private fromKey(k: string): Place {
    if (k.startsWith('g') && this.store.gov(k.slice(1))) return { k: 'gov', gid: k.slice(1) };
    const w = k.startsWith('w') ? this.store.wilById(+k.slice(1)) : null;
    return w ? { k: 'wil', gid: w.gid, wid: w.id } : NAT;
  }
  private placeName(p: Place): string {
    if (p.k === 'nat') return cf('cfOman');
    if (p.k === 'gov') return this.store.gov(p.gid)?.ar ?? '';
    return this.store.wilById(p.wid)?.ar ?? '';
  }


  protected toDraw(): void {
    const w = this.view.wil();
    if (!w) return;
    this.focus.open(w);
    this.screen.show('draw');
  }
  protected show(s: Screen | 'draw'): void {
    this.sheet.set(null);
    if (s !== 'wall') this.screen.show(s);
  }
  protected share(): void {
    const w = this.view.wil();
    if (!w) return;
    const url = location.origin + location.pathname + '?screen=counting&wil=' + w.id;
    void shareLink({ title: w.ar, text: cf('cfTitle') + ' · ' + w.ar, url });
  }
  protected play(): void {
    if (this.walk.on()) return this.walk.stop();
    this.walk.start(this.store.govs, this.secs(), this.place());
  }
  protected setSecs(s: number): void {
    this.secs.set(s);
    this.prefs.sec = s;
    saveTvPrefs(this.prefs, COUNT_TV_PREFS);
    this.walk.retime(this.store.govs, s);
  }
  protected setStill(on: boolean): void {
    if (this.osStill()) return;
    this.still.set(on);
    this.prefs.still = on;
    saveTvPrefs(this.prefs, COUNT_TV_PREFS);
  }
  protected flipTheme(): void {
    this.look.update((t) => (t === 'night' ? 'daylight' : 'night'));
  }


  private paced(ev: PacedEvent): void {
    if (!('e' in ev)) return;
    const text = this.lineOf(ev.type, ev.e);
    if (!text) return;
    const line: CfLine = {
      id: ++this.lineN,
      t: clockStr(this.clock.now()),
      text,
      st: ev.type === 'lead' ? 'count' : ev.e.w.st,
    };
    this.lines.update((l) => [line, ...l].slice(0, KEEP));
  }
  private lineOf(type: string, e: CEvent): string {
    const w = e.w.ar;
    if (type === 'lead' && e.inC) return cf('cfActLead', { c: e.inC.ar, w });
    if (type === 'declare') return cf('cfActDecl', { w });
    if (type !== 'status') return '';
    return e.to === 'count'
      ? cf('cfActCount', { w })
      : e.to === 'pend'
        ? cf('cfActPend', { w })
        : e.to === 'decl'
          ? cf('cfActDecl', { w })
          : '';
  }


  protected onKey(e: KeyboardEvent): void {
    if (!this.isOpen() || this.sheet() || e.defaultPrevented) return;
    const el = e.target as Element | null;
    const a = screenKey(
      {
        key: e.key,
        keyCode: e.keyCode,
        onButton: !!el?.closest?.('button'),
        onField: !!el?.closest?.('select, input'),
      },
      'wall',
    );
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, a[href], [tabindex="0"]');
    if (a.type === 'close') {
      e.preventDefault();
      return this.up();
    }
    if (a.type === 'play') {
      if (!this.walk.on()) return;
      e.preventDefault();
      return this.walk.toggle(a.pause);
    }
    if (a.type !== 'go') return;
    e.preventDefault();
    if (a.to === 'first') this.go(NAT, 'side');
    else if (a.to === 'next' || a.to === 'prev') this.sibling(a.to === 'next' ? 1 : -1);
  }
}
