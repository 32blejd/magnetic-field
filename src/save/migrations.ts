import type { GoodTierId } from '../data/tiers';
import type { UpgradeId } from '../data/upgrades';
import type { FeatureId } from '../game/types';

export const CURRENT_VERSION = 3;

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

export type SaveData = SaveV3;

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
    optional(meta.crystals, isNum) && optional(meta.lodestones, isObj) && optional(meta.pity, isNum);
}

/**
 * Brings any older save up to the current version. Returns null for unreadable data or an unknown (e.g. newer) version.
 * When the save shape changes: bump CURRENT_VERSION, add a SaveVn type and a step here, and a test.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw) || !isNum(raw.version)) return null;
  if (raw.version === 1) { // v1 → v3: no Polarity Shift / Magnetron progress yet
    return isV1Shape(raw) ? { ...(raw as unknown as SaveV1), version: 3, meta: undefined } : null;
  }
  if (raw.version === 2 || raw.version === 3) { // v2 → v3: the new meta fields are optional and default to empty
    return isV1Shape(raw) && isMetaShape(raw.meta) ? ({ ...(raw as unknown as SaveV3), version: 3 }) : null;
  }
  return null;
}
