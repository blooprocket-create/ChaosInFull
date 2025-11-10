// Thin compatibility layer after removing old zones file.
// Re-export getZone from worldData to satisfy components still importing '@/src/data/zones'.

import { getZone as getWorldZone, type WorldZone } from './worldData';

export function getZone(key: string): WorldZone | undefined {
  return getWorldZone(key);
}

export type { WorldZone } from './worldData';
