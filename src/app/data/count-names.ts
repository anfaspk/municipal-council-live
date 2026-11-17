import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CountNames {
  private readonly _govs = signal<ReadonlyMap<number, string>>(new Map());
  private readonly _wils = signal<ReadonlyMap<number, string>>(new Map());
  private readonly listed = new Set<number>();

  gov(id: number): string {
    return this._govs().get(id) ?? '';
  }
  wil(id: number): string {
    return this._wils().get(id) ?? '';
  }
  hasGovs(): boolean {
    return this._govs().size > 0;
  }
  hasWils(gov: number): boolean {
    return this.listed.has(gov);
  }

  take(
    govs: Iterable<readonly [number, string]>,
    wils: Iterable<readonly [number, string]> = [],
    of?: number,
  ): void {
    if (of !== undefined) this.listed.add(of);
    const g = merged(this._govs(), govs),
      w = merged(this._wils(), wils);
    if (g) this._govs.set(g);
    if (w) this._wils.set(w);
  }
}

function merged(
  into: ReadonlyMap<number, string>,
  add: Iterable<readonly [number, string]>,
): Map<number, string> | null {
  let out: Map<number, string> | null = null;
  for (const [id, name] of add)
    if (name && into.get(id) !== name) (out ??= new Map(into)).set(id, name);
  return out;
}
