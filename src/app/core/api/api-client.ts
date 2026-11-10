import { Injectable } from '@angular/core';
import { API_BASE } from './api-base';
import { Endpoint } from './endpoints';
import { Envelope, unwrap } from './envelope';

const TIMEOUT = 9500;

type Fetch = typeof fetch;
const browserFetch: Fetch = (input, init) => fetch(input, init);

export interface GetOptions {
  signal?: AbortSignal;
  timeout?: number;
}

function either(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([a, b]);
  const ctl = new AbortController(),
    stop = (s: AbortSignal) => ctl.abort(s.reason);
  if (a.aborted) stop(a);
  else if (b.aborted) stop(b);
  else {
    a.addEventListener('abort', () => stop(a), { once: true });
    b.addEventListener('abort', () => stop(b), { once: true });
  }
  return ctl.signal;
}

@Injectable({ providedIn: 'root', useFactory: () => new ApiClient(API_BASE) })
export class ApiClient {
  constructor(
    private readonly base: string,
    private readonly fetcher: Fetch = browserFetch,
  ) {}

  async get<T>(route: Endpoint<T>, opts: GetOptions = {}): Promise<T> {
    const timeout = AbortSignal.timeout(opts.timeout ?? TIMEOUT),
      signal = opts.signal ? either(opts.signal, timeout) : timeout;
    const post = route.body !== undefined;
    const res = await this.fetcher((route.base ?? this.base) + '/' + route.path, {
      signal,
      ...(post ? { method: 'POST', body: JSON.stringify(route.body) } : {}),
      headers: post
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      ...(route.fresh ? { cache: 'no-store' as const } : {}),
    });
    if (!res.ok)
      throw new Error(
        (route.bare ? route.path.split('/')[0] : route.path) + ': HTTP ' + res.status,
      );
    const body: unknown = await res.json();
    return route.bare ? (body as T) : unwrap(route.path, body as Envelope<T>);
  }
}
