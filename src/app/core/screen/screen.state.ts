import {
  afterNextRender,
  Injector,
  effect,
  Injectable,
  InjectionToken,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { GEO } from '../../domain/geo/geo.data';
import { ServerClock } from '../clock/server-clock.service';
import { log } from '../log/log';
import { leaveFor } from './error-page';
import {
  isRegion,
  loadScreenPrefs,
  govOfWil,
  parseScreenBoot,
  winnersSearch,
  wilIds,
  readReload,
  RELOAD_GUARD,
  Rotation,
  saveScreenPrefs,
  Screen,
  writeReload,
} from './screen-prefs';

export const SCREEN_FRAME = new InjectionToken<HTMLElement>('screen frame');

export type ScreenSwap = (apply: () => void, form: boolean) => void;
export const SCREEN_SWAP = new InjectionToken<ScreenSwap>('screen swap', {
  providedIn: 'root',
  factory: () => (apply) => apply(),
});

@Injectable({ providedIn: 'root' })
export class ScreenState {
  private readonly clock = inject(ServerClock);
  private readonly injector = inject(Injector);
  private readonly swap = inject(SCREEN_SWAP);
  private readonly govs = Object.keys(GEO.g);
  private readonly prefs = loadScreenPrefs(this.govs);
  private readonly boot = parseScreenBoot(location.search, this.govs, wilIds(GEO.wilPt));
  private readonly reload = readReload(Date.now());

  private readonly _screen = signal<Screen>(this.reload?.screen ?? this.boot.screen ?? 'dashboard');
  private readonly _built = signal(this._screen() === 'dashboard');
  private readonly _region = signal(this.boot.region ?? this.prefs.region);
  private readonly _rotation = signal<Rotation>(this.prefs.rotation);
  readonly screen = this._screen.asReadonly();
  readonly built = this._built.asReadonly();
  readonly region = this._region.asReadonly();
  readonly rotation = this._rotation.asReadonly();
  readonly bootRegion = this.boot.region ?? null;
  private bootWil = this.boot.wil ?? null;
  takeBootWil(): { wil: number; gov: string } | null {
    const w = this.bootWil,
      gov = w === null ? null : govOfWil(w, GEO.wilPt);
    this.bootWil = null;
    return w !== null && gov ? { wil: w, gov } : null;
  }

  private readonly _auto = signal<{ from: Screen; to: Screen; n: number } | null>(null);
  readonly auto = this._auto.asReadonly();
  autoGate: (go: () => void) => void = (go) => go();

  private origin: Element | null = null;
  private wallShown = false;
  private handoff: string | null = null;

  constructor() {
    if (this.reload?.screen) writeReload({ at: this.reload.at });
    effect(() => {
      if (!this.clock.counting() || this.wallShown) return;
      this.wallShown = true;
      untracked(() => this.autoShow('wall'));
    });
  }

  is(s: Screen): boolean {
    return this._screen() === s;
  }

  show(s: Screen): void {
    const was = this._screen();
    if (s === was) return;
    if (was === 'dashboard') this.origin = document.activeElement;
    this.swap(() => this.apply(s), false);
  }

  private apply(s: Screen): void {
    if (this._screen() === s) return;
    if (this._screen() === 'winners') this.address(winnersSearch(location.search, undefined));
    this._screen.set(s);
    if (s !== 'dashboard') return;
    this._built.set(true);
    const o = this.origin as HTMLElement | null;
    this.origin = null;
    const restore = () => {
      const target =
        o?.isConnected && o !== document.body
          ? o
          : document.querySelector<HTMLElement>('.cc-dash button:not([disabled])');
      target?.focus({ preventScroll: true });
    };
    restore();
    afterNextRender(restore, { injector: this.injector });
  }

  winnersAddress(region: string | null): void {
    if (this.is('winners')) this.address(winnersSearch(location.search, region));
  }
  private address(search: string): void {
    if (search === location.search) return;
    history.replaceState(history.state, '', location.pathname + search + location.hash);
  }

  leave(s: Screen): void {
    if (this._screen() === s) this.show('dashboard');
  }

  recover(s: Screen): void {
    if (this.reloadOnce(s)) return;
    log.warn('screen chunk failed: ' + s);
    if (s === 'dashboard') leaveFor('50x', 'boot');
    else this.leave(s);
  }

  reloadOnce(s: Screen): boolean {
    const last = readReload(Date.now());
    if (
      (last && Date.now() - last.at < RELOAD_GUARD) ||
      !writeReload({ screen: s, at: Date.now() })
    )
      return false;
    location.reload();
    return true;
  }

  showWinners(region: string): void {
    this.handoff = region;
    this.autoShow('winners');
  }

  openOn(s: 'wall' | 'winners', gov: string, wil: number | null): void {
    if (s === 'winners') this.handoff = gov;
    else this.setRegion(gov);
    this.bootWil = wil;
    this.show(s);
  }

  private autoShow(to: Screen): void {
    this.autoGate(() => {
      const from = this._screen();
      if (from === to || (to === 'wall' && (from === 'winners' || from === 'draw'))) return;
      this.show(to);
      this._auto.set({ from, to, n: (this._auto()?.n ?? 0) + 1 });
    });
  }
  takeHandoff(): string | null {
    const g = this.handoff;
    this.handoff = null;
    return g;
  }

  setRegion(r: string): void {
    if (!isRegion(r, this.govs) || r === this._region()) return;
    this._region.set(r);
    this.save();
  }
  setRotation(r: Rotation): void {
    if (r === this._rotation()) return;
    this._rotation.set(r);
    this.save();
  }
  private save(): void {
    saveScreenPrefs({ region: this._region(), rotation: this._rotation() });
  }
}
