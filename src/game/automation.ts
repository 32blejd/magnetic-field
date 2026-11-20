/* Automation nodes that run inside the simulation step: Auto-buyer and Auto-pulse. (Auto-shift lives in game/prestige.ts –
   it restarts the run, so main.ts triggers it between steps.) */
import { AUTO, SPAWN_TIME } from '../data/tuning';
import { UPGRADES } from '../data/upgrades';
import { triggerPulse } from './abilities';
import type { Bonuses } from './prestige';
import { buy, canBuy, nextCost } from './shop';
import type { GameEvent, GameState, Vec } from './types';

/** Auto-buyer: buys the cheapest affordable upgrade, at most one level per AUTO.buyEvery seconds. */
export function autoBuy(st: GameState, b: Bonuses, dt: number, out: GameEvent[]): void {
  if (!b.autoBuy || (st.autoBuyT -= dt) > 0) return;
  st.autoBuyT = 0;
  let best = null, bestCost = Infinity;
  for (const u of UPGRADES) {
    if (!canBuy(st, u)) continue;
    const cost = nextCost(st, u);
    if (cost < bestCost) { bestCost = cost; best = u; }
  }
  if (!best || !buy(st, best)) return;
  st.autoBuyT = AUTO.buyEvery;
  out.push({ type: 'autobuy', id: best.id });
}

/** Good coins that a Pulse would reach right now. */
export function coinsInPulseRange(st: GameState, magnet: Vec, pulseRange: number): number {
  let n = 0;
  for (const c of st.coins) if (!c.anti && c.age >= SPAWN_TIME && Math.hypot(c.x - magnet.x, c.y - magnet.y) < pulseRange) n++;
  return n;
}

/**
 * Auto-pulse: fires Pulse when it's ready and AUTO.pulseCoins+ good coins are inside the Pulse radius.
 * @param magnet the active magnet (null while off the board or short-circuited)
 * @returns true when it fired
 */
export function autoPulse(st: GameState, b: Bonuses, magnet: Vec | null, baseRange: number, out: GameEvent[]): boolean {
  if (!b.autoPulse || !magnet || st.pulseCd > 0) return false;
  const range = baseRange * b.pulseRangeMult;
  if (coinsInPulseRange(st, magnet, range) < AUTO.pulseCoins || !triggerPulse(st)) return false;
  out.push({ type: 'autopulse', x: magnet.x, y: magnet.y, range });
  return true;
}
