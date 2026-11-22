import { GOALS, type GoalDef, type GoalMetric } from '../data/goals';
import { GOOD_TIERS } from '../data/tiers';
import { CRYSTALS } from '../data/lodestones';
import { BOARD } from '../data/tuning';
import { earn, goalReward } from './money';
import { bonuses } from './prestige';
import { getStats, upgradeEffect } from './stats';
import type { GameEvent, GameState } from './types';

export function goalProgress(st: GameState, metric: GoalMetric): number {
  const c = st.stats.caught;
  switch (metric) {
    case 'coins': return GOOD_TIERS.reduce((n, t) => n + c[t], 0);
    case 'gold': return c.gold;
    case 'prism': return c.prism;
    case 'anti': return st.stats.anti;
  }
}

/** Reward a goal would pay right now: coin value incl. bonuses × base spawn rate (so Coin Burst doesn't inflate it). */
export function rewardFor(st: GameState, goal: GoalDef): number {
  return Math.round(goalReward(getStats(st).value, upgradeEffect(st, 'spawn'), goal.rewardSeconds) * bonuses(st.meta).goalRewardMult);
}

/** Marks newly completed goals, pays their reward (coins + a Charge Crystal) and reports them. */
export function checkGoals(st: GameState, out: GameEvent[]): void {
  for (const goal of GOALS) {
    if (st.goalsDone[goal.id] || goalProgress(st, goal.metric) < goal.target) continue;
    st.goalsDone[goal.id] = true;
    st.meta.life.goals++;
    const reward = rewardFor(st, goal);
    earn(st, reward);
    out.push({ type: 'goal', goal, reward });
    st.meta.crystals += CRYSTALS.perGoal;
    out.push({ type: 'crystal', amount: CRYSTALS.perGoal, x: BOARD.x + BOARD.w / 2, y: BOARD.y + 120 });
  }
}

/** The first unfinished goal of a metric, or null when all are done. */
export function nextGoal(st: GameState, metric: GoalMetric): GoalDef | null {
  return GOALS.find(g => g.metric === metric && !st.goalsDone[g.id]) ?? null;
}
