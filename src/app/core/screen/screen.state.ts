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
import {
  isRegion,
  loadScreenPrefs,
  parseScreenBoot,
  readReload,
  RELOAD_GUARD,
  Rotation,
  saveScreenPrefs,
  Screen,
  writeReload,
} from './screen-prefs';

export const SCREEN_FRAME = new InjectionToken<HTMLElement>('screen frame');

@Injectable({ providedIn: 'root' })
export class ScreenState {
  private readonly clock = inject(ServerClock);
  private readonly injector = inject(Injector);
  private readonly govs = Object.keys(GEO.g);
  private readonly prefs = loadScreenPrefs(this.govs);
  private readonly boot = parseScreenBoot(location.search, this.govs);
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

  private origin: Element | null = null;
  private wallShown = false;
  private handoff: string | null = null;

  constructor() {
    if (this.reload?.screen) writeReload({ at: this.reload.at });
    effect(() => {
      if (!this.clock.counting() || this.wallShown) return;
      this.wallShown = true;
      untracked(() => {
        if (!this.is('winners') && !this.is('draw')) this.show('wall');
      });
    });
  }

  is(s: Screen): boolean {
    return this._screen() === s;
  }

  show(s: Screen): void {
    const was = this._screen();
    if (s === was) return;
    if (was === 'dashboard') this.origin = document.activeElement;
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

  leave(s: Screen): void {
    if (this._screen() === s) this.show('dashboard');
  }

  recover(s: Screen): void {
    const last = readReload(Date.now());
    if (
      (last && Date.now() - last.at < RELOAD_GUARD) ||
      !writeReload({ screen: s, at: Date.now() })
    ) {
      log.warn('screen chunk failed: ' + s);
      this.leave(s);
      return;
    }
    location.reload();
  }

  showWinners(region: string): void {
    this.handoff = region;
    this.show('winners');
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
