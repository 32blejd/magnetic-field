/* All gameplay arithmetic and comparisons on currency live here and in game/shop.ts (which adds Core tree discounts).
   Other code only stores, saves or formats the values, so a future switch to break_eternity.js mostly touches these files
   (plus the save format, ui/format.ts and the income readout in render/effects.ts). */
import type { UpgradeDef } from '../data/upgrades';
import type { GameState } from './types';

/** Base cost of buying `level + 1` of an upgrade (before Core tree discounts). */
export function costOf(def: UpgradeDef, level: number): number {
  const s = def.steep;
  const extra = s && level >= s.from ? s.mult ** (level - s.from + 1) : 1;
  return Math.round(def.base * def.growth ** level * extra);
}

/** Applies a cost multiplier (e.g. Discount) to a cost. */
export const discounted = (cost: number, mult: number): number => Math.max(1, Math.round(cost * mult));

export const canAfford = (st: GameState, cost: number): boolean => st.money >= cost;

export function spend(st: GameState, cost: number): void {
  st.money -= cost;
}

export function earn(st: GameState, amount: number): void {
  st.money += amount;
  st.totalEarned += amount;
}

/** Mini-goal reward: `seconds` of perfect income (every spawned coin caught at the current value). */
export const goalReward = (perCoin: number, spawnPerSecond: number, seconds: number): number =>
  Math.round(perCoin * spawnPerSecond * seconds);

/** Interest payout: `rate` of the held coins, but never more than `cap`. */
export const interestOn = (held: number, rate: number, cap: number): number => Math.max(0, Math.min(held * rate, cap));

/** Value of one collected coin. */
export const coinValue = (perCoin: number, tierMult: number, comboMultiplier: number): number => perCoin * tierMult * comboMultiplier;

/** Whether at least `amount` has been earned this run (unlock thresholds). */
export const hasEarned = (st: GameState, amount: number): boolean => st.totalEarned >= amount;

/** Share of `goal` earned this run, 0–1. */
export const earnedShare = (st: GameState, goal: number): number => Math.min(1, st.totalEarned / goal);
