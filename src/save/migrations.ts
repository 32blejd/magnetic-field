import type { GoodTierId } from '../data/tiers';
import type { UpgradeId } from '../data/upgrades';
import type { FeatureId } from '../game/types';

export const CURRENT_VERSION = 1;

/**
 * Saved shape, version 1. Only primary data – everything else is derived or transient.
 * Only the currency and levels are required; anything else that is missing falls back to a fresh-run default.
 */
export interface SaveV1 {
  version: 1;
  money: number;
  totalEarned: number;
  levels: Partial<Record<UpgradeId, number>>;
  savedAt?: number;
  rng?: number;
  t?: number;
  unlocked?: Partial<Record<UpgradeId, boolean>>;
  unlockOrder?: string[];
  features?: Partial<Record<FeatureId, boolean>>;
  goalsDone?: Record<string, boolean>;
  stats?: {
    caught?: Partial<Record<GoodTierId, number>>;
    missed?: number;
    anti?: number;
    bestCombo?: number;
  };
  nextEvent?: number;
  pulseCd?: number;
}

export type SaveData = SaveV1;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArray = (v: unknown): boolean => Array.isArray(v) && v.every(x => typeof x === 'string');
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);

function isV1(raw: Record<string, unknown>): boolean {
  return (
    isNum(raw.money) && isNum(raw.totalEarned) && isObj(raw.levels) &&
    optional(raw.savedAt, isNum) && optional(raw.rng, isNum) && optional(raw.t, isNum) &&
    optional(raw.unlocked, isObj) && optional(raw.unlockOrder, isStrArray) && optional(raw.features, isObj) &&
    optional(raw.goalsDone, isObj) && optional(raw.stats, isObj) &&
    (!isObj(raw.stats) || optional(raw.stats.caught, isObj)) &&
    optional(raw.nextEvent, isNum) && optional(raw.pulseCd, isNum)
  );
}

/**
 * Brings any older save up to the current version. Returns null for unreadable data or an unknown (e.g. newer) version.
 * When the save shape changes: bump CURRENT_VERSION, add a SaveV2 type and a v1 → v2 step here, and a test.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw) || !isNum(raw.version)) return null;
  if (raw.version === 1) return isV1(raw) ? (raw as unknown as SaveV1) : null;
  return null;
}
