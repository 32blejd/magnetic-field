import { EVENTS } from '../data/tuning';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { GameState, LifetimeStats, MetaState } from './types';

export const emptyLife = (): LifetimeStats =>
  ({ time: 0, earned: 0, caught: { basic: 0, gold: 0, prism: 0, void: 0 }, bestCombo: 0, goals: 0, pulls: 0, antiDodged: 0, fastest: 0 });
export const emptyMeta = (): MetaState =>
  ({ cores: 0, coresEarned: 0, shifts: 0, nodes: {}, crystals: 0, lodestones: {}, pity: 0, autoShift: 0, autoBuyOff: false, life: emptyLife() });

/**
 * A fresh run.
 * @param meta progress kept across Polarity Shifts (Cores, Core tree)
 * @param startMoney coins to start with (Head Start node)
 */
export function createState(seed = 7, meta: MetaState = emptyMeta(), startMoney = 0): GameState {
  const levels = {} as Record<UpgradeId, number>;
  const unlocked = {} as Record<UpgradeId, boolean>;
  for (const u of UPGRADES) {
    levels[u.id] = 0;
    unlocked[u.id] = u.unlockAt === 0;
  }
  return {
    meta,
    rng: seed | 0,
    t: 0,
    money: startMoney,
    totalEarned: 0,
    levels,
    unlocked,
    unlockOrder: UPGRADES.filter(u => u.unlockAt === 0).map(u => u.id),
    features: { combo: false, pulse: false, anti: false },
    goalsDone: {},
    stats: { caught: { basic: 0, gold: 0, prism: 0, void: 0 }, missed: 0, anti: 0, bestCombo: 0, events: 0 },
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
    lastMagnet: null,
    magnetSpeed: 0,
    shieldCd: 0,
    drones: [],
    autoBuyT: 0,
  };
}
