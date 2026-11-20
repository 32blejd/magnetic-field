import type { FeatureId, RunStats } from '../game/types';
import type { UpgradeId } from '../data/upgrades';

export const CURRENT_VERSION = 1;

/** Saved shape, version 1. Only primary data – everything else is derived or transient. */
export interface SaveV1 {
  version: 1;
  savedAt: number;
  rng: number;
  t: number;
  money: number;
  totalEarned: number;
  levels: Partial<Record<UpgradeId, number>>;
  unlocked: Partial<Record<UpgradeId, boolean>>;
  unlockOrder: UpgradeId[];
  features: Partial<Record<FeatureId, boolean>>;
  goalsDone: Record<string, boolean>;
  stats: RunStats;
  nextEvent: number;
  pulseCd: number;
}

export type SaveData = SaveV1;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Brings any older save up to the current version. Returns null for unreadable data.
 * When the save shape changes: bump CURRENT_VERSION, add a SaveV2 type and a v1 → v2 step here, and a test.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw) || !isNum(raw.version)) return null;
  if (raw.version === 1) {
    if (!isNum(raw.money) || !isNum(raw.totalEarned) || !isObj(raw.levels) || !isObj(raw.stats)) return null;
    return raw as unknown as SaveV1;
  }
  return null; // unknown (e.g. newer) version
}
