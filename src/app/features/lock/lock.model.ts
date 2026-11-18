import { GATE_HASH } from './gate';
import { sha256 } from './sha256';

export const keyHash = (key: string): string => sha256('majlis-gate:' + key.trim().toLowerCase());

export const keyMatches = (key: string): boolean => key.trim() !== '' && keyHash(key) === GATE_HASH;
