import { describe, expect, it } from 'vitest';
import { AUTO_SHIFT_TARGETS } from '../src/data/prestige';
import { VOID_TIER } from '../src/data/tiers';
import { ANTI, AUTO, BOARD, CHAIN, INTEREST, PULSE, SATELLITES, STEP } from '../src/data/tuning';
import { parseNodes, readDebugOptions } from '../src/debug';
import { satellitePositions } from '../src/game/helpers';
import { goalReward } from '../src/game/money';
import {
  autoShiftAt, autoShiftDue, bonuses, commitAutoShift, nextAutoShiftTarget, shiftGoal, startDraft,
} from '../src/game/prestige';
import { rollTier, step } from '../src/game/simulation';
import { createState, emptyMeta } from '../src/game/state';
import { getStats } from '../src/game/stats';
import type { Coin, GameEvent, GameState } from '../src/game/types';
import { deserialize, serialize } from '../src/save/save';

const center = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };

function coin(over: Partial<Coin> = {}): Coin {
  return { x: center.x, y: center.y, dx: 1, dy: 0, age: 1, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false, ...over };
}
const anti = (over: Partial<Coin> = {}) => coin({ tier: 'anti', anti: true, speed: 0, pull: ANTI.pull, ...over });

/** A state with the given Core tree nodes that won't spawn anything on its own. */
function quiet(nodes: Record<string, number> = {}): GameState {
  const st = createState(1, { ...emptyMeta(), nodes, shifts: 1 });
  st.spawnT = 1e9;
  st.nextEvent = 1e9;
  return st;
}

describe('Void Coin (E keystone)', () => {
  it('is only rolled with the keystone, at ~0.3%, and ignores Rarity bonuses', () => {
    const roll = (voidCoin: boolean, rarity = 0) => {
      const st = createState(5);
      let n = 0;
      for (let i = 0; i < 200_000; i++) if (rollTier(st, rarity, voidCoin).id === 'void') n++;
      return n / 200_000;
    };
    expect(roll(false)).toBe(0);
    expect(roll(true)).toBeGreaterThan(0.0025);
    expect(roll(true)).toBeLessThan(0.0035);
    expect(roll(true, 0.2)).toBeLessThan(0.0035);
  });

  it('pays ×10, drifts ×1.5 and counts as a caught coin', () => {
    expect(VOID_TIER).toMatchObject({ mult: 10, speed: 1.5 });
    const st = quiet({ Ekey: 1 });
    st.coins.push(coin({ tier: 'void', mult: 10, speed: 1.5, pull: 0.6 }));
    step(st, STEP, center);
    expect(st.money).toBe(10);
    expect(st.stats.caught.void).toBe(1);
  });
});

describe('Chain Reaction (E)', () => {
  it('collects good coins near a caught Prism, chains through Prisms, skips anti-coins and spawning coins', () => {
    const st = quiet({ Eb4: 1 });
    const far = coin({ x: center.x + 300, dx: 0 });
    st.coins.push(
      coin({ tier: 'prism', mult: 3 }), // caught by the magnet
      coin({ x: center.x + CHAIN.radius - 5, dx: 0, tier: 'prism', mult: 3 }), // in range → chains again
      coin({ x: center.x + CHAIN.radius * 1.8, dx: 0 }), // only reached by the second Prism's chain
      coin({ x: center.x - 40, dx: 0, age: 0.1 }), // still spawning
      anti({ x: center.x, y: center.y + 60 }),
      far,
    );
    const out = step(st, STEP, center);
    expect(out.filter(e => e.type === 'chain')).toHaveLength(2);
    expect(st.stats.caught).toMatchObject({ prism: 2, basic: 1 });
    expect(st.coins.map(c => (c.anti ? 'anti' : c.age < 0.25 ? 'spawning' : c === far ? 'far' : 'other')).sort())
      .toEqual(['anti', 'far', 'spawning']);
  });

  it('does nothing without the node', () => {
    const st = quiet();
    st.coins.push(coin({ tier: 'prism', mult: 3 }), coin({ x: center.x + 50, dx: 0 }));
    step(st, STEP, center);
    expect(st.coins).toHaveLength(1);
  });
});

describe('Interest (S keystone)', () => {
  it('pays 1% of held coins every 10 s, capped at 10 s of perfect income', () => {
    const st = quiet({ Skey: 1 });
    st.money = 500; // cap at the start: 10 s × 1 coin × 1/s = 10 → 1% of 500 = 5 is below it
    let out: GameEvent[] = [];
    for (let k = 0; k < Math.round(INTEREST.every / STEP) - 1; k++) out = out.concat(step(st, STEP, null));
    expect(out.some(e => e.type === 'interest')).toBe(false);
    out = step(st, STEP * 2, null);
    expect(out.find(e => e.type === 'interest')).toMatchObject({ amount: 5 });
    expect(st.money).toBeCloseTo(505);
    expect(st.totalEarned).toBeCloseTo(5);

    st.money = 1e6; // 1% = 10,000 → capped
    st.t = INTEREST.every * 2 - STEP / 2;
    out = step(st, STEP, null);
    const cap = goalReward(getStats(st).value, 1, INTEREST.capSeconds);
    expect(out.find(e => e.type === 'interest')).toMatchObject({ amount: cap });
  });

  it('does nothing without the node', () => {
    const st = quiet();
    st.money = 1000;
    for (let k = 0; k < 11 / STEP; k++) step(st, STEP, null);
    expect(st.money).toBe(1000);
  });
});

describe('Satellites (N keystone)', () => {
  it('orbit on the edge of the field, one per level, and vanish without a magnet', () => {
    const st = quiet({ Nkey: 3 });
    const S = getStats(st);
    const sats = satellitePositions(st, center, S.baseRange, bonuses(st.meta).satellites);
    expect(sats).toHaveLength(3);
    for (const p of sats) expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeCloseTo(S.baseRange * SATELLITES.orbit);
    expect(satellitePositions(st, null, S.baseRange, 3)).toEqual([]);
  });

  it('pull in and collect good coins outside the main field, but leave anti-coins alone', () => {
    const st = quiet({ Nkey: 1 });
    st.t = 0; // the only satellite starts at angle 0: straight right of the magnet
    const S = getStats(st);
    const satX = center.x + S.baseRange * SATELLITES.orbit;
    const outside = satX + S.baseRange * SATELLITES.range * 0.8; // outside the main field, inside the satellite's
    st.coins.push(coin({ x: outside, dx: 0, speed: 0 }));
    st.coins.push(anti({ x: satX + 3, y: center.y })); // on the satellite, just outside the main field
    for (let k = 0; k < 120 && st.coins.length > 1; k++) { st.t = 0; step(st, STEP, center); }
    expect(st.stats.caught.basic).toBe(1);
    expect(st.coins.filter(c => c.anti)).toHaveLength(1);
    expect(st.stunT).toBe(0);
  });

  it('are gone while the magnet is short-circuited', () => {
    const st = quiet({ Nkey: 1 });
    st.stunT = 1;
    const S = getStats(st);
    st.coins.push(coin({ x: center.x + S.baseRange * SATELLITES.orbit, dx: 0, speed: 0 }));
    step(st, STEP, center);
    expect(st.coins).toHaveLength(1);
  });

  it('leave the main magnet working as before: a coin touching it is collected once', () => {
    const st = quiet({ Nkey: 3, Wkey: 3 });
    st.coins.push(coin());
    step(st, STEP, center);
    expect(st.money).toBe(1);
    expect(st.stats.caught.basic).toBe(1);
  });
});

describe('Drones (W keystone)', () => {
  it('one per level; they chase and collect coins with no magnet on the board', () => {
    const st = quiet({ Wkey: 2 });
    st.coins.push(coin({ x: BOARD.x + 60, y: BOARD.y + 60, dx: 0, speed: 0 }));
    step(st, STEP, null);
    expect(st.drones).toHaveLength(2);
    for (let k = 0; k < 10 / STEP && st.coins.length; k++) step(st, STEP, null);
    expect(st.coins).toHaveLength(0);
    expect(st.stats.caught.basic).toBe(1);
  });

  it('ignore anti-coins and keep working while the magnet is short-circuited', () => {
    const st = quiet({ Wkey: 1 });
    st.stunT = 5;
    st.coins.push(anti({ x: center.x, y: center.y - 40 }));
    step(st, STEP, null);
    const d = st.drones[0]!;
    st.coins[0]!.x = d.x; st.coins[0]!.y = d.y; // sitting right on the drone
    st.coins.push(coin({ x: d.x + 30, y: d.y, dx: 0, speed: 0 }));
    for (let k = 0; k < 120; k++) step(st, STEP, null);
    expect(st.coins.filter(c => !c.anti)).toHaveLength(0);
    expect(st.stats.anti).toBe(0);
  });

  it('are not saved (transient) and come back after loading', () => {
    const st = quiet({ Wkey: 1 });
    step(st, STEP, null);
    expect(serialize(st)).not.toContain('drones');
    const loaded = deserialize(serialize(st))!;
    expect(loaded.drones).toEqual([]);
    step(loaded, STEP, null);
    expect(loaded.drones).toHaveLength(1);
  });
});

describe('Auto-buyer (W)', () => {
  it('buys the lowest cost × weight (Value counts as cheaper), one level per 0.25 s', () => {
    const st = quiet({ Wb2: 1 });
    st.money = 100;
    const out = step(st, STEP, null);
    expect(out.filter(e => e.type === 'autobuy')).toEqual([{ type: 'autobuy', id: 'value' }]); // 7 × 0.33 beats range/spawn at 4
    expect(st.money).toBe(93);
    for (let k = 0; k < Math.floor(AUTO.buyEvery / STEP) - 1; k++) step(st, STEP, null);
    expect(st.levels.value + st.levels.range + st.levels.spawn).toBe(1); // still waiting
    step(st, STEP, null); step(st, STEP, null);
    expect(st.levels.value).toBe(2); // 11 × 0.33 ≈ 3.6 still beats 4
  });

  it('saves up for Value instead of buying a cheaper upgrade', () => {
    const st = quiet({ Wb2: 1 });
    st.money = 5; // range costs 4, Value 7
    for (let k = 0; k < 60; k++) step(st, STEP, null);
    expect(st.money).toBe(5);
    st.money = 7;
    step(st, STEP, null);
    expect(st.levels.value).toBe(1);
    st.levels.value = 30; // maxed Value is skipped
    st.money = 5;
    for (let k = 0; k <= AUTO.buyEvery / STEP; k++) step(st, STEP, null); // past the 0.25 s pause after a purchase
    expect(st.levels.range).toBe(1);
  });

  it('never buys locked or unaffordable upgrades, and does nothing without the node', () => {
    const st = quiet({ Wb2: 1 });
    st.money = 3;
    step(st, STEP, null);
    expect(st.money).toBe(3);
    const plain = quiet();
    plain.money = 1000;
    step(plain, STEP, null);
    expect(plain.money).toBe(1000);
  });

  it('does nothing while paused, resumes when turned back on, and the pause survives a shift', () => {
    const st = quiet({ Wb2: 1 });
    st.money = 100;
    st.meta.autoBuyOff = true;
    for (let k = 0; k < 60; k++) step(st, STEP, null);
    expect(st.money).toBe(100);
    st.meta.autoBuyOff = false;
    step(st, STEP, null);
    expect(st.money).toBe(93);
    st.meta.autoBuyOff = true;
    commitAutoShift(st);
    expect(st.meta.autoBuyOff).toBe(true);
  });
});

describe('save version 5', () => {
  it('migrates a version 4 save with the Auto-buyer running, and round-trips the pause', () => {
    const v4 = { version: 4, money: 5, totalEarned: 5, levels: {}, meta: { shifts: 1, nodes: { Wb2: 1 }, autoShift: 2 } };
    const st = deserialize(JSON.stringify(v4))!;
    expect(st.meta.autoBuyOff).toBe(false);
    expect(st.meta.autoShift).toBe(2);
    st.meta.autoBuyOff = true;
    expect(JSON.parse(serialize(st)).version).toBe(5);
    expect(deserialize(serialize(st))!.meta.autoBuyOff).toBe(true);
  });

  it('rejects a pause flag of the wrong type', () => {
    const base = JSON.parse(serialize(createState()));
    base.meta.autoBuyOff = 'yes';
    expect(deserialize(JSON.stringify(base))).toBeNull();
  });
});

describe('Auto-pulse (W)', () => {
  const ring = (n: number, dist: number) => Array.from({ length: n }, (_, k) => {
    const a = (k * Math.PI * 2) / n;
    return coin({ x: center.x + Math.cos(a) * dist, y: center.y + Math.sin(a) * dist, dx: 0, speed: 0 });
  });

  it('fires when it is ready and 5+ good coins are within the Pulse radius', () => {
    const st = quiet({ Wb4: 1 });
    st.totalEarned = PULSE.unlockAt;
    const dist = getStats(st).baseRange * 2; // outside the field, inside Pulse range (×3)
    st.coins.push(...ring(AUTO.pulseCoins - 1, dist), anti({ x: center.x, y: center.y - dist }));
    expect(step(st, STEP, center).some(e => e.type === 'autopulse')).toBe(false); // 4 good coins + an anti-coin
    st.coins.push(...ring(1, dist));
    expect(step(st, STEP, center).some(e => e.type === 'autopulse')).toBe(true);
    expect(st.pulseCd).toBeGreaterThan(0);
  });

  it('needs the node, an unlocked Pulse and an active magnet', () => {
    const noNode = quiet();
    noNode.totalEarned = PULSE.unlockAt;
    noNode.coins.push(...ring(8, 50));
    expect(step(noNode, STEP, center).some(e => e.type === 'autopulse')).toBe(false);
    const locked = quiet({ Wb4: 1 });
    locked.coins.push(...ring(8, 50));
    expect(step(locked, STEP, center).some(e => e.type === 'autopulse')).toBe(false);
    const away = quiet({ Wb4: 1 });
    away.totalEarned = PULSE.unlockAt;
    away.coins.push(...ring(8, 50));
    expect(step(away, STEP, null).some(e => e.type === 'autopulse')).toBe(false);
  });
});

describe('Auto-shift (W)', () => {
  it('cycles off → ×1 → ×2 → ×4 → off', () => {
    expect(AUTO_SHIFT_TARGETS).toEqual([0, 1, 2, 4]);
    expect([0, 1, 2, 4].map(nextAutoShiftTarget)).toEqual([1, 2, 4, 0]);
  });

  it('is due only with the node, a target and the target earned', () => {
    const st = createState(1, { ...emptyMeta(), shifts: 1, nodes: { Wb6: 1 } });
    const goal = shiftGoal(st.meta);
    st.totalEarned = goal * 3;
    expect(autoShiftAt(st)).toBeNull(); // off by default
    st.meta.autoShift = 4;
    expect(autoShiftAt(st)).toBe(goal * 4);
    expect(autoShiftDue(st)).toBe(false);
    st.meta.autoShift = 2;
    expect(autoShiftDue(st)).toBe(true);
    const noNode = createState(1, { ...emptyMeta(), shifts: 1, autoShift: 1 });
    noNode.totalEarned = goal * 10;
    expect(autoShiftDue(noNode)).toBe(false);
  });

  it('banks the Cores, keeps the tree and the setting, and starts a new run', () => {
    const st = createState(1, { ...emptyMeta(), shifts: 1, cores: 3, nodes: { Wb6: 1, Wb1: 1 }, autoShift: 1 });
    st.totalEarned = shiftGoal(st.meta);
    st.money = 999;
    const gained = startDraft(st).gained;
    expect(commitAutoShift(st)).toBe(gained);
    expect(st.meta).toMatchObject({ shifts: 2, cores: 3 + gained, coresEarned: gained, nodes: { Wb6: 1, Wb1: 1 }, autoShift: 1 });
    expect(st.totalEarned).toBe(0);
    expect(st.money).toBe(0);
  });
});

describe('save version 4', () => {
  it('migrates a version 3 save: Auto-shift off, no Void coins', () => {
    const v3 = { version: 3, money: 5, totalEarned: 5, levels: {}, stats: { caught: { basic: 2 } }, meta: { shifts: 1, crystals: 4 } };
    const st = deserialize(JSON.stringify(v3))!;
    expect(st.meta.autoShift).toBe(0);
    expect(st.meta.crystals).toBe(4);
    expect(st.stats.caught).toEqual({ basic: 2, gold: 0, prism: 0, void: 0 });
  });

  it('drops an Auto-shift target that is not one of the options, and rejects a wrong type', () => {
    const base = JSON.parse(serialize(createState()));
    base.meta.autoShift = 3;
    expect(deserialize(JSON.stringify(base))!.meta.autoShift).toBe(0);
    base.meta.autoShift = 'x4';
    expect(deserialize(JSON.stringify(base))).toBeNull();
  });
});

describe('debug ?nodes=', () => {
  it('parses ids with optional levels, clamps them and skips unknown ids', () => {
    expect(parseNodes(null)).toBeNull();
    expect(parseNodes('Nkey:3,Wb2,bogus,core,Ekey:9')).toEqual({ Nkey: 3, Wb2: 1, Ekey: 1 });
    expect(parseNodes('all')!.Wkey).toBe(3);
  });
});

describe('debug ?speed=', () => {
  it('defaults to 1 and clamps to 1–50', () => {
    expect(readDebugOptions('').speed).toBe(1);
    expect(readDebugOptions('?speed=4').speed).toBe(4);
    expect(readDebugOptions('?speed=999').speed).toBe(50);
    expect(readDebugOptions('?speed=0.1').speed).toBe(1);
    expect(readDebugOptions('?speed=abc').speed).toBe(1);
  });
});
