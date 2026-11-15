import type { Type } from '@angular/core';

export const loadKit: (() => Promise<Type<unknown>>) | null = () =>
  import('./shared/ui/kit/kit.component').then((m) => m.KitComponent);
