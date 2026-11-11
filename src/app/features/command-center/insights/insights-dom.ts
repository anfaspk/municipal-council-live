import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { flushStyle } from '../../../shared/motion/restart-animation';

export function moveInk(
  dock: HTMLElement,
  tb: HTMLElement,
  prev: HTMLElement | null,
  instant: boolean,
): void {
  const ink0 = dock.querySelector<HTMLElement>('.ix-ink')!,
    d0 = dock.querySelector<HTMLElement>('.ix-drop.d1')!,
    d1 = dock.querySelector<HTMLElement>('.ix-drop.d2')!;
  const Wd = dock.clientWidth,
    l = tb.offsetLeft,
    w = tb.offsetWidth,
    r = Wd - l - w,
    cx = l + w / 2;
  const right = prev ? tb.offsetLeft > prev.offsetLeft : true;
  const all = [ink0, d0, d1];
  if (instant || reducedMotion() || !prev)
    all.forEach((e) => {
      e.style.transition = 'none';
    });
  else {
    ink0.style.transition =
      'left .62s cubic-bezier(.7,0,.25,1) ' +
      (right ? '.14s' : '0s') +
      ',right .62s cubic-bezier(.7,0,.25,1) ' +
      (right ? '0s' : '.14s');
    d0.style.transition = 'left .8s cubic-bezier(.6,0,.2,1) .06s';
    d1.style.transition = 'left .95s cubic-bezier(.6,0,.2,1) .12s';
  }
  ink0.style.left = l + 'px';
  ink0.style.right = r + 'px';
  d0.style.left = cx - 7 + 'px';
  d1.style.left = cx - 5 + 'px';
  if (instant || !prev) {
    flushStyle(ink0);
    all.forEach((e) => {
      e.style.transition = '';
    });
  }
}

export function replayAges(age: HTMLElement): void {
  age.classList.remove('ix-ain');
  flushStyle(age.querySelector('.ix-abar') ?? age);
  age.classList.add('ix-ain');
}
