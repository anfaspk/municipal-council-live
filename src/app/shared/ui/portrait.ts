const shown = new Set<string>();
const broken = new Set<string>();
const held = new Map<string, HTMLImageElement>();
const KEEP = 160;
export const portraitOk = (url: string | null | undefined): url is string =>
  !!url && !broken.has(url);
export const portraitReady = (url: string | null | undefined): boolean => !!url && shown.has(url);
export const picClass = (url: string): string => (shown.has(url) ? 'mj-pic on now' : 'mj-pic');
const srcOf = (el: Element): string =>
  (el as HTMLImageElement).currentSrc || el.getAttribute('src') || el.getAttribute('href') || '';
export function picLoaded(el: Element): void {
  const url = srcOf(el);
  const show = (): void => {
    if (url) shown.add(url);
    el.classList.add('on');
  };
  const img = el as Partial<HTMLImageElement>;
  if (typeof img.decode === 'function') img.decode.call(el).then(show, show);
  else show();
}
export function markBroken(url: string | null | undefined): void {
  if (url) broken.add(url);
}
function picFailed(el: Element): void {
  markBroken(srcOf(el));
  el.remove();
}
export function watchPortraits(root: Element): () => void {
  const on = (e: Event): void => {
    const t = e.target;
    if (t instanceof Element && t.classList.contains('mj-pic'))
      (e.type === 'load' ? picLoaded : picFailed)(t);
  };
  root.addEventListener('load', on, true);
  root.addEventListener('error', on, true);
  return () => {
    root.removeEventListener('load', on, true);
    root.removeEventListener('error', on, true);
  };
}
export function warmPortraits(urls: Iterable<string | null | undefined>): void {
  if (typeof Image === 'undefined') return;
  for (const url of urls) {
    if (!portraitOk(url) || shown.has(url) || held.has(url)) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    held.set(url, img);
    img.decode().then(
      () => shown.add(url),
      () => {
        held.delete(url);
        if (img.complete && !img.naturalWidth) broken.add(url);
      },
    );
    if (held.size > KEEP) {
      const first = held.keys().next().value;
      if (first !== undefined) held.delete(first);
    }
  }
}
