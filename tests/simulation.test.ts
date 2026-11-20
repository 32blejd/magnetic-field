import { describe, expect, it } from 'vitest';
import { ANTI, BOARD, PULSE, SPAWN_TIME, STEP } from '../src/data/tuning';
import { UPGRADE_BY_ID } from '../src/data/upgrades';
import { comboMult, triggerPulse } from '../src/game/abilities';
import { buy } from '../src/game/money';
import { step } from '../src/game/simulation';
import { createState } from '../src/game/state';
import type { Coin, GameEvent, GameState } from '../src/game/types';

const center = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };

function coin(over: Partial<Coin> = {}): Coin {
  return { x: center.x, y: center.y, dx: 1, dy: 0, age: 1, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false, ...over };
}

/** A state that won't spawn anything on its own during the test. */
function quietState(): GameState {
  const st = createState(1);
  st.spawnT = 1e9;
  st.nextEvent = 1e9;
  return st;
}

describe('simulation', () => {
  it('collects a coin touching the magnet, even exactly at its center', () => {
    const st = quietState();
    st.coins.push(coin());
    const out = step(st, STEP, center);
    expect(st.coins).toHaveLength(0);
    expect(st.money).toBe(1);
    expect(out.some(e => e.type === 'pickup')).toBe(true);
  });

  it('cannot collect a coin during its spawn animation, but it already drifts', () => {
    const st = quietState();
    st.coins.push(coin({ age: 0 }));
    step(st, STEP, center);
    expect(st.coins).toHaveLength(1);
    expect(st.coins[0]!.x).toBeGreaterThan(center.x);
    expect(st.coins[0]!.age).toBeLessThan(SPAWN_TIME);
  });

  it('counts a coin that leaves the board as missed', () => {
    const st = quietState();
    st.coins.push(coin({ x: BOARD.x + BOARD.w + 11.5 }));
    step(st, STEP, null);
    expect(st.coins).toHaveLength(0);
    expect(st.stats.missed).toBe(1);
  });

  it('pays rare coins their multiplier', () => {
    const st = quietState();
    st.coins.push(coin({ tier: 'prism', mult: 3 }));
    step(st, STEP, center);
    expect(st.money).toBe(3);
    expect(st.stats.caught.prism).toBe(1);
  });

  it('short-circuits the magnet on an anti-coin and resets the combo', () => {
    const st = quietState();
    st.combo = 5; st.comboT = 1;
    st.coins.push(coin({ tier: 'anti', anti: true, speed: ANTI.speed, pull: ANTI.pull }));
    step(st, STEP, center);
    expect(st.stunT).toBeGreaterThan(1);
    expect(st.combo).toBe(0);
    expect(st.money).toBe(0);
    // while stunned, a good coin at the magnet is not collected
    st.coins.push(coin());
    step(st, STEP, center);
    expect(st.coins).toHaveLength(1);
  });

  it('removes anti-coins after their lifetime', () => {
    const st = quietState();
    st.coins.push(coin({ tier: 'anti', anti: true, speed: 0, age: ANTI.life - STEP / 2 }));
    step(st, STEP, null);
    expect(st.coins).toHaveLength(0);
    expect(st.stats.missed).toBe(0);
  });

  it('Pulse extends the range for good coins but not for anti-coins', () => {
    const st = quietState();
    st.totalEarned = PULSE.unlockAt;
    const dist = 60; // outside base range (30), inside pulse range (90)
    st.coins.push(coin({ x: center.x + dist, dx: 0 }), coin({ x: center.x - dist, dx: 0, tier: 'anti', anti: true, speed: 0, pull: ANTI.pull }));
    expect(triggerPulse(st)).toBe(true);
    step(st, STEP, center);
    const good = st.coins.find(c => !c.anti)!, anti = st.coins.find(c => c.anti)!;
    expect(good.x).toBeLessThan(center.x + dist); // pulled in
    expect(anti.x).toBe(center.x - dist); // untouched
  });

  it('builds a combo only after it is unlocked', () => {
    const st = quietState();
    st.coins.push(coin(), coin());
    step(st, STEP, center);
    expect(st.combo).toBe(0);
    st.totalEarned = 5000;
    st.coins.push(coin(), coin());
    step(st, STEP, center);
    expect(st.combo).toBe(2);
    expect(comboMult(11)).toBe(2);
    expect(comboMult(50)).toBe(2);
  });

  it('turns an anti-coin warning into an anti-coin after the warning time', () => {
    const st = quietState();
    st.warnings.push({ x: center.x, y: center.y, angle: 0, t: ANTI.warn });
    for (let t = 0; t < ANTI.warn - 0.05; t += STEP) step(st, STEP, null);
    expect(st.coins).toHaveLength(0);
    for (let k = 0; k < 10; k++) step(st, STEP, null);
    expect(st.coins.filter(c => c.anti)).toHaveLength(1);
  });

  it('unlocks upgrades by total earned, in threshold order', () => {
    const st = quietState();
    expect(st.unlockOrder).toEqual(['value', 'range', 'spawn']);
    st.totalEarned = 1000;
    const out: GameEvent[] = [];
    step(st, STEP, null, out);
    expect(st.unlockOrder).toEqual(['value', 'range', 'spawn', 'strength', 'capacity', 'rarity']);
    expect(out.filter(e => e.type === 'unlock')).toHaveLength(3);
  });

  it('only lets you buy unlocked upgrades you can afford', () => {
    const st = quietState();
    st.money = 1000;
    expect(buy(st, UPGRADE_BY_ID.strength)).toBe(false); // locked
    expect(buy(st, UPGRADE_BY_ID.value)).toBe(true);
    expect(st.money).toBe(1000 - 8);
    expect(st.levels.value).toBe(1);
  });
});
