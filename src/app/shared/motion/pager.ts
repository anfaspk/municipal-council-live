export const PAGE_MIN = 4000;

export interface PageStep {

  at: number;

  row: number;
}
export interface PagePlan {
  steps: PageStep[];

  need: number;
}

export function pager(rows: number, fit: number, time: number, min = PAGE_MIN): PagePlan {
  if (fit < 1 || rows <= fit) return { steps: [], need: 0 };
  const pages = Math.ceil(rows / fit),

    slots = pages + 1,
    each = Math.max(min, time / slots),
    steps: PageStep[] = [];
  for (let p = 1; p < pages; p++)
    steps.push({ at: Math.round(p * each), row: Math.min(p * fit, rows - fit) });
  steps.push({ at: Math.round(pages * each), row: 0 });
  return { steps, need: Math.round(slots * each) };
}
