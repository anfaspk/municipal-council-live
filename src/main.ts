import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { API_BASE } from './app/core/api/api-base';
import { type Display, formOf, parseForm } from './app/core/screen/layout.model';
import { log } from './app/core/log/log';
import { isAcceptPath } from './app/domain/conflict/accept-path';
import { isAppPath, leaveFor } from './app/core/screen/error-page';
import { loadKit } from './app/kit-entry';

async function root() {
  if (loadKit && new URLSearchParams(location.search).has('kit')) return loadKit();
  if (isAcceptPath(location.pathname))
    return (await import('./app/features/accept/accept.component')).AcceptComponent;
  return isAppPath(location.pathname, new URL(document.baseURI).pathname) ? App : null;
}

try {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = new URL(API_BASE).origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
} catch {
}

function shellAhead(): void {
  const mq = (q: string) => matchMedia(q).matches,
    display: Display = mq('(display-mode: fullscreen)')
      ? 'fullscreen'
      : mq('(display-mode: standalone)')
        ? 'standalone'
        : 'browser';
  const form = formOf({
    vw: innerWidth,
    vh: innerHeight,
    zoom: 1,
    screen: 'dashboard',
    forced: parseForm(location.search),
    coarse: mq('(pointer: coarse)'),
    display,
  });
  void (
    form === 'flow'
      ? import('./app/features/command-center/flow/flow-shell.component')
      : import('./app/features/command-center/command-center.component')
  ).catch(() => undefined);
}

root()
  .then((r) => {
    if (!r) return leaveFor('404');
    if (r === App) shellAhead();
    return bootstrapApplication(r, appConfig).then(() => undefined);
  })
  .catch((err) => {
    log.error('bootstrap failed', err);
    leaveFor('50x', 'boot');
  });
