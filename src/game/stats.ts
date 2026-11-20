import { BOARD, EVENTS } from '../data/tuning';
import { UPGRADE_BY_ID, type UpgradeId } from '../data/upgrades';
import { bonuses, compoundMult } from './prestige';
import type { GameState } from './types';

/** Cursor speed (logical px/s) at which Momentum gives its full range bonus. */
export const MOMENTUM_FULL_SPEED = 500;

/** Derived parameters – always computed from the state (upgrades + Core tree), never stored. */
export interface Stats {
  value: number;
  /** Current field radius (includes Pulse). */
  range: number;
  /** Field radius without Pulse (anti-coins only feel this one). */
  baseRange: number;
  spawn: number;
  strength: number;
  capacity: number;
  /** Added to both Gold and Prism chance. */
  rarity: number;
  /** Seconds a basic coin needs to cross half the board height. */
  crossTime: number;
  /** Basic coin drift speed (px/s). */
  drift: number;
}

/** Raw effect of an upgrade at its current level (no Core tree bonuses). */
export function upgradeEffect(st: GameState, id: UpgradeId): number {
  return UPGRADE_BY_ID[id].fx(st.levels[id]);
}

export function getStats(st: GameState): Stats {
  const f = (id: UpgradeId) => upgradeEffect(st, id);
  const b = bonuses(st.meta);
  // Momentum: up to +b.momentum range at full cursor speed (500 px/s)
  const baseRange = f('range') * (b.rangeMult + b.momentum * Math.min(1, st.magnetSpeed / MOMENTUM_FULL_SPEED));
  let spawn = f('spawn');
  let capacity = f('capacity');
  if (st.event?.type === 'burst') {
    spawn *= EVENTS.burst.spawnMult;
    capacity *= EVENTS.burst.capMult;
  }
  const crossTime = f('speed');
  return {
    value: f('value') * b.valueMult * compoundMult(st, b),
    range: st.pulseT > 0 ? baseRange * b.pulseRangeMult : baseRange,
    baseRange,
    spawn,
    strength: f('strength'),
    capacity,
    rarity: f('rarity') + b.rareChance,
    crossTime,
    drift: BOARD.h / 2 / crossTime,
  };
}
