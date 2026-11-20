import { describe, expect, it } from 'vitest';
import { GACHA, LODESTONES } from '../src/data/lodestones';
import { BOARD, STEP } from '../src/data/tuning';
import { canPull, magnetronUnlocked, pull, pullMany } from '../src/game/lodestones';
import { bonuses } from '../src/game/prestige';
import { step } from '../src/game/simulation';
import { createState, emptyMeta } from '../src/game/state';
import { getStats } from '../src/game/stats';
import type { Coin, GameEvent } from '../src/game/types';

const unlocked = (crystals = 0) => createState(3, { ...emptyMeta(), shifts: 1, crystals });

describe('Magnetron', () => {
  it('opens after the first shift and costs 10 crystals per pull', () => {
    expect(magnetronUnlocked(createState())).toBe(false);
    const st = unlocked(25);
    expect(canPull(st, 1)).toBe(true);
    expect(canPull(st, 10)).toBe(false);
    expect(pullMany(st, 10)).toHaveLength(2); // stops when crystals run out
    expect(st.meta.crystals).toBe(5);
  });

  it('has 16 stones and roughly the designed odds', () => {
    expect(LODESTONES).toHaveLength(16);
    const st = unlocked(10 * 5000);
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const r of pullMany(st, 5000)) counts[r.def.rarity]++;
    expect(counts.common / 5000).toBeGreaterThan(0.38);
    expect(counts.common / 5000).toBeLessThan(0.5);
    expect(counts.legendary / 5000).toBeGreaterThan(0.05);
    expect(counts.legendary / 5000).toBeLessThan(0.1);
  });

  it('guarantees an Epic or better on the 20th pull without one', () => {
    const st = unlocked(1000);
    st.meta.pity = GACHA.pity - 1;
    const r = pull(st)!;
    expect(r.pity).toBe(true);
    expect(['epic', 'legendary']).toContain(r.def.rarity);
    expect(st.meta.pity).toBe(0);
  });

  it('levels duplicates up to 3 and refunds crystals after that', () => {
    const st = unlocked(1000);
    for (const l of LODESTONES) st.meta.lodestones[l.id] = GACHA.maxLevel;
    const before = st.meta.crystals;
    const r = pull(st)!;
    expect(r.refund).toBe(GACHA.maxedRefund);
    expect(st.meta.crystals).toBe(before - GACHA.pullCost + GACHA.maxedRefund);
  });

  it('adds coin value, extras and set bonuses to the run', () => {
    const st = createState(1, { ...emptyMeta(), lodestones: { 'iron-common': 3, 'iron-rare': 1, 'iron-epic': 1, 'iron-legendary': 1 } });
    // value: 3×1% + 2% + 3% + 5% = 13%, + Iron set 5% → ×1.18
    expect(getStats(st).value).toBeCloseTo(1.18);
    // range: Iron Epic +2%, Iron Legendary +4%
    expect(bonuses(st.meta).rangeMult).toBeCloseTo(1.06);
  });
});

describe('new Core tree nodes', () => {
  const center = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };
  const quiet = (nodes: Record<string, number>) => {
    const st = createState(1, { ...emptyMeta(), nodes });
    st.spawnT = 1e9; st.nextEvent = 1e9;
    return st;
  };
  const coin = (over: Partial<Coin> = {}): Coin =>
    ({ x: center.x, y: center.y, dx: 1, dy: 0, age: 1, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false, ...over });

  it('Momentum widens the field while the cursor moves fast', () => {
    const st = quiet({ Nb2: 2 });
    const still = getStats(st).baseRange;
    for (let i = 0; i < 60; i++) step(st, STEP, { x: center.x + ((i % 2) ? 10 : -10), y: center.y }); // ~1200 px/s jitter
    expect(getStats(st).baseRange).toBeGreaterThan(still * 1.25);
  });

  it('Combo Shield keeps the combo through one anti-coin every 30 s', () => {
    const st = quiet({ Nb4: 1 });
    st.totalEarned = 5000; st.combo = 8; st.comboT = 1;
    st.coins.push(coin({ tier: 'anti', anti: true, speed: 0, pull: 0.6 }));
    const out = step(st, STEP, center);
    expect(st.combo).toBe(8);
    expect(out.some(e => e.type === 'shield')).toBe(true);
    st.stunT = 0;
    st.coins.push(coin({ tier: 'anti', anti: true, speed: 0, pull: 0.6 }));
    step(st, STEP, center);
    expect(st.combo).toBe(0); // shield on cooldown
  });

  it('Meteor Shower adds a line of fast coins as an event', () => {
    const st = quiet({ Eb5: 1 });
    let found = false;
    for (let k = 0; k < 40 && !found; k++) { // events are random – keep firing until a meteor comes
      st.nextEvent = 0; st.coins = [];
      const out: GameEvent[] = [];
      step(st, STEP, null, out);
      found = out.some(e => e.type === 'meteor');
      if (found) expect(st.coins.length).toBe(12);
    }
    expect(found).toBe(true);
  });

  it('Homing Prisms turn Prism coins toward the magnet', () => {
    const st = quiet({ Wb5: 1 });
    const c = coin({ x: center.x, y: center.y + 150, dx: 1, dy: 0, tier: 'prism', mult: 3, speed: 3, pull: 0.7 });
    st.coins.push(c);
    for (let i = 0; i < 30; i++) step(st, STEP, { x: center.x, y: center.y - 150 });
    expect(c.dy).toBeLessThan(-0.3); // now heading up toward the magnet
  });
});
