import type { GoodTierId } from '../data/tiers';
import type { UpgradeId } from '../data/upgrades';
import type { FeatureId } from '../game/types';

export const CURRENT_VERSION = 4;

/**
 * Saved shape, version 1 (before Polarity Shift). Only primary data – everything else is derived or transient.
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

/** Version 2: adds progress kept across Polarity Shifts. */
export interface SaveV2 extends Omit<SaveV1, 'version'> {
  version: 2;
  meta?: {
    cores?: number;
    coresEarned?: number;
    shifts?: number;
    nodes?: Record<string, number>;
  };
}

/** Version 3: adds the Magnetron (Charge Crystals, Lodestones, pity counter) to meta. */
export interface SaveV3 extends Omit<SaveV2, 'version' | 'meta'> {
  version: 3;
  meta?: NonNullable<SaveV2['meta']> & {
    crystals?: number;
    lodestones?: Record<string, number>;
    pity?: number;
  };
}

/** Version 4 (M5): Auto-shift target in meta; run stats may count Void coins (stats.caught.void – GoodTierId covers it). */
export interface SaveV4 extends Omit<SaveV3, 'version' | 'meta'> {
  version: 4;
  meta?: NonNullable<SaveV3['meta']> & {
    autoShift?: number;
  };
}

export type SaveData = SaveV4;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArray = (v: unknown): boolean => Array.isArray(v) && v.every(x => typeof x === 'string');
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v);

function isV1Shape(raw: Record<string, unknown>): boolean {
  return (
    isNum(raw.money) && isNum(raw.totalEarned) && isObj(raw.levels) &&
    optional(raw.savedAt, isNum) && optional(raw.rng, isNum) && optional(raw.t, isNum) &&
    optional(raw.unlocked, isObj) && optional(raw.unlockOrder, isStrArray) && optional(raw.features, isObj) &&
    optional(raw.goalsDone, isObj) && optional(raw.stats, isObj) &&
    (!isObj(raw.stats) || optional(raw.stats.caught, isObj)) &&
    optional(raw.nextEvent, isNum) && optional(raw.pulseCd, isNum)
  );
}

function isMetaShape(meta: unknown): boolean {
  if (meta === undefined) return true;
  if (!isObj(meta)) return false;
  return optional(meta.cores, isNum) && optional(meta.coresEarned, isNum) && optional(meta.shifts, isNum) && optional(meta.nodes, isObj) &&
    optional(meta.crystals, isNum) && optional(meta.lodestones, isObj) && optional(meta.pity, isNum) && optional(meta.autoShift, isNum);
}

/**
 * Brings any older save up to the current version. Returns null for unreadable data or an unknown (e.g. newer) version.
 * When the save shape changes: bump CURRENT_VERSION, add a SaveVn type and a step here, and a test.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw) || !isNum(raw.version)) return null;
  if (raw.version === 1) { // v1 → v4: no Polarity Shift / Magnetron progress yet
    return isV1Shape(raw) ? { ...(raw as unknown as SaveV1), version: 4, meta: undefined } : null;
  }
  // v2 → v3 → v4: every field added since v1 (meta, Magnetron, Auto-shift, Void stats) is optional and defaults to empty
  if (raw.version === 2 || raw.version === 3 || raw.version === 4) {
    return isV1Shape(raw) && isMetaShape(raw.meta) ? ({ ...(raw as unknown as SaveV4), version: 4 }) : null;
  }
  return null;
}
