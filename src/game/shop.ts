/* Buying upgrades during a run. Costs include the Core tree Discount. */
import type { UpgradeDef } from '../data/upgrades';
import { canAfford, costOf, discounted, spend } from './money';
import { bonuses } from './prestige';
import type { GameState } from './types';

export const nextCost = (st: GameState, def: UpgradeDef): number =>
  discounted(costOf(def, st.levels[def.id]), bonuses(st.meta).costMult);

export const isMaxed = (st: GameState, def: UpgradeDef): boolean => st.levels[def.id] >= def.max;

export function canBuy(st: GameState, def: UpgradeDef): boolean {
  return st.unlocked[def.id] && !isMaxed(st, def) && canAfford(st, nextCost(st, def));
}

export function buy(st: GameState, def: UpgradeDef): boolean {
  if (!canBuy(st, def)) return false;
  spend(st, nextCost(st, def));
  st.levels[def.id]++;
  return true;
}

/** Buys as many levels as possible (Bulk Buy). Returns the number of levels bought. */
export function buyMax(st: GameState, def: UpgradeDef): number {
  let n = 0;
  while (buy(st, def)) n++;
  return n;
}
