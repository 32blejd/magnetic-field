import { describe, expect, it } from 'vitest';
import { BREAK_COMPASS, NODES, NODE_BY_ID, PRESTIGE, STAGE_NODES, type NodeDef } from '../src/data/prestige';
import { ANTI, BOARD, STEP } from '../src/data/tuning';
import { UPGRADE_BY_ID, UPGRADES, effectAt } from '../src/data/upgrades';
import { readDebugOptions } from '../src/debug';
import { helperMagnets, twinPosition } from '../src/game/helpers';
import { costOf } from '../src/game/money';
import {
  BLUEPRINT_LEVEL, bonuses, buyNode, canBuyNode, canRefundNode, commitShift, nodeVisible, openStage, resetDraft, shiftGoal, startDraft,
} from '../src/game/prestige';
import { buy, isMaxed, levelCap, nextCost } from '../src/game/shop';
import { step } from '../src/game/simulation';
import { createState, emptyMeta } from '../src/game/state';
import { getStats } from '../src/game/stats';
import type { Coin, GameEvent, GameState } from '../src/game/types';
import { deserialize, serialize } from '../src/save/save';
import { NODE_TEXT } from '../src/ui/strings';
import { nodePos } from '../src/ui/treeLayout';

const center = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };
const coin = (over: Partial<Coin> = {}): Coin =>
  ({ x: center.x, y: center.y, dx: 1, dy: 0, age: 1, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false, ...over });

/** Every node of the given stages at max level. */
const maxed = (...stages: (1 | 2 | 3 | 4)[]): Record<string, number> =>
  Object.fromEntries(stages.flatMap(s => STAGE_NODES[s].map(n => [n.id, n.max])));
const withNodes = (nodes: Record<string, number>, shifts = 1) => createState(1, { ...emptyMeta(), nodes, shifts });
function quiet(nodes: Record<string, number>): GameState {
  const st = withNodes(nodes);
  st.spawnT = 1e9;
  st.nextEvent = 1e9;
  return st;
}

describe('tree stages', () => {
  it('has 28 + 16 + 16 nodes and the last upgrade, all with text and distinct positions', () => {
    expect([1, 2, 3, 4].map(s => STAGE_NODES[s as 1].length)).toEqual([28, 16, 16, 1]);
    for (const n of NODES) expect(NODE_TEXT[n.id], n.id).toBeDefined();
    const spots = new Set(NODES.map(n => `${Math.round(nodePos(n).x)},${Math.round(nodePos(n).y)}`));
    expect(spots.size).toBe(NODES.length);
  });

  it('opens each stage only once the previous one is maxed', () => {
    const almost = maxed(1);
    almost.Nkey = 2;
    expect(openStage(almost)).toBe(1);
    expect(nodeVisible(almost, NODE_BY_ID.NEb1!)).toBe(false);
    expect(openStage(maxed(1))).toBe(2);
    expect(nodeVisible(maxed(1), NODE_BY_ID.NEb1!)).toBe(true);
    expect(nodeVisible(maxed(1), NODE_BY_ID.NEkey!)).toBe(false); // still needs its parents
    expect(nodeVisible(maxed(1, 2), NODE_BY_ID.NNEb1!)).toBe(true); // spokes grow from two keystones
    expect(nodeVisible(maxed(1, 2), NODE_BY_ID.compass!)).toBe(false);
    expect(openStage(maxed(1, 2, 3))).toBe(4);
    expect(nodeVisible(maxed(1, 2, 3), NODE_BY_ID.compass!)).toBe(true);
  });

  it('multiplies the run goal by the open stage, and by the endless multiplier after Break the Compass', () => {
    const goal = (nodes: Record<string, number>) => shiftGoal({ ...emptyMeta(), shifts: 2, nodes });
    expect(goal({})).toBe(4_000_000);
    expect(goal(maxed(1))).toBe(4_000_000 * PRESTIGE.stageGoal[2]);
    expect(goal(maxed(1, 2))).toBe(4_000_000 * PRESTIGE.stageGoal[3]);
    expect(goal(maxed(1, 2, 3))).toBe(4_000_000 * PRESTIGE.stageGoal[4]);
    expect(goal(maxed(1, 2, 3, 4))).toBe(4_000_000 * PRESTIGE.endlessGoal);
  });

  it("won't refund a level that would close an owned later stage, and locks the tree once it's complete", () => {
    const st = withNodes({ ...maxed(1), NEb1: 1 });
    const draft = startDraft(st);
    expect(canRefundNode(draft, NODE_BY_ID.Nb1!)).toBe(false); // N b1 is maxed and stage 2 is in use
    expect(canRefundNode(draft, NODE_BY_ID.NEb1!)).toBe(true);
    expect(resetDraft(draft)).toBeGreaterThan(0); // a full reset is still allowed
    const done = startDraft(withNodes(maxed(1, 2, 3, 4)));
    expect(canRefundNode(done, NODE_BY_ID.NNEkey!)).toBe(false);
    expect(resetDraft(done)).toBe(0);
  });

  it('sells Break the Compass for 100 Cores once everything else is maxed', () => {
    const st = withNodes(maxed(1, 2, 3));
    st.meta.cores = 99;
    const draft = startDraft(st), def = NODE_BY_ID.compass as NodeDef;
    expect(canBuyNode(draft, def)).toBe(false);
    draft.cores = 100;
    expect(buyNode(draft, def)).toBe(true);
    commitShift(st, draft);
    expect(bonuses(st.meta).compassBroken).toBe(true);
  });
});

describe('Break the Compass', () => {
  it('adds 50 levels to every upgrade cap, with a linear effect and costs growing from the last level', () => {
    const st = withNodes(maxed(1, 2, 3, 4));
    const v = UPGRADE_BY_ID.value;
    expect(levelCap(st, v)).toBe(v.max + BREAK_COMPASS.extraLevels);
    expect(effectAt(v, v.max + 10)).toBe(v.fx(v.max) + 10 * v.over);
    expect(costOf(v, v.max)).toBeGreaterThan(costOf(v, v.max - 1));
    st.levels.value = v.max;
    expect(isMaxed(st, v)).toBe(false);
    st.money = 1e15;
    expect(buy(st, v)).toBe(true);
    expect(st.levels.value).toBe(v.max + 1);
    for (const u of UPGRADES) for (let l = u.max; l < u.max + 50; l++) expect(effectAt(u, l + 1)).toBeGreaterThan(effectAt(u, l));
  });

  it('keeps levels above the cap in the save only while the compass is broken', () => {
    const st = withNodes(maxed(1, 2, 3, 4));
    st.levels.range = 40;
    expect(deserialize(serialize(st))!.levels.range).toBe(40);
    const plain = withNodes({});
    plain.levels.range = 40;
    expect(deserialize(serialize(plain))!.levels.range).toBe(UPGRADE_BY_ID.range.max);
  });

  it('can be opened directly with ?open=ending', () => {
    expect(readDebugOptions('?open=ending').open).toBe('ending');
  });
});

describe('stage 2 and 3 effects', () => {
  it('Trophy, Market Day, Discount II and Blueprint', () => {
    expect(bonuses(withNodes({ NEb3: 2 }).meta).goldValue).toBe(3);
    const st = withNodes({ SEb2: 1, SSWb1: 3 });
    st.levels.range = 10; // a cost big enough not to be lost in rounding
    const full = nextCost(st, UPGRADE_BY_ID.range);
    st.event = { type: 'burst', t: 1, total: 6 };
    expect(nextCost(st, UPGRADE_BY_ID.range)).toBeLessThan(full * 0.6);
    const bp = withNodes({ SSWkey: 1 });
    commitShift(bp, startDraft(bp));
    expect(UPGRADES.every(u => bp.levels[u.id] === Math.min(BLUEPRINT_LEVEL, u.max) && bp.unlocked[u.id])).toBe(true);
  });

  it('Polarity pushes anti-coins away and pays a bounty when one leaves the board', () => {
    const st = quiet({ NEkey: 1 });
    st.coins.push(coin({ tier: 'anti', anti: true, speed: 0, pull: ANTI.pull, x: center.x + 20 })); // inside the 30 px field
    step(st, STEP, center);
    expect(st.coins[0]!.x).toBeGreaterThan(center.x + 20);
    st.coins[0]!.x = BOARD.x + BOARD.w + 40; // off the board
    const events: GameEvent[] = [];
    step(st, STEP, center, events);
    expect(st.coins).toHaveLength(0);
    expect(st.totalEarned).toBeGreaterThan(0);
    expect(events.some(e => e.type === 'pickup')).toBe(true);
    expect(st.stats.anti).toBe(0);
  });

  it('Mint splits two basic coins off a caught Gold coin; Insurance pays for escaped coins', () => {
    const st = quiet({ SEkey: 1, SEb3: 2 });
    st.coins.push(coin({ tier: 'gold', mult: 2 }));
    step(st, STEP, center);
    expect(st.coins.filter(c => c.tier === 'basic')).toHaveLength(2);
    const lost = quiet({ SEb3: 2 });
    lost.coins.push(coin({ x: BOARD.x + BOARD.w + 40 }));
    step(lost, STEP, null);
    expect(lost.totalEarned).toBeCloseTo(getStats(lost).value * 0.2);
  });

  it('Twin Magnet mirrors the magnet through the board centre and needs an active magnet', () => {
    const st = quiet({ NWkey: 1 });
    const m = { x: BOARD.x + 100, y: BOARD.y + 80 };
    const twin = twinPosition(m);
    expect(twin).toEqual({ x: BOARD.x + BOARD.w - 100, y: BOARD.y + BOARD.h - 80 });
    expect(helperMagnets(st, m, getStats(st), bonuses(st.meta)).some(h => h.x === twin.x && h.y === twin.y)).toBe(true);
    expect(helperMagnets(st, null, getStats(st), bonuses(st.meta))).toHaveLength(0);
  });

  it('Perfect Field widens the field only at max combo', () => {
    const st = quiet({ NNEkey: 1 });
    const base = getStats(st).baseRange;
    st.combo = 50;
    expect(getStats(st).baseRange).toBeCloseTo(base * 1.5);
  });
});
