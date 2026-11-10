
export function flushStyle(el: Element): void {
  void getComputedStyle(el).animationName;
}

export function restartAnimation(el: Element, cls: string, on = true): void {
  el.classList.remove(cls);
  flushStyle(el);
  if (on) el.classList.add(cls);
}
