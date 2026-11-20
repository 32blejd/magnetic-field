import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/data/goals';
import { checkGoals, nextGoal } from '../src/game/goals';
import { createState } from '../src/game/state';
import type { GameEvent } from '../src/game/types';
import { S } from '../src/ui/strings';

describe('mini-goals', () => {
  it('match the agreed list', () => {
    expect(GOALS.map(g => g.id)).toEqual([
      'coins-10', 'coins-100', 'coins-1000', 'coins-10000',
      'anti-1',
      'gold-10', 'gold-50', 'gold-100',
      'prism-3', 'prism-7', 'prism-11', 'prism-49',
    ]);
  });

  it('count all good coins for the coin goals and complete each goal once', () => {
    const st = createState();
    st.stats.caught = { basic: 5, gold: 3, prism: 2 };
    const out: GameEvent[] = [];
    checkGoals(st, out);
    expect(out.filter(e => e.type === 'goal').map(e => e.type === 'goal' && e.goal.id)).toEqual(['coins-10']);
    checkGoals(st, out);
    expect(out.filter(e => e.type === 'goal')).toHaveLength(1);
    expect(st.meta.crystals).toBe(1); // +1 Charge Crystal per goal
    expect(nextGoal(st, 'coins')?.target).toBe(100);
  });

  it('track gold, prism and anti separately', () => {
    const st = createState();
    st.stats.caught.gold = 50;
    st.stats.caught.prism = 7;
    st.stats.anti = 1;
    const out: GameEvent[] = [];
    checkGoals(st, out);
    expect(out.filter(e => e.type === 'goal').map(e => e.type === 'goal' && e.goal.id)).toEqual(['coins-10', 'anti-1', 'gold-10', 'gold-50', 'prism-3', 'prism-7']);
    expect(nextGoal(st, 'anti')).toBeNull();
  });

  it('pay seconds of perfect income as an instant reward', () => {
    const st = createState();
    st.stats.caught.basic = 10;
    const out: GameEvent[] = [];
    checkGoals(st, out);
    // level 0: 1 coin per pickup × 1 spawn/s × 15 s
    const goals = () => out.filter(e => e.type === 'goal');
    expect(goals()[0]).toMatchObject({ type: 'goal', reward: 15 });
    expect(st.money).toBe(15);
    expect(st.totalEarned).toBe(15);
    st.levels.value = 30; // 344 per coin
    st.stats.caught.basic = 100;
    checkGoals(st, out);
    expect(goals()[1]).toMatchObject({ type: 'goal', reward: 344 * 20 });
  });

  it('have readable descriptions', () => {
    expect(S.goalText(GOALS[0]!)).toBe('Catch 10 coins');
    expect(S.goalText(GOALS.find(g => g.id === 'anti-1')!)).toBe('Catch 1 anti-coin');
    expect(S.goalText(GOALS.find(g => g.id === 'prism-49')!)).toBe('Catch 49 Prism coins');
  });
});
