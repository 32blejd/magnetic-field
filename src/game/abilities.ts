import { ANTI, COMBO, PULSE } from '../data/tuning';
import type { GameState } from './types';

export const comboUnlocked = (st: GameState): boolean => st.totalEarned >= COMBO.unlockAt;
export const pulseUnlocked = (st: GameState): boolean => st.totalEarned >= PULSE.unlockAt;
export const antiUnlocked = (st: GameState): boolean => st.totalEarned >= ANTI.unlockAt;

/** Combo multiplier for a combo count: +step per chained pickup after the first, capped. */
export function comboMult(combo: number): number {
  return Math.min(COMBO.max, 1 + COMBO.step * Math.max(0, combo - 1));
}

export function triggerPulse(st: GameState): boolean {
  if (!pulseUnlocked(st) || st.pulseCd > 0) return false;
  st.pulseT = PULSE.duration;
  st.pulseCd = PULSE.cooldown;
  return true;
}

/** Share of good coins caught vs. escaped this run (0–1). */
export function catchRate(st: GameState): number {
  const c = st.stats.caught;
  const caught = c.basic + c.gold + c.prism;
  const total = caught + st.stats.missed;
  return total ? caught / total : 0;
}
