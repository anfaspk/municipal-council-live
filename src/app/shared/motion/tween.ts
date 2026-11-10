import { FrameHandle, FrameLoop, FrameScope } from './frame-loop.service';
import { reducedMotion } from './reduced-motion';
import { fmt } from '../../domain/format';
import { easeExpo } from './easing';

export function tween(
  frames: FrameLoop,
  dur: number,
  fn: (t: number) => void,
  done?: (() => void) | null,
  ease?: (t: number) => number,
  scope: FrameScope = 'dashboard',
): FrameHandle {
  if (reducedMotion() || frames.isPaused(scope)) {
    fn(1);
    if (done) done();
    return {
      stop() {
      },
    };
  }
  const t0 = performance.now(),
    e = ease || easeExpo;
  const finish = () => {
    run.stop();
    fn(1);
    done?.();
  };
  const run = frames.add(
    {
      paused: finish,
      write: (now) => {
        const t = Math.min(1, (now - t0) / dur);
        fn(e(t));
        if (t >= 1) {
          run.stop();
          if (done) done();
        }
      },
    },
    scope,
  );
  return run;
}

export function countUp(
  frames: FrameLoop,
  el: Element,
  to: number,
  o: { from?: number; dur?: number; format?: (v: number) => string; scope?: FrameScope } = {},
): FrameHandle {
  const from = o.from || 0,
    f = o.format || fmt;
  return tween(
    frames,
    o.dur || 1600,
    (k) => {
      el.textContent = f(from + (to - from) * k);
    },
    null,
    easeExpo,
    o.scope,
  );
}
