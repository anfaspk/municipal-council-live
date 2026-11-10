
export interface Tag {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampLabelX(x: number, labelWidth: number, hostWidth: number): number {
  const half = labelWidth / 2 + 4;
  return hostWidth > 2 * half ? Math.max(half, Math.min(hostWidth - half, x)) : x;
}

export function spreadTags(tags: readonly Tag[], hostWidth: number, hostHeight: number): Tag[] {
  const boxes = tags.map((t) => ({
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    boxWidth: t.width + 6,
    boxHeight: t.height + 4,
  }));
  for (let round = 0; round < 60; round++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!,
          b = boxes[j]!;
        const overlapX = (a.boxWidth + b.boxWidth) / 2 - Math.abs(a.x - b.x);
        const overlapY = (a.boxHeight + b.boxHeight) / 2 - Math.abs(a.y - b.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        if (overlapY < overlapX * 1.6) {
          const shift = ((a.y <= b.y ? -1 : 1) * overlapY) / 2;
          a.y += shift;
          b.y -= shift;
        } else {
          const shift = ((a.x <= b.x ? -1 : 1) * overlapX) / 2;
          a.x += shift;
          b.x -= shift;
        }
      }
    if (!moved) break;
  }
  return boxes.map((b) => ({
    x: Math.max(b.boxWidth / 2, Math.min(hostWidth - b.boxWidth / 2, b.x)),
    y: Math.max(b.boxHeight, Math.min(hostHeight, b.y)),
    width: b.width,
    height: b.height,
  }));
}

export interface CountLabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  px?: number;
  py?: number;
  fixed?: number;
  soft?: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function layoutCountLabels(
  source: readonly CountLabelBox[],
  hostWidth: number,
  hostHeight: number,
  inset: { x: number; y: number } = { x: 6, y: 6 },
): (CountLabelBox & { px: number; py: number })[] {
  const items = source.map((item) => ({ ...item, px: item.x, py: item.y }));
  type Item = CountLabelBox & { px: number; py: number };
  const gap = 8,
    left = (it: CountLabelBox) => it.w / 2 + inset.x,
    right = (it: CountLabelBox) => hostWidth - it.w / 2 - inset.x,
    top = (it: CountLabelBox) => it.h / 2 + inset.y,
    bottom = (it: CountLabelBox) => hostHeight - it.h / 2 - inset.y,
    held = (it: Item, d: number, x: boolean) =>
      !!it.fixed ||
      (x
        ? d < 0
          ? it.px <= left(it) + 0.5
          : d > 0 && it.px >= right(it) - 0.5
        : d < 0
          ? it.py <= top(it) + 0.5
          : d > 0 && it.py >= bottom(it) - 0.5);
  items.forEach((it) => {
    it.px = it.x;
    it.py = it.y;
  });
  for (let n = 0; n < 900; n++) {
    let moved = false;
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!,
          c = items[j]!,
          ox = (a.w + c.w) / 2 + gap - Math.abs(a.px - c.px),
          oy = (a.h + c.h) / 2 + gap - Math.abs(a.py - c.py);
        if (ox <= 0 || oy <= 0 || (a.fixed && c.fixed) || (n > 350 && (a.soft || c.soft))) continue;
        moved = true;
        const sx = (a.px < c.px || (a.px === c.px && i < j) ? -1 : 1) * ox,
          sy = (a.py < c.py || (a.py === c.py && i < j) ? -1 : 1) * oy,
          stuckX = held(a, sx, true) && held(c, -sx, true),
          stuckY = held(a, sy, false) && held(c, -sy, false);
        let x = ox < oy * 1.2;
        if (x ? stuckX && !stuckY : stuckY && !stuckX) x = !x;
        const s = x ? sx : sy,
          ha = held(a, s, x),
          hc = held(c, -s, x),
          wa = ha === hc ? 0.5 : ha ? 0 : 1,
          wc = 1 - wa;
        if (x) {
          a.px += s * wa;
          c.px -= s * wc;
        } else {
          a.py += s * wa;
          c.py -= s * wc;
        }
      }
    items.forEach((it) => {
      if (it.fixed) return;
      if (n > 30 && n < 400) {
        it.px += (it.x - it.px) * 0.02;
        it.py += (it.y - it.py) * 0.02;
      }
      it.px = clamp(it.px, left(it), right(it));
      it.py = clamp(it.py, top(it), bottom(it));
    });
    if (!moved && n > 30) break;
  }
  return items;
}
