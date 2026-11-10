import { National } from '../../../../domain/stats/turnout';

export const natTurnout = (national: National): number | null =>
  !national.unread.includes('registered') && national.registered > 0 ? national.turnout : null;
