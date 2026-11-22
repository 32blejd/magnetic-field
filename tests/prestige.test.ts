import { describe, expect, it } from 'vitest';
import { NODES, NODE_BY_ID } from '../src/data/prestige';
import { PULSE } from '../src/data/tuning';
import { UPGRADE_BY_ID } from '../src/data/upgrades';
import { triggerPulse, upgradeUnlockAt } from '../src/game/abilities';
import {
  bonuses, buyNode, canBuyNode, canShift, commitShift, coresFor, draftSummary, canRefundNode, refundNode, resetDraft, nextCoreAt, nextShiftGoal, nodeVisible, shiftGoal, startDraft, treeUnlocked,
} from '../src/game/prestige';
import { nextCost } from '../src/game/shop';
import { createState, emptyLife, emptyMeta } from '../src/game/state';
import { getStats } from '../src/game/stats';
import { deserialize, serialize } from '../src/save/save';

const withNodes = (nodes: Record<string, number>, coresEarned = 0) => createState(1, { ...emptyMeta(), nodes, coresEarned });

describe('Polarity Shift', () => {
  it('needs 1M earned this run and pays 10 × √(earned / 1M) Cores', () => {
    const st = createState();
    st.totalEarned = 999_999;
    expect(canShift(st)).toBe(false);
    expect(coresFor(st)).toBe(0);
    st.totalEarned = 1_000_000; expect(coresFor(st)).toBe(10);
    st.totalEarned = 1_240_000; expect(coresFor(st)).toBe(11);
    expect(nextCoreAt(st)).toBe(1_440_000);
    st.totalEarned = 4_000_000; expect(coresFor(st)).toBe(20);
  });

  it('raises the goal linearly with every shift and pays ~10 Cores at the goal of any run', () => {
    const st = createState(1, { ...emptyMeta(), shifts: 2 });
    expect(shiftGoal(st.meta)).toBe(4_000_000); // 1M × (1 + 1.5 × 2)
    expect(nextShiftGoal(st.meta)).toBe(5_500_000); // the run after the next shift
    expect(nextShiftGoal(createState().meta)).toBe(2_500_000);
    st.totalEarned = 3_999_999; expect(canShift(st)).toBe(false);
    st.totalEarned = 4_000_000; expect(coresFor(st)).toBe(10);
    st.totalEarned = 16_000_000; expect(coresFor(st)).toBe(20);
  });

  it('lets the tree be browsed from 100k earned, or always after the first shift', () => {
    const st = createState();
    st.totalEarned = 99_999; expect(treeUnlocked(st)).toBe(false);
    st.totalEarned = 100_000; expect(treeUnlocked(st)).toBe(true);
    const later = createState(1, { ...emptyMeta(), shifts: 1 });
    expect(treeUnlocked(later)).toBe(true);
  });

  it('reveals nodes next to owned ones', () => {
    const st = createState();
    st.totalEarned = 4_000_000;
    const draft = startDraft(st);
    const visible = NODES.filter(n => nodeVisible(draft.nodes, n)).map(n => n.id);
    expect(visible).toEqual(['core', 'Nb1', 'Eb1', 'Sb1', 'Wb1']);
    expect(buyNode(draft, NODE_BY_ID.Nb1!)).toBe(true);
    expect(nodeVisible(draft.nodes, NODE_BY_ID.Nb2!)).toBe(true);
    expect(nodeVisible(draft.nodes, NODE_BY_ID.Nb4!)).toBe(false);
    expect(canBuyNode({ ...draft, cores: 999 }, NODE_BY_ID.Wb2!)).toBe(false); // hidden until Bulk Buy is owned
    draft.nodes.Wb1 = 1;
    expect(canBuyNode({ ...draft, cores: 999 }, NODE_BY_ID.Wb2!)).toBe(true); // Auto-buyer (M5)
  });

  it('sells every node of the tree – no placeholders left', () => {
    const draft = { nodes: {} as Record<string, number>, cores: 10_000, gained: 0 };
    for (let changed = true; changed;) { // buy everything reachable until nothing changes
      changed = false;
      for (const n of NODES) while (buyNode(draft, n)) changed = true;
    }
    for (const n of NODES) if (n.id !== 'core') expect(draft.nodes[n.id], n.id).toBe(n.max);
  });

  it('keeps purchases tentative until the shift is committed', () => {
    const st = createState();
    st.totalEarned = 1_000_000;
    const draft = startDraft(st);
    expect(draft).toMatchObject({ cores: 10, gained: 10 });
    buyNode(draft, NODE_BY_ID.Sb1!);
    buyNode(draft, NODE_BY_ID.Sb1!);
    expect(draft.cores).toBe(7);
    expect(draftSummary(st, draft)).toEqual({ spent: 3, refunded: 0, bought: 1 });
    expect(st.meta.nodes).toEqual({}); // nothing saved yet
    expect(startDraft(st).cores).toBe(10); // UNDO = a fresh draft
  });

  it('refunds single levels for free, leaves first', () => {
    const st = withNodes({ Nb1: 2, Nb2: 1, Nb3: 1, Nb5: 1 }); // Nb5 hangs on Nb2 or Nb3
    const draft = startDraft(st);
    const N = (id: string) => NODE_BY_ID[id]!;
    expect(canRefundNode(draft, N('core'))).toBe(false);
    expect(canRefundNode(draft, N('Nb4'))).toBe(false); // not owned
    expect(refundNode(draft, N('Nb1'))).toBe(true); // level 2 → 1 is always fine
    expect(draft).toMatchObject({ cores: 2, nodes: { Nb1: 1 } });
    expect(canRefundNode(draft, N('Nb1'))).toBe(false); // Nb2/Nb3 would float
    expect(refundNode(draft, N('Nb2'))).toBe(true); // Nb5 still hangs on Nb3
    expect(canRefundNode(draft, N('Nb3'))).toBe(false); // …but now only on Nb3
    expect(refundNode(draft, N('Nb5'))).toBe(true);
    expect(refundNode(draft, N('Nb3'))).toBe(true);
    expect(refundNode(draft, N('Nb1'))).toBe(true);
    expect(draft).toMatchObject({ cores: 2 + 2 + 3 + 2 + 1, nodes: {} });
  });

  it('resets the whole tree into the draft, and the summary counts refunds', () => {
    const st = withNodes({ Sb1: 3, Sb2: 1, Wkey: 2 });
    st.totalEarned = 1_000_000;
    const draft = startDraft(st); // 10 gained
    expect(resetDraft(draft)).toBe(1 + 2 + 3 + 2 + 8 + 12);
    expect(draft).toMatchObject({ nodes: {}, cores: 10 + 28 });
    buyNode(draft, NODE_BY_ID.Nb1!);
    expect(draftSummary(st, draft)).toEqual({ spent: 1, refunded: 28, bought: 1 });
    commitShift(st, draft);
    expect(st.meta).toMatchObject({ cores: 37, nodes: { Nb1: 1 } });
  });

  it('resets the run but keeps Cores and the tree', () => {
    const st = createState();
    st.totalEarned = 1_000_000; st.money = 123; st.levels.value = 10; st.goalsDone['coins-10'] = true; st.t = 900;
    const draft = startDraft(st);
    buyNode(draft, NODE_BY_ID.Sb1!);
    buyNode(draft, NODE_BY_ID.Sb1!);
    buyNode(draft, NODE_BY_ID.Sb2!);
    commitShift(st, draft);
    expect(st.meta).toEqual({ cores: 5, coresEarned: 10, shifts: 1, nodes: { Sb1: 2, Sb2: 1 }, crystals: 3, lodestones: {}, pity: 0, autoShift: 0, autoBuyOff: false, life: emptyLife() });
    expect(st.money).toBe(500); // Head Start 1
    expect(st.totalEarned).toBe(0);
    expect(st.levels.value).toBe(0);
    expect(st.goalsDone).toEqual({});
    expect(st.t).toBe(0);
  });
});

describe('Core tree bonuses', () => {
  it('are neutral with an empty tree', () => {
    const st = createState();
    expect(getStats(st)).toMatchObject({ value: 1, range: 30 });
    expect(nextCost(st, UPGRADE_BY_ID.value)).toBe(7); // round(7.2)
  });

  it('change stats, costs, unlocks and abilities', () => {
    const st = withNodes({ Nb1: 3, Sb1: 2, Sb3: 3, Sb4: 1, Eb2: 1, Eb1: 2 }, 10);
    const S = getStats(st);
    expect(S.baseRange).toBeCloseTo(30 * 1.3);
    expect(S.value).toBeCloseTo(1 * 1.2 * 1.3); // Polarity Core 10 × 2% · Dividend 2 × 15%
    expect(S.rarity).toBeCloseTo(0.02);
    expect(nextCost(st, UPGRADE_BY_ID.capacity)).toBe(Math.round(10 * 0.76)); // Discount 3 × 8%
    expect(upgradeUnlockAt(st, UPGRADE_BY_ID.capacity)).toBe(75); // Fast Track halves 150
    expect(bonuses(st.meta).prismValue).toBe(4);
    st.totalEarned = PULSE.unlockAt / 2; // unlocked earlier thanks to Fast Track
    expect(triggerPulse(st)).toBe(true);
    expect(st.pulseCd).toBe(PULSE.cooldown);
  });

  it('Compound adds +1% value per minute, up to +30%', () => {
    const st = withNodes({ Sb5: 1 });
    st.t = 600; expect(getStats(st).value).toBeCloseTo(1.1);
    st.t = 7200; expect(getStats(st).value).toBeCloseTo(1.3);
  });
});

describe('save with Polarity Shift', () => {
  it('round-trips the meta progress', () => {
    const st = withNodes({ Nb1: 2, Sb1: 1 }, 20);
    st.meta.cores = 7; st.meta.shifts = 2;
    st.meta.crystals = 42; st.meta.lodestones = { 'iron-epic': 2 }; st.meta.pity = 7; st.meta.autoShift = 2; st.meta.autoBuyOff = true;
    expect(deserialize(serialize(st))!.meta).toEqual({
      cores: 7, coresEarned: 20, shifts: 2, nodes: { Nb1: 2, Sb1: 1 }, crystals: 42, lodestones: { 'iron-epic': 2 }, pity: 7, autoShift: 2, autoBuyOff: true, life: emptyLife(),
    });
  });

  it('migrates a version 1 save to an empty tree, and drops unknown or over-max nodes', () => {
    const v1 = { version: 1, money: 50, totalEarned: 200, levels: {} };
    expect(deserialize(JSON.stringify(v1))!.meta).toEqual(emptyMeta());
    const v2 = { version: 2, money: 0, totalEarned: 0, levels: {}, meta: { cores: 3, nodes: { Nb1: 99, bogus: 1, core: 1 } } };
    expect(deserialize(JSON.stringify(v2))!.meta).toEqual({ ...emptyMeta(), cores: 3, nodes: { Nb1: 3 } });
  });
});
