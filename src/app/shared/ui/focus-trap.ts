export function trapTab(host: HTMLElement, e: KeyboardEvent, controls = 'button, select'): void {
  const f = Array.from(host.querySelectorAll<HTMLElement>(controls)).filter(
    (b) =>
      b.tabIndex >= 0 && b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden',
  );
  const i = f.indexOf(document.activeElement as HTMLElement),
    first = f[0],
    last = f[f.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && i <= 0) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (i < 0 || i === f.length - 1)) {
    e.preventDefault();
    first.focus();
  }
}
