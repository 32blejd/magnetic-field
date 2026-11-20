/* All currency operations live here, so a future switch to break_eternity.js touches one file. */
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
