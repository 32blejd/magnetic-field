import { CRYSTALS } from '../data/lodestones';
import { ANTI_TIER, TIERS, type CoinKind, type Tier } from '../data/tiers';
import { ANTI, BOARD, COIN_RADIUS, EVENTS, PULL, SPAWN_AREA, SPAWN_TIME, TOUCH_DISTANCE } from '../data/tuning';
import { UPGRADES } from '../data/upgrades';
import { antiUnlocked, comboMult, comboUnlocked, pulseUnlocked, upgradeUnlockAt } from './abilities';
import { checkGoals } from './goals';
import { coinValue, earn, hasEarned } from './money';
import { COMBO_SHIELD_COOLDOWN, bonuses, type Bonuses } from './prestige';
import { rand } from './rng';
import { getStats, type Stats } from './stats';
import type { Coin, GameEvent, GameState, Vec } from './types';

const GOLD = TIERS.find(t => t.id === 'gold')!;
/** Meteor Shower: coins in the line and their speed multiplier. */
const METEOR = { count: 12, speed: 1.6, banner: 2 };

function rollTier(st: GameState, rarityBonus: number): Tier {
  let x = rand(st);
  for (const t of TIERS) {
    const chance = t.mult > 1 ? t.chance + rarityBonus : t.chance;
    if (x < chance) return t;
    x -= chance;
  }
  return TIERS[TIERS.length - 1]!;
}

function makeCoin(st: GameState, x: number, y: number, angle: number, tier: CoinKind): Coin {
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

function gainCrystal(st: GameState, x: number, y: number, out: GameEvent[], amount = 1): void {
  st.meta.crystals += amount;
  out.push({ type: 'crystal', amount, x, y });
}

function updateTimers(st: GameState, dt: number): void {
  if (st.comboT > 0 && (st.comboT -= dt) <= 0) st.combo = 0;
  if (st.pulseT > 0) st.pulseT -= dt;
  if (st.pulseCd > 0) st.pulseCd -= dt;
  if (st.stunT > 0) st.stunT -= dt;
  if (st.shieldCd > 0) st.shieldCd -= dt;
  if (st.event && (st.event.t -= dt) <= 0) st.event = null;
}

/** Smoothed cursor speed for Momentum. */
function updateMagnetSpeed(st: GameState, magnet: Vec | null, dt: number): void {
  if (!magnet) { st.lastMagnet = null; st.magnetSpeed *= Math.max(0, 1 - dt * 6); return; }
  const inst = st.lastMagnet ? Math.hypot(magnet.x - st.lastMagnet.x, magnet.y - st.lastMagnet.y) / dt : 0;
  st.magnetSpeed += (inst - st.magnetSpeed) * Math.min(1, dt * 8);
  st.lastMagnet = { x: magnet.x, y: magnet.y };
}

function updateUnlocks(st: GameState, out: GameEvent[]): void {
  for (const u of UPGRADES) {
    if (st.unlocked[u.id] || !hasEarned(st, upgradeUnlockAt(st, u))) continue;
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

function spawnMeteorShower(st: GameState, S: Stats): void {
  // a line of fast coins enters from one side and crosses the board
  const side = Math.floor(rand(st) * 4), n = METEOR.count;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5 + (rand(st) - 0.5) * 0.6) / n, jitter = (rand(st) - 0.5) * 0.2;
    const [x, y, angle] =
      side === 0 ? [BOARD.x + 14, BOARD.y + BOARD.h * f, 0 + jitter] :
      side === 1 ? [BOARD.x + BOARD.w - 14, BOARD.y + BOARD.h * f, Math.PI + jitter] :
      side === 2 ? [BOARD.x + BOARD.w * f, BOARD.y + 14, Math.PI / 2 + jitter] :
                   [BOARD.x + BOARD.w * f, BOARD.y + BOARD.h - 14, -Math.PI / 2 + jitter];
    const c = makeCoin(st, x, y, angle, rollTier(st, S.rarity));
    c.speed *= METEOR.speed;
    st.coins.push(c);
  }
}

function updateEvents(st: GameState, S: Stats, b: Bonuses, dt: number, out: GameEvent[]): void {
  if ((st.nextEvent -= dt) > 0) return;
  const [lo, hi] = EVENTS.every;
  st.nextEvent = (lo + rand(st) * (hi - lo)) / b.eventRateMult;
  gainCrystal(st, BOARD.x + BOARD.w / 2, BOARD.y + 100, out, 1);
  const kinds = b.meteorShower ? 3 : 2, pick = Math.floor(rand(st) * kinds);
  if (pick === 0) {
    st.event = { type: 'burst', t: EVENTS.burst.duration, total: EVENTS.burst.duration };
    out.push({ type: 'burst' });
  } else if (pick === 1) {
    const x = BOARD.x + BOARD.w * (0.3 + rand(st) * 0.4);
    const y = BOARD.y + BOARD.h * (0.3 + rand(st) * 0.4);
    const n = EVENTS.fountain.count, a0 = rand(st) * Math.PI * 2;
    for (let k = 0; k < n; k++) { // ignores capacity; Golden Fountain makes them all Gold
      const tier = b.goldenFountain ? GOLD : rollTier(st, S.rarity);
      st.coins.push(makeCoin(st, x, y, a0 + (k * Math.PI * 2) / n, tier));
    }
    st.event = { type: 'fountain', t: EVENTS.fountain.banner, total: EVENTS.fountain.banner };
    out.push({ type: 'fountain', x, y });
  } else {
    spawnMeteorShower(st, S);
    st.event = { type: 'meteor', t: METEOR.banner, total: METEOR.banner };
    out.push({ type: 'meteor' });
  }
}

function collect(st: GameState, S: Stats, b: Bonuses, c: Coin, out: GameEvent[]): void {
  if (c.anti) { // short-circuit: magnet off; combo lost unless Combo Shield is ready
    st.stunT = b.stunTime;
    st.stats.anti++;
    out.push({ type: 'anti', coin: c });
    if (b.comboShield && st.shieldCd <= 0 && st.combo > 0) {
      st.shieldCd = COMBO_SHIELD_COOLDOWN;
      st.comboT = b.comboWindow + b.stunTime; // survive the short circuit
      out.push({ type: 'shield', x: c.x, y: c.y });
    } else {
      st.combo = 0;
      st.comboT = 0;
    }
    return;
  }
  if (comboUnlocked(st)) {
    st.combo++;
    st.comboT = b.comboWindow;
    st.stats.bestCombo = Math.max(st.stats.bestCombo, st.combo);
  }
  const tierValue = c.tier === 'prism' ? b.prismValue : c.mult; // Prism Resonance: ×4 value (speed stays ×3)
  const value = coinValue(S.value, tierValue, comboMult(st.combo, b.comboMax));
  earn(st, value);
  if (c.tier !== 'anti') st.stats.caught[c.tier]++;
  out.push({ type: 'pickup', coin: c, value });
  if (c.tier === 'prism' && rand(st) < CRYSTALS.prismChance + b.crystalFind) gainCrystal(st, c.x, c.y - 20, out);
}

const outOfBoard = (c: Coin): boolean =>
  c.x < BOARD.x - COIN_RADIUS || c.x > BOARD.x + BOARD.w + COIN_RADIUS ||
  c.y < BOARD.y - COIN_RADIUS || c.y > BOARD.y + BOARD.h + COIN_RADIUS;

/** Homing Prisms: turn the drift direction toward the magnet. */
function steerToward(c: Coin, m: Vec, dt: number): void {
  const d = Math.hypot(m.x - c.x, m.y - c.y);
  if (d < 1) return;
  const k = Math.min(1, 1.2 * dt);
  c.dx += ((m.x - c.x) / d - c.dx) * k;
  c.dy += ((m.y - c.y) / d - c.dy) * k;
  const n = Math.hypot(c.dx, c.dy) || 1;
  c.dx /= n; c.dy /= n;
}

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
  updateMagnetSpeed(st, magnet, dt);

  const S = getStats(st);
  const b = bonuses(st.meta);
  updateEvents(st, S, b, dt, out);

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
          if (m && c.tier === 'prism' && b.homingPrisms) steerToward(c, m, dt);
          c.x += c.dx * drift;
          c.y += c.dy * drift;
        }
        d = m ? Math.hypot(m.x - c.x, m.y - c.y) : Infinity;
      }
      if (d <= TOUCH_DISTANCE) {
        st.coins.splice(i, 1);
        collect(st, S, b, c, out);
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
