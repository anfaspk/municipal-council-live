
export interface WakeSentinel {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}

export interface WakeHost {
  request: (() => Promise<WakeSentinel>) | null;
  visible(): boolean;
  onVisibility(fn: () => void): () => void;
}

export class WakeKeeper {
  private wanted = false;
  private lock: WakeSentinel | null = null;
  private asking = false;
  private readonly unlisten: () => void;

  constructor(private readonly host: WakeHost) {
    this.unlisten = host.onVisibility(() => this.sync());
  }

  want(on: boolean): void {
    this.wanted = on;
    this.sync();
  }

  get held(): boolean {
    return !!this.lock && !this.lock.released;
  }

  dispose(): void {
    this.unlisten();
    this.wanted = false;
    this.sync();
  }

  private sync(): void {
    const keep = this.wanted && this.host.visible();
    if (!keep) {
      const lock = this.lock;
      this.lock = null;
      if (lock && !lock.released) lock.release().catch(() => undefined);
      return;
    }
    if (this.held || this.asking || !this.host.request) return;
    this.asking = true;
    this.host.request().then(
      (lock) => {
        this.asking = false;
        lock.addEventListener('release', () => {
          if (this.lock === lock) this.lock = null;
        });
        this.lock = lock;
        this.sync();
      },
      () => {
        this.asking = false;
      },
    );
  }
}

export function browserWakeHost(): WakeHost {
  const api = (
    navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeSentinel> } }
  ).wakeLock;
  return {
    request: api ? () => api.request('screen') : null,
    visible: () => document.visibilityState === 'visible',
    onVisibility(fn) {
      document.addEventListener('visibilitychange', fn);
      return () => document.removeEventListener('visibilitychange', fn);
    },
  };
}
