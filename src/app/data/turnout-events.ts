import { StatsEvents } from '../domain/stats/diff';

export interface TurnoutEvents extends StatsEvents {
  villages: { wid: number };
  village: { vid: number };
  complete: undefined;
}
export type TurnoutEvent = {
  [K in keyof TurnoutEvents]: { type: K } & (TurnoutEvents[K] extends undefined
    ? unknown
    : TurnoutEvents[K]);
}[keyof TurnoutEvents];
