/* Upgrade definitions – pure data. Names and descriptions live in ui/strings.ts.
   Effects are written in terms of progress (level / max), so changing a cap keeps the value at max.
   Cost of buying the next level = round(base × growth^level × steepExtra). */

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
  /** Effect at a given level. */
  fx: (level: number) => number;
}

/** Seconds a basic coin needs to cross half the board height at Coin speed level 0. */
const BASE_CROSS_TIME = 5 / 3 / 0.9 / 0.95; // ≈ 1.95 s

/** Array order = panel order of the starting upgrades; the rest are appended as they unlock. */
export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'value', max: 30, base: 8, growth: 1.58, unlockAt: 0,
    fx: l => { const k = (20 * l) / 30; return Math.round((1 + k) * 1.15 ** k); } }, // 1 → 344 coins per pickup
  { id: 'range', max: 20, base: 4, growth: 1.71, unlockAt: 0,
    fx: l => 30 + 5 * l }, // 30 → 130 px
  { id: 'spawn', max: 20, base: 4, growth: 1.71, unlockAt: 0,
    fx: l => 1.14 ** l }, // 1.00 → 13.74 coins/s
  { id: 'strength', max: 15, base: 6, growth: 2.04, unlockAt: 30,
    fx: l => 0.5 * 1.15 ** ((20 * l) / 15) }, // 0.50× → 8.18×
  { id: 'capacity', max: 15, base: 10, growth: 2.11, unlockAt: 150,
    fx: l => 8 + Math.round((40 * l) / 15) }, // 8 → 48 coins
  { id: 'rarity', max: 10, base: 50, growth: 2.2, steep: { from: 7, mult: 2 }, unlockAt: 1000,
    fx: l => 0.005 * l }, // +0% → +5% added to each rare tier's chance
  { id: 'speed', max: 10, base: 15, growth: 2.94, unlockAt: 3000,
    fx: l => BASE_CROSS_TIME / 0.96 ** ((15 * l) / 10) }, // 1.95 s → 3.60 s to cross half the board
];

export const UPGRADE_BY_ID: Readonly<Record<UpgradeId, UpgradeDef>> = Object.fromEntries(
  UPGRADES.map(u => [u.id, u]),
) as Record<UpgradeId, UpgradeDef>;
