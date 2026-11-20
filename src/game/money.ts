/* All gameplay arithmetic and comparisons on currency live here (costs, buying, earning, coin value, thresholds).
   Other code only stores, saves or formats the values, so a future switch to break_eternity.js mostly touches this file
   (plus the save format, ui/format.ts and the income readout in render/effects.ts). */
import type { UpgradeDef } from '../data/upgrades';
import type { GameState } from './types';

export function costOf(def: UpgradeDef, level: number): number {
  const s = def.steep;
  const extra = s && level >= s.from ? s.mult ** (level - s.from + 1) : 1;
  return Math.round(def.base * def.growth ** level * extra);
}

export const nextCost = (st: GameState, def: UpgradeDef): number => costOf(def, st.levels[def.id]);
export const isMaxed = (st: GameState, def: UpgradeDef): boolean => st.levels[def.id] >= def.max;

export function canBuy(st: GameState, def: UpgradeDef): boolean {
  return st.unlocked[def.id] && !isMaxed(st, def) && st.money >= nextCost(st, def);
}

export function buy(st: GameState, def: UpgradeDef): boolean {
  if (!canBuy(st, def)) return false;
  st.money -= nextCost(st, def);
  st.levels[def.id]++;
  return true;
}

export function earn(st: GameState, amount: number): void {
  st.money += amount;
  st.totalEarned += amount;
}

/** Value of one collected coin. */
export const coinValue = (perCoin: number, tierMult: number, comboMultiplier: number): number => perCoin * tierMult * comboMultiplier;

/** Whether at least `amount` has been earned this run (unlock thresholds). */
export const hasEarned = (st: GameState, amount: number): boolean => st.totalEarned >= amount;

/** Share of `goal` earned this run, 0–1. */
export const earnedShare = (st: GameState, goal: number): number => Math.min(1, st.totalEarned / goal);
