/* Buying upgrades during a run. Costs include the Core tree Discount. */
import type { UpgradeDef } from '../data/upgrades';
import { canAfford, costOf, discounted, spend } from './money';
import { bonuses } from './prestige';
import type { GameState } from './types';

/** Market Day (SE): upgrades cost half during a Burst event. */
const MARKET_DAY = 0.5;

export function nextCost(st: GameState, def: UpgradeDef): number {
  const b = bonuses(st.meta);
  return discounted(costOf(def, st.levels[def.id]), b.costMult * (b.marketDay && st.event?.type === 'burst' ? MARKET_DAY : 1));
}

/** Highest level an upgrade can reach: its cap, +50 after Break the Compass. */
export const levelCap = (st: GameState, def: UpgradeDef): number => def.max + bonuses(st.meta).extraLevels;

export const isMaxed = (st: GameState, def: UpgradeDef): boolean => st.levels[def.id] >= levelCap(st, def);

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
