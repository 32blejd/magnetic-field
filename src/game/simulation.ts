import { ANTI_TIER, TIERS, type Tier } from '../data/tiers';
import { ANTI, BOARD, COIN_RADIUS, COMBO, EVENTS, PULL, SPAWN_AREA, SPAWN_TIME, TOUCH_DISTANCE } from '../data/tuning';
import { UPGRADES } from '../data/upgrades';
import { antiUnlocked, comboMult, comboUnlocked, pulseUnlocked } from './abilities';
import { checkGoals } from './goals';
import { earn } from './money';
import { rand } from './rng';
import { getStats, type Stats } from './stats';
import type { Coin, GameEvent, GameState, Vec } from './types';

function rollTier(st: GameState, rarityBonus: number): Tier {
  let x = rand(st);
  for (const t of TIERS) {
    const chance = t.mult > 1 ? t.chance + rarityBonus : t.chance;
    if (x < chance) return t;
    x -= chance;
  }
  return TIERS[TIERS.length - 1]!;
}

function makeCoin(st: GameState, x: number, y: number, angle: number, tier: Tier): Coin {
  const anti = tier.id === 'anti';
  return {
    x, y, dx: Math.cos(angle), dy: Math.sin(angle), age: 0, phase: rand(st) * 6,
    tier: tier.id, mult: tier.mult, speed: anti ? ANTI.speed : tier.mult, pull: tier.pull, anti,
  };
}

/** Regular spawn: may roll an anti-coin, which is first queued as a warning marker. */
function spawnRegular(st: GameState, S: Stats): void {
  const x = BOARD.x + BOARD.w * (SPAWN_AREA.min + rand(st) * SPAWN_AREA.size);
  const y = BOARD.y + BOARD.h * (SPAWN_AREA.min + rand(st) * SPAWN_AREA.size);
  const angle = rand(st) * Math.PI * 2;
  if (antiUnlocked(st) && rand(st) < ANTI.chance) {
    st.warnings.push({ x, y, angle, t: ANTI.warn });
    return;
  }
  st.coins.push(makeCoin(st, x, y, angle, rollTier(st, S.rarity)));
}

function updateTimers(st: GameState, dt: number): void {
  if (st.comboT > 0 && (st.comboT -= dt) <= 0) st.combo = 0;
  if (st.pulseT > 0) st.pulseT -= dt;
  if (st.pulseCd > 0) st.pulseCd -= dt;
  if (st.stunT > 0) st.stunT -= dt;
  if (st.event && (st.event.t -= dt) <= 0) st.event = null;
}

function updateUnlocks(st: GameState, out: GameEvent[]): void {
  for (const u of UPGRADES) {
    if (st.unlocked[u.id] || st.totalEarned < u.unlockAt) continue;
    st.unlocked[u.id] = true;
    st.unlockOrder.push(u.id);
    out.push({ type: 'unlock', id: u.id });
  }
  const features = [['combo', comboUnlocked], ['pulse', pulseUnlocked], ['anti', antiUnlocked]] as const;
  for (const [id, isOn] of features) {
    if (st.features[id] || !isOn(st)) continue;
    st.features[id] = true;
    out.push({ type: 'feature', id });
  }
}

function updateEvents(st: GameState, S: Stats, dt: number, out: GameEvent[]): void {
  if ((st.nextEvent -= dt) > 0) return;
  const [lo, hi] = EVENTS.every;
  st.nextEvent = lo + rand(st) * (hi - lo);
  if (rand(st) < 0.5) {
    st.event = { type: 'burst', t: EVENTS.burst.duration, total: EVENTS.burst.duration };
    out.push({ type: 'burst' });
    return;
  }
  const x = BOARD.x + BOARD.w * (0.3 + rand(st) * 0.4);
  const y = BOARD.y + BOARD.h * (0.3 + rand(st) * 0.4);
  const n = EVENTS.fountain.count, a0 = rand(st) * Math.PI * 2;
  for (let k = 0; k < n; k++) st.coins.push(makeCoin(st, x, y, a0 + (k * Math.PI * 2) / n, rollTier(st, S.rarity))); // ignores capacity
  st.event = { type: 'fountain', t: EVENTS.fountain.banner, total: EVENTS.fountain.banner };
  out.push({ type: 'fountain', x, y });
}

function collect(st: GameState, S: Stats, c: Coin, out: GameEvent[]): void {
  if (c.anti) { // short-circuit: magnet off, combo lost
    st.stunT = ANTI.stun;
    st.combo = 0;
    st.comboT = 0;
    st.stats.anti++;
    out.push({ type: 'anti', coin: c });
    return;
  }
  if (comboUnlocked(st)) {
    st.combo++;
    st.comboT = COMBO.window;
    st.stats.bestCombo = Math.max(st.stats.bestCombo, st.combo);
  }
  const value = S.value * c.mult * comboMult(st.combo);
  earn(st, value);
  if (c.tier !== 'anti') st.stats.caught[c.tier]++;
  out.push({ type: 'pickup', coin: c, value });
}

const outOfBoard = (c: Coin): boolean =>
  c.x < BOARD.x - COIN_RADIUS || c.x > BOARD.x + BOARD.w + COIN_RADIUS ||
  c.y < BOARD.y - COIN_RADIUS || c.y > BOARD.y + BOARD.h + COIN_RADIUS;

/**
 * Advances the game by dt seconds.
 * @param magnet cursor position, or null when the cursor is off the board
 * @param out receives everything that happened (pickups, unlocks, goals…)
 */
export function step(st: GameState, dt: number, magnet: Vec | null, out: GameEvent[] = []): GameEvent[] {
  st.t += dt;
  st.spawnT -= dt;
  updateTimers(st, dt);
  updateUnlocks(st, out);

  const S = getStats(st);
  updateEvents(st, S, dt, out);

  if (st.spawnT <= 0 && st.coins.length < S.capacity) {
    st.spawnT = 1 / S.spawn;
    spawnRegular(st, S);
  }
  for (let i = st.warnings.length - 1; i >= 0; i--) {
    const w = st.warnings[i]!;
    if ((w.t -= dt) > 0) continue;
    st.warnings.splice(i, 1);
    st.coins.push(makeCoin(st, w.x, w.y, w.angle, ANTI_TIER));
  }

  const m = st.stunT > 0 ? null : magnet;
  for (let i = st.coins.length - 1; i >= 0; i--) {
    const c = st.coins[i]!;
    c.age += dt;
    if (c.anti && c.age >= ANTI.life) { st.coins.splice(i, 1); continue; } // expires on its own

    const drift = S.drift * c.speed * dt;
    if (c.age < SPAWN_TIME) { // appearing: already drifting, but can't be pulled or collected yet
      c.x += c.dx * drift;
      c.y += c.dy * drift;
    } else {
      let d = m ? Math.hypot(m.x - c.x, m.y - c.y) : Infinity;
      if (d > TOUCH_DISTANCE) { // move only if not touching yet (also avoids 0/0 when d = 0)
        const R = c.anti ? S.baseRange : S.range; // Pulse doesn't pull anti-coins
        if (m && d < R) {
          const v = S.strength * c.pull * (PULL.base + PULL.bonus * (1 - d / R)) * dt;
          const k = Math.min(v, d) / d;
          c.x += (m.x - c.x) * k;
          c.y += (m.y - c.y) * k;
        } else {
          c.x += c.dx * drift;
          c.y += c.dy * drift;
        }
        d = m ? Math.hypot(m.x - c.x, m.y - c.y) : Infinity;
      }
      if (d <= TOUCH_DISTANCE) {
        st.coins.splice(i, 1);
        collect(st, S, c, out);
        continue;
      }
    }
    if (outOfBoard(c)) {
      st.coins.splice(i, 1);
      if (!c.anti) { st.stats.missed++; out.push({ type: 'miss', coin: c }); }
    }
  }

  checkGoals(st, out);
  return out;
}
