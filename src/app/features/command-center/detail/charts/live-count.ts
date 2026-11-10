import { Provider } from '@angular/core';
import { CountUpGroup } from '../../../../shared/motion/count-up.directive';

export const LIVE_COUNT_UPS: Provider = {
  provide: CountUpGroup,
  useFactory: () => Object.assign(new CountUpGroup(), { live: true }),
};
