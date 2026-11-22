/* Helper magnets from the Core tree keystones: Satellites (orbit the cursor) and Drones (roam the board on their own).
   They pull and collect good coins like the main magnet, but ignore anti-coins and are not affected by Pulse. */
import { BOARD, COIN_RADIUS, DRONES, SATELLITES, TOUCH_DISTANCE, TWIN } from '../data/tuning';
import type { Bonuses } from './prestige';
import type { Stats } from './stats';
import type { GameState, Vec } from './types';

export interface HelperMagnet {
  x: number;
  y: number;
  /** Field radius. */
  range: number;
  /** Distance at which a coin counts as touching it. */
  touch: number;
}

const touchOf = (radius: number): number => radius + COIN_RADIUS * 0.6;

/** Satellite positions around the magnet, evenly spaced and turning with the run clock. Empty without a magnet. */
export function satellitePositions(st: GameState, magnet: Vec | null, baseRange: number, count: number): Vec[] {
  if (!magnet || count <= 0) return [];
  const r = baseRange * SATELLITES.orbit, a0 = st.t * SATELLITES.spin;
  return Array.from({ length: count }, (_, k) => {
    const a = a0 + (k * Math.PI * 2) / count;
    return { x: magnet.x + Math.cos(a) * r, y: magnet.y + Math.sin(a) * r };
  });
}

/** Where drone `k` of `n` appears: a small ring around the board centre. */
function droneHome(k: number, n: number): Vec {
  const a = -Math.PI / 2 + (k * Math.PI * 2) / Math.max(1, n);
  return { x: BOARD.x + BOARD.w / 2 + Math.cos(a) * 40, y: BOARD.y + BOARD.h / 2 + Math.sin(a) * 40 };
}

/**
 * Moves the drones: each one flies toward the nearest good coin no other drone has claimed and stays put when there is none.
 * Keeps the number of drones equal to `count`.
 */
export function updateDrones(st: GameState, count: number, dt: number, speedMult = 1): void {
  if (st.drones.length > count) st.drones.length = count;
  while (st.drones.length < count) st.drones.push(droneHome(st.drones.length, count));
  const claimed = new Set<number>();
  for (const d of st.drones) {
    let best = -1, bestD = Infinity;
    st.coins.forEach((c, i) => {
      if (c.anti || claimed.has(i)) return;
      const dist = Math.hypot(c.x - d.x, c.y - d.y);
      if (dist < bestD) { bestD = dist; best = i; }
    });
    if (best < 0) continue;
    claimed.add(best);
    const c = st.coins[best]!, step = Math.min(bestD, DRONES.speed * speedMult * dt);
    if (bestD > 0) { d.x += ((c.x - d.x) / bestD) * step; d.y += ((c.y - d.y) / bestD) * step; }
    d.x = Math.min(Math.max(d.x, BOARD.x), BOARD.x + BOARD.w);
    d.y = Math.min(Math.max(d.y, BOARD.y), BOARD.y + BOARD.h);
  }
}

/** Twin Magnet: the magnet's position mirrored through the board centre. */
export const twinPosition = (m: Vec): Vec => ({ x: 2 * BOARD.x + BOARD.w - m.x, y: 2 * BOARD.y + BOARD.h - m.y });

/**
 * All helper magnets active right now. Satellites and the Twin Magnet need the main magnet (they vanish while it's off or
 * short-circuited). Assembly Line scales every helper field; Drone Link lets Pulse scale them too.
 */
export function helperMagnets(st: GameState, magnet: Vec | null, S: Stats, b: Bonuses): HelperMagnet[] {
  const out: HelperMagnet[] = [];
  const scale = b.helperRangeMult * (b.droneLink && st.pulseT > 0 ? b.pulseRangeMult : 1);
  for (const p of satellitePositions(st, magnet, S.baseRange, b.satellites)) {
    out.push({ x: p.x, y: p.y, range: S.baseRange * SATELLITES.range * scale, touch: touchOf(SATELLITES.radius) });
  }
  for (const d of st.drones) out.push({ x: d.x, y: d.y, range: S.baseRange * DRONES.range * scale, touch: touchOf(DRONES.radius) });
  if (b.twinMagnet && magnet) {
    const p = twinPosition(magnet);
    out.push({ x: p.x, y: p.y, range: S.baseRange * TWIN.range * scale, touch: TOUCH_DISTANCE });
  }
  return out;
}

/** The helper whose field holds the point (the nearest one if several), or null. */
export function helperPulling(helpers: readonly HelperMagnet[], p: Vec): { h: HelperMagnet; d: number } | null {
  let best: { h: HelperMagnet; d: number } | null = null;
  for (const h of helpers) {
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    if (d < h.range && (!best || d < best.d)) best = { h, d };
  }
  return best;
}

export const touchesHelper = (helpers: readonly HelperMagnet[], p: Vec): boolean =>
  helpers.some(h => Math.hypot(h.x - p.x, h.y - p.y) <= h.touch);
