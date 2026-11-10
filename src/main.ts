import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { log } from './app/core/log/log';
import { isAcceptPath } from './app/domain/conflict/accept-path';

async function root() {
  if (!isAcceptPath(location.pathname)) return App;
  return (await import('./app/features/accept/accept.component')).AcceptComponent;
}

root()
  .then((r) => bootstrapApplication(r, appConfig))
  .catch((err) => log.error('bootstrap failed', err));
