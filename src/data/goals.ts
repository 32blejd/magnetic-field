/* In-run mini-goals. Descriptions are built in ui/strings.ts. */

export type GoalMetric = 'coins' | 'gold' | 'prism' | 'anti';

export interface GoalDef {
  id: string;
  metric: GoalMetric;
  target: number;
}

const goals = (metric: GoalMetric, targets: number[]): GoalDef[] =>
  targets.map(target => ({ id: `${metric}-${target}`, metric, target }));

export const GOALS: readonly GoalDef[] = [
  ...goals('coins', [10, 100, 1000, 10000]), // any non-anti coin
  ...goals('anti', [1]),
  ...goals('gold', [10, 50, 100]),
  ...goals('prism', [3, 7, 11, 49]),
];

/** Display order of the goal tracker. */
export const GOAL_METRICS: readonly GoalMetric[] = ['coins', 'gold', 'prism', 'anti'];
