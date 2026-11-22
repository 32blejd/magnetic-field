/* Upgrade definitions – pure data. Names and descriptions live in ui/strings.ts.
   Effects are written in terms of progress (level / max), so changing a cap keeps the value at max.
   Cost of buying the next level = round(base × growth^level × steepExtra).
   Break the Compass adds levels above the cap: each adds `over` to the effect, and costs OVERCAP_GROWTH× the previous level. */

export const UPGRADE_IDS = ['value', 'range', 'spawn', 'strength', 'capacity', 'rarity', 'speed'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface UpgradeDef {
  id: UpgradeId;
  max: number;
  base: number;
  growth: number;
  /** Extra cost multiplier for the last levels: buying level from+1 and above costs mult^(level − from + 1) more. */
  steep?: { from: number; mult: number };
  /** Total earned this run needed to unlock (0 = available from the start). */
  unlockAt: number;
  /** Effect at a given level (0…max). Use effectAt() for any level – it also covers levels above the cap. */
  fx: (level: number) => number;
  /** Effect added by every level above the cap (Break the Compass). */
  over: number;
}

/** Cost growth per level above the cap. */
export const OVERCAP_GROWTH = 1.15;

/** Effect at any level: the formula up to the cap, then +`over` per extra level. */
export const effectAt = (def: UpgradeDef, level: number): number =>
  level <= def.max ? def.fx(level) : def.fx(def.max) + def.over * (level - def.max);

/** Seconds a basic coin needs to cross half the board height at Coin speed level 0. */
const BASE_CROSS_TIME = 5 / 3 / 0.9 / 0.95; // ≈ 1.95 s

/** Array order = panel order of the starting upgrades; the rest are appended as they unlock. */
export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'value', max: 30, base: 7.2, growth: 1.53, unlockAt: 0,
    fx: l => { const k = (20 * l) / 30; return Math.round((1 + k) * 1.15 ** k); }, over: 40 }, // 1 → 344 coins per pickup (+40 per extra level)
  { id: 'range', max: 20, base: 4, growth: 1.73, unlockAt: 0,
    fx: l => 30 + 5 * l, over: 2 }, // 30 → 130 px (+2 px per extra level)
  { id: 'spawn', max: 20, base: 4, growth: 1.73, unlockAt: 0,
    fx: l => 1.14 ** l, over: 0.25 }, // 1.00 → 13.74 coins/s (+0.25 per extra level)
  { id: 'strength', max: 15, base: 6, growth: 2.07, unlockAt: 30,
    fx: l => 0.5 * 1.15 ** ((20 * l) / 15), over: 0.3 }, // 0.50× → 8.18× (+0.3× per extra level)
  { id: 'capacity', max: 15, base: 10, growth: 2.14, unlockAt: 150,
    fx: l => 8 + Math.round((75 * l) / 15), over: 2 }, // 8 → 83 coins (+5 per level, +2 per extra level)
  { id: 'rarity', max: 10, base: 50, growth: 2.2, steep: { from: 7, mult: 2 }, unlockAt: 1000,
    fx: l => 0.005 * l, over: 0.002 }, // +0% → +5% added to each rare tier's chance (+0.2% per extra level)
  { id: 'speed', max: 10, base: 15, growth: 2.98, unlockAt: 3000,
    fx: l => BASE_CROSS_TIME / 0.96 ** ((15 * l) / 10), over: 0.1 }, // 1.95 s → 3.60 s to cross half the board (+0.1 s per extra level)
];

export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeDef>> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u]),
) as Record<UpgradeId, UpgradeDef>;
