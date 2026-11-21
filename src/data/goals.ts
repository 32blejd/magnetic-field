/* In-run mini-goals. Descriptions are built in ui/strings.ts. Goals reset with Polarity Shift. */

export type GoalMetric = 'coins' | 'gold' | 'prism' | 'anti';

export interface GoalDef {
  id: string;
  metric: GoalMetric;
  target: number;
  /** Instant reward: this many seconds of "perfect" income (value per coin × spawn rate) at the moment of completion. */
  rewardSeconds: number;
}

const goals = (metric: GoalMetric, steps: [target: number, rewardSeconds: number][]): GoalDef[] =>
  steps.map(([target, rewardSeconds]) => ({ id: `${metric}-${target}`, metric, target, rewardSeconds }));

export const GOALS: readonly GoalDef[] = [
  ...goals('coins', [[10, 15], [100, 20], [1000, 30], [5000, 45]]), // any non-anti coin
  ...goals('anti', [[1, 20]]),
  ...goals('gold', [[10, 20], [50, 30], [100, 45]]),
  ...goals('prism', [[3, 20], [7, 30], [11, 40], [49, 60]]),
];

/** Display order of the goal tracker. */
export const GOAL_METRICS: readonly GoalMetric[] = ['coins', 'gold', 'prism', 'anti'];
