import { describe, expect, it } from 'vitest';
import { ANTI, BOARD, STEP } from '../src/data/tuning';
import { pull } from '../src/game/lodestones';
import { commitShift, shiftGoal, startDraft } from '../src/game/prestige';
import { step } from '../src/game/simulation';
import { createState, emptyLife, emptyMeta } from '../src/game/state';
import type { Coin, GameState } from '../src/game/types';
import { CURRENT_VERSION } from '../src/save/migrations';
import { deserialize, serialize } from '../src/save/save';

const center = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };
const coin = (over: Partial<Coin> = {}): Coin =>
  ({ x: center.x, y: center.y, dx: 1, dy: 0, age: 1, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false, ...over });
function quiet(): GameState {
  const st = createState(1, { ...emptyMeta(), shifts: 1 });
  st.spawnT = 1e9;
  st.nextEvent = 1e9;
  return st;
}

describe('lifetime stats', () => {
  it('count play time, earnings, catches by tier and the best combo', () => {
    const st = quiet();
    st.totalEarned = st.meta.life.earned = 10_000; // combo unlocked
    st.coins.push(coin({ tier: 'gold', mult: 2 }));
    step(st, STEP, center);
    const life = st.meta.life;
    expect(life.time).toBeCloseTo(STEP);
    expect(life.caught.gold).toBe(1);
    expect(life.earned).toBeGreaterThan(10_000);
    expect(life.bestCombo).toBe(1);
  });

  it('count mini-goals, pulls, events and dodged anti-coins', () => {
    const st = quiet();
    st.stats.caught.basic = 9;
    st.coins.push(coin());
    step(st, STEP, center); // 10th coin → the first coins goal
    expect(st.meta.life.goals).toBe(1);
    st.meta.crystals = 10;
    pull(st);
    expect(st.meta.life.pulls).toBe(1);
    st.coins.push(coin({ tier: 'anti', anti: true, speed: 0, age: ANTI.life, x: BOARD.x + 40 }));
    st.nextEvent = 0;
    step(st, STEP, null);
    expect(st.meta.life.antiDodged).toBe(1);
    expect(st.stats.events).toBe(1);
  });

  it('remember the fastest run to its goal', () => {
    const st = quiet();
    st.t = 300;
    st.totalEarned = shiftGoal(st.meta) - 1;
    st.coins.push(coin());
    step(st, STEP, center);
    expect(st.meta.life.fastest).toBeCloseTo(300 + STEP);
    st.meta.life.fastest = 100; // a slower run doesn't overwrite it
    st.t = 400; st.totalEarned = shiftGoal(st.meta) - 1; st.coins.push(coin());
    step(st, STEP, center);
    expect(st.meta.life.fastest).toBe(100);
  });

  it('survive a Polarity Shift and the save', () => {
    const st = quiet();
    st.meta.life = { ...emptyLife(), time: 3600, earned: 5e9, goals: 40, fastest: 95 };
    st.totalEarned = shiftGoal(st.meta);
    commitShift(st, startDraft(st));
    expect(st.meta.life.goals).toBe(40);
    const back = deserialize(serialize(st))!;
    expect(back.meta.life).toEqual(st.meta.life);
  });
});

describe('save version 6', () => {
  it('migrates a version 5 save with zero lifetime stats', () => {
    const v5 = { version: 5, money: 5, totalEarned: 5, levels: {}, meta: { shifts: 3 }, stats: { missed: 4 } };
    const st = deserialize(JSON.stringify(v5))!;
    expect(st.meta.life).toEqual(emptyLife());
    expect(st.stats.events).toBe(0);
    expect(st.stats.missed).toBe(4);
    expect(JSON.parse(serialize(st)).version).toBe(CURRENT_VERSION);
    expect(CURRENT_VERSION).toBe(6);
  });

  it('rejects lifetime stats of the wrong type', () => {
    const base = JSON.parse(serialize(createState()));
    base.meta.life = 'lots';
    expect(deserialize(JSON.stringify(base))).toBeNull();
  });
});
