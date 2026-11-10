import { Injectable } from '@angular/core';
import { reducedMotion } from './reduced-motion';

export function boot(root: HTMLElement): void {
  if (reducedMotion()) return;
  root
    .querySelectorAll<HTMLElement>('[data-boot]')
    .forEach((el, i) => el.style.setProperty('--i', String(i)));
  root.classList.add('mj-boot');
  setTimeout(() => root.classList.remove('mj-boot'), 3200);
}

@Injectable({ providedIn: 'root' })
export class BootFlag {
  first = true;
}
