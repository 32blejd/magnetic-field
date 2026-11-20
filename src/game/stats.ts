import { BOARD, EVENTS, PULSE } from '../data/tuning';
import { UPGRADE_BY_ID, type UpgradeId } from '../data/upgrades';
import type { GameState } from './types';

/** Derived parameters – always computed from the state, never stored. */
export interface Stats {
  value: number;
  /** Current field radius (includes Pulse). */
  range: number;
  /** Field radius without Pulse (anti-coins only feel this one). */
  baseRange: number;
  spawn: number;
  strength: number;
  capacity: number;
  rarity: number;
  /** Seconds a basic coin needs to cross half the board height. */
  crossTime: number;
  /** Basic coin drift speed (px/s). */
  drift: number;
}

export function upgradeEffect(st: GameState, id: UpgradeId): number {
  return UPGRADE_BY_ID[id].fx(st.levels[id]);
}

export function getStats(st: GameState): Stats {
  const f = (id: UpgradeId) => upgradeEffect(st, id);
  const baseRange = f('range');
  let spawn = f('spawn');
  let capacity = f('capacity');
  if (st.event?.type === 'burst') {
    spawn *= EVENTS.burst.spawnMult;
    capacity *= EVENTS.burst.capMult;
  }
  const crossTime = f('speed');
  return {
    value: f('value'),
    range: st.pulseT > 0 ? baseRange * PULSE.rangeMult : baseRange,
    baseRange,
    spawn,
    strength: f('strength'),
    capacity,
    rarity: f('rarity'),
    crossTime,
    drift: BOARD.h / 2 / crossTime,
  };
}
