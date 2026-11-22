import { describe, expect, it } from 'vitest';
import { STAGE_NODES } from '../src/data/prestige';
import { PULSE } from '../src/data/tuning';
import { bonuses, endlessCoreBonus, shiftGoal } from '../src/game/prestige';
import { createState, emptyMeta } from '../src/game/state';
import { getStats } from '../src/game/stats';
import { activeTip } from '../src/ui/tips';

describe('tutorial tips', () => {
  it('start with "move" on a new game and go away once something is caught', () => {
    const st = createState();
    expect(activeTip(st, [])).toBe('move');
    st.stats.caught.basic = 1;
    expect(activeTip(st, [])).toBeNull(); // nothing affordable yet
  });

  it('point at an affordable upgrade, then at the number keys after the first purchase', () => {
    const st = createState();
    st.stats.caught.basic = 5;
    st.money = 100;
    expect(activeTip(st, [])).toBe('buy');
    st.levels.value = 1;
    expect(activeTip(st, ['buy'])).toBe('keys');
    expect(activeTip(st, ['buy', 'keys'])).toBeNull();
  });

  it('never repeat a seen tip and follow the progression: Pulse, Core tree, shift, Magnetron', () => {
    const st = createState();
    st.stats.caught.basic = 5; st.levels.value = 1;
    const seen = ['move', 'buy', 'keys', 'menu'];
    st.totalEarned = PULSE.unlockAt;
    expect(activeTip(st, seen)).toBe('pulse');
    st.totalEarned = 200_000;
    expect(activeTip(st, [...seen, 'pulse'])).toBe('tree');
    st.totalEarned = shiftGoal(st.meta);
    expect(activeTip(st, [...seen, 'pulse'])).toBe('shift');
    const after = createState(1, { ...emptyMeta(), shifts: 1 });
    after.stats.caught.basic = 1;
    expect(activeTip(after, [...seen, 'pulse', 'tree', 'shift'])).toBe('gacha');
  });
});

describe('endless Core bonus', () => {
  it('adds +0.03% coin value per unspent Core (+1% per ~33), only after Break the Compass', () => {
    const all = Object.fromEntries([1, 2, 3, 4].flatMap(s => STAGE_NODES[s as 1].map(n => [n.id, n.max])));
    const broken = createState(1, { ...emptyMeta(), nodes: all, cores: 0 });
    const base = getStats(broken).value;
    broken.meta.cores = 1000;
    expect(endlessCoreBonus(broken.meta)).toBeCloseTo(0.3);
    expect(getStats(broken).value).toBeCloseTo(base * 1.3);
    const normal = createState(1, { ...emptyMeta(), cores: 50 });
    expect(bonuses(normal.meta).valueMult).toBe(bonuses(createState().meta).valueMult);
  });
});
