import { GOOD_TIERS } from '../data/tiers';
import { ANTI, COMBO, PULSE } from '../data/tuning';
import type { UpgradeDef } from '../data/upgrades';
import { hasEarned } from './money';
import { bonuses } from './prestige';
import type { GameState } from './types';

/** Earned this run needed to unlock an upgrade (Fast Track halves it). */
export const upgradeUnlockAt = (st: GameState, def: UpgradeDef): number => def.unlockAt * bonuses(st.meta).unlockMult;

export const comboUnlocked = (st: GameState): boolean => hasEarned(st, COMBO.unlockAt * bonuses(st.meta).unlockMult);
export const pulseUnlocked = (st: GameState): boolean => hasEarned(st, PULSE.unlockAt * bonuses(st.meta).unlockMult);
/** Anti-coins are a hazard, so Fast Track doesn't bring them earlier. */
export const antiUnlocked = (st: GameState): boolean => hasEarned(st, ANTI.unlockAt);

/** Combo multiplier for a combo count: +step per chained pickup after the first, capped. */
export function comboMult(combo: number, max: number = COMBO.max): number {
  return Math.min(max, 1 + COMBO.step * Math.max(0, combo - 1));
}

export function triggerPulse(st: GameState): boolean {
  if (!pulseUnlocked(st) || st.pulseCd > 0) return false;
  st.pulseT = PULSE.duration;
  st.pulseCd = bonuses(st.meta).pulseCooldown;
  return true;
}

/** Share of good coins caught vs. escaped this run (0–1). */
export function catchRate(st: GameState): number {
  const caught = GOOD_TIERS.reduce((n, t) => n + st.stats.caught[t], 0);
  const total = caught + st.stats.missed;
  return total ? caught / total : 0;
}
