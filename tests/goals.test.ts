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
    expect(out.map(e => e.type === 'goal' && e.goal.id)).toEqual(['coins-10']);
    checkGoals(st, out);
    expect(out).toHaveLength(1);
    expect(nextGoal(st, 'coins')?.target).toBe(100);
  });

  it('track gold, prism and anti separately', () => {
    const st = createState();
    st.stats.caught.gold = 50;
    st.stats.caught.prism = 7;
    st.stats.anti = 1;
    const out: GameEvent[] = [];
    checkGoals(st, out);
    expect(out.map(e => e.type === 'goal' && e.goal.id)).toEqual(['coins-10', 'anti-1', 'gold-10', 'gold-50', 'prism-3', 'prism-7']);
    expect(nextGoal(st, 'anti')).toBeNull();
  });

  it('have readable descriptions', () => {
    expect(S.goalText(GOALS[0]!)).toBe('Catch 10 coins');
    expect(S.goalText(GOALS.find(g => g.id === 'anti-1')!)).toBe('Catch 1 anti-coin');
    expect(S.goalText(GOALS.find(g => g.id === 'prism-49')!)).toBe('Catch 49 Prism coins');
  });
});
