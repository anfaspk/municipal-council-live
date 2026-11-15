export type RegionNeed = readonly number[] | 'all';

export class RegionNeeds {
  private readonly owners = new Map<object, RegionNeed>();

  get size(): number {
    return this.owners.size;
  }
  set(owner: object, need: RegionNeed): void {
    this.owners.set(owner, need);
  }
  delete(owner: object): boolean {
    return this.owners.delete(owner);
  }
  wanted(listed: readonly number[]): number[] {
    const all = [...this.owners.values()];
    if (all.includes('all')) return [...listed];
    const want = new Set(all.flatMap((ids) => (ids === 'all' ? [] : ids)));
    return listed.filter((id) => want.has(id));
  }
}

export function withIds(set: ReadonlySet<number>, ids: Iterable<number>): ReadonlySet<number> {
  let next: Set<number> | null = null;
  for (const id of ids)
    if (!set.has(id)) {
      next ??= new Set(set);
      next.add(id);
    }
  return next ?? set;
}
