/* Quick tutorial: short tips during the first runs, one at a time, each shown until the player does the thing (or for a few
   seconds) and never again. Pure – main.ts keeps the timer and marks tips as seen; which ones were seen is a setting. */
import { pulseUnlocked } from '../game/abilities';
import { magnetronUnlocked } from '../game/lodestones';
import { canShift, treeUnlocked } from '../game/prestige';
import { canBuy } from '../game/shop';
import type { GameState } from '../game/types';
import { visibleRows } from './layout';

export const TIP_IDS = ['move', 'buy', 'keys', 'pulse', 'menu', 'tree', 'shift', 'gacha'] as const;
export type TipId = (typeof TIP_IDS)[number];

/** Seconds a tip stays up if the player doesn't do what it says (null = until done). */
export const TIP_TIMEOUT: Record<TipId, number | null> = {
  move: null, buy: null, keys: 8, pulse: 12, menu: 9, tree: 9, shift: null, gacha: 10,
};

const caughtEver = (st: GameState): number => {
  const c = st.meta.life.caught, r = st.stats.caught;
  return c.basic + c.gold + c.prism + c.void + r.basic + r.gold + r.prism + r.void;
};
const boughtThisRun = (st: GameState): boolean => Object.values(st.levels).some(l => l > 0);

/** Whether a tip is relevant right now (besides not being seen yet). */
const WHEN: Record<TipId, (st: GameState) => boolean> = {
  move: st => caughtEver(st) === 0,
  buy: st => !boughtThisRun(st) && visibleRows(st).some(r => !r.locked && canBuy(st, r.def)),
  keys: st => boughtThisRun(st),
  pulse: st => pulseUnlocked(st) && st.pulseCd <= 0,
  menu: st => st.t > 100,
  tree: st => st.meta.shifts === 0 && treeUnlocked(st) && !canShift(st),
  shift: st => st.meta.shifts === 0 && canShift(st),
  gacha: st => magnetronUnlocked(st) && st.meta.life.pulls === 0,
};

/** The tip to show now: the first relevant one not seen yet, in tutorial order. */
export function activeTip(st: GameState, seen: readonly string[]): TipId | null {
  return TIP_IDS.find(id => !seen.includes(id) && WHEN[id](st)) ?? null;
}
