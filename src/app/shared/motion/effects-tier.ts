import { computed, signal } from '@angular/core';
import { reducedMotion } from './reduced-motion';

const lite = signal(false);
export const liteFx = lite.asReadonly();
export const setLiteFx = (on: boolean): void => lite.set(on);

export const ornaments = computed(() => !reducedMotion() && !lite());
