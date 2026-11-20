import { EVENTS } from '../data/tuning';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { GameState } from './types';

export function createState(seed = 7): GameState {
  const levels = {} as Record<UpgradeId, number>;
  const unlocked = {} as Record<UpgradeId, boolean>;
  for (const u of UPGRADES) {
    levels[u.id] = 0;
    unlocked[u.id] = u.unlockAt === 0;
  }
  return {
    rng: seed | 0,
    t: 0,
    money: 0,
    totalEarned: 0,
    levels,
    unlocked,
    unlockOrder: UPGRADES.filter(u => u.unlockAt === 0).map(u => u.id),
    features: { combo: false, pulse: false, anti: false },
    goalsDone: {},
    stats: { caught: { basic: 0, gold: 0, prism: 0 }, missed: 0, anti: 0, bestCombo: 0 },
    nextEvent: EVENTS.first,
    pulseCd: 0,

    coins: [],
    warnings: [],
    spawnT: 0,
    combo: 0,
    comboT: 0,
    pulseT: 0,
    stunT: 0,
    event: null,
  };
}
