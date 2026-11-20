import { GOALS, type GoalDef, type GoalMetric } from '../data/goals';
import type { GameEvent, GameState } from './types';

export function goalProgress(st: GameState, metric: GoalMetric): number {
  const c = st.stats.caught;
  switch (metric) {
    case 'coins': return c.basic + c.gold + c.prism;
    case 'gold': return c.gold;
    case 'prism': return c.prism;
    case 'anti': return st.stats.anti;
  }
}

/** Marks newly completed goals and reports them. */
export function checkGoals(st: GameState, out: GameEvent[]): void {
  for (const goal of GOALS) {
    if (st.goalsDone[goal.id] || goalProgress(st, goal.metric) < goal.target) continue;
    st.goalsDone[goal.id] = true;
    out.push({ type: 'goal', goal });
  }
}

/** The first unfinished goal of a metric, or null when all are done. */
export function nextGoal(st: GameState, metric: GoalMetric): GoalDef | null {
  return GOALS.find(g => g.metric === metric && !st.goalsDone[g.id]) ?? null;
}
