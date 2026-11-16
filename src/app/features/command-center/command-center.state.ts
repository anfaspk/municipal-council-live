import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ViewportState } from '../../core/screen/viewport.state';
import { TurnoutStore } from '../../data/turnout.store';
import type { Tab } from './drawer/drawer.model';
import { loadTheme, saveTheme, themeOf, type Theme } from './theme-pref';

export type { Theme } from './theme-pref';

@Injectable()
export class CommandCenterState {
  private readonly stats = inject(TurnoutStore);
  private readonly viewport = inject(ViewportState);
  private readonly savedTheme = signal<Theme | null>(loadTheme());

  readonly theme = linkedSignal<Theme>(() =>
    themeOf(this.savedTheme(), this.viewport.form(), this.viewport.scheme()),
  );
  readonly sort = signal('turnout');
  readonly hot = signal<string | null>(null);
  readonly pinned = signal<string | null>(null);
  readonly focus = computed(() => this.hot() ?? this.pinned());
  readonly drilled = computed(() => this.pinned() !== null);
  readonly pane = signal<Tab>('ov');
  readonly side = signal<string | null>(null);
  readonly wilHot = signal<string | null>(null);
  readonly wilSel = signal<string | null>(null);
  readonly wilPicked = new Subject<string>();
  readonly held = signal(false);

  private sideKey: string | null = null;
  private sideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const k = this.focus();
      untracked(() => this.follow(k));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.sideTimer));
  }

  setHot(id: string | null): void {
    this.hot.set(id);
  }
  open(id: string): void {
    if (this.pinned() === id || !this.stats.gov(id)) return;
    this.pinned.set(id);
    this.hot.set(null);
    this.wilHot.set(null);
    this.wilSel.set(null);
  }
  close(): void {
    if (this.pinned() === null) return;
    this.pinned.set(null);
    this.pane.set('ov');
    this.hot.set(null);
    this.wilHot.set(null);
    this.wilSel.set(null);
  }
  pickWil(name: string): void {
    this.wilPicked.next(name);
  }
  toggleTheme(): void {
    this.setTheme(this.theme() === 'night' ? 'daylight' : 'night');
  }
  setTheme(t: Theme): void {
    saveTheme(t);
    this.savedTheme.set(t);
    this.theme.set(t);
  }

  private follow(k: string | null): void {
    if (k === this.sideKey) return;
    this.sideKey = k;
    clearTimeout(this.sideTimer);
    this.sideTimer = setTimeout(() => this.side.set(this.sideKey), 140);
  }
}
