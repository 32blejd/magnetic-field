/* Stats screen (Tab / pause menu): this run, every mini-goal, lifetime totals. Look: docs/mockups/stats.html. */
import { GOAL_METRICS, GOALS, type GoalMetric } from '../data/goals';
import { VIEW } from '../data/tuning';
import { antiUnlocked, catchRate } from '../game/abilities';
import { goalProgress } from '../game/goals';
import { bonuses, shiftGoal } from '../game/prestige';
import type { GameState } from '../game/types';
import { formatDuration, formatNumber, formatShort, formatTime } from '../ui/format';
import { STATS_BOX } from '../ui/menuLayout';
import { STATS_TEXT as T } from '../ui/strings';
import { drawText, glow, noGlow, type Ctx } from './draw';
import type { Effects } from './effects';
import { COLORS, tierColor } from './theme';

/** Positional shorthand for drawText. */
const text = (ctx: Ctx, s: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = 'left'): void =>
  drawText(ctx, s, x, y, { size, color, weight, align });

/** Column heading with an underline in its color. */
function heading(ctx: Ctx, x: number, y: number, w: number, title: string, color: string): void {
  text(ctx, title, x, y, 11, color, 700);
  ctx.strokeStyle = color + '55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x + w, y + 10); ctx.stroke();
}

type Row = [label: string, value: string, color?: string];
function rows(ctx: Ctx, x: number, y: number, w: number, list: Row[]): void {
  list.forEach(([label, value, color], i) => {
    text(ctx, label, x, y + i * 22, 11, COLORS.sub);
    text(ctx, value, x + w, y + i * 22, 11, color ?? COLORS.text, 700, 'right');
  });
}

/** One metric: done goals ✓, the current one with a progress bar, later ones greyed; reward in seconds of perfect income. */
function goalGroup(ctx: Ctx, st: GameState, x: number, y: number, w: number, metric: GoalMetric): number {
  const locked = metric === 'anti' && !antiUnlocked(st);
  text(ctx, T.goalGroup[metric], x, y, 11, locked ? COLORS.sub : COLORS.text, 700);
  if (locked) text(ctx, T.antiLocked, x + w, y, 10, COLORS.sub, 400, 'right');
  const mult = bonuses(st.meta).goalRewardMult, progress = goalProgress(st, metric);
  let current = true; // the first unfinished goal of the metric
  const goals = GOALS.filter(g => g.metric === metric);
  goals.forEach((g, i) => {
    const yy = y + 16 + i * 14, done = !!st.goalsDone[g.id], now = !done && current && !locked;
    if (!done) current = false;
    const col = done ? COLORS.amber : now ? COLORS.text : 'rgba(95,155,179,.5)';
    text(ctx, done ? '✓' : now ? '▸' : '·', x + 4, yy, 10, col);
    text(ctx, now ? `${formatNumber(Math.min(progress, g.target))} / ${formatNumber(g.target)}` : formatNumber(g.target), x + 18, yy, 10, col, now ? 700 : 400);
    if (now) {
      const bx = x + 112, bw = w - 112 - 52, k = Math.min(1, progress / g.target);
      ctx.fillStyle = 'rgba(95,155,179,.2)'; ctx.beginPath(); ctx.roundRect(bx, yy - 2, bw, 4, 2); ctx.fill();
      ctx.fillStyle = COLORS.amber; ctx.beginPath(); ctx.roundRect(bx, yy - 2, bw * k, 4, 2); ctx.fill();
    }
    text(ctx, T.reward(Math.round(g.rewardSeconds * mult)), x + w, yy, 10, col, 400, 'right');
  });
  return y + 16 + goals.length * 14 + 12;
}

export function drawStats(ctx: Ctx, st: GameState, fx: Effects): void {
  ctx.fillStyle = 'rgba(2,3,10,.72)'; ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const M = STATS_BOX;
  glow(ctx, COLORS.cyan, 20); ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(M.x, M.y, M.w, M.h, 12); ctx.fill();
  ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
  glow(ctx, COLORS.cyan, 14); text(ctx, T.title, M.x + 28, M.y + 32, 22, COLORS.cyan, 700); noGlow(ctx);
  text(ctx, T.paused, M.x + 120, M.y + 34, 10, COLORS.sub);
  text(ctx, T.close, M.x + M.w - 28, M.y + 34, 10, COLORS.sub, 400, 'right');

  const top = M.y + 74, cw = 236, gap = 28, x1 = M.x + 28, x2 = x1 + cw + gap, x3 = x2 + cw + gap;
  const s = st.stats, life = st.meta.life, m = st.meta;
  const caught = s.caught.basic + s.caught.gold + s.caught.prism + s.caught.void;
  const tier = (id: 'gold' | 'prism' | 'void') => tierColor(id, 0, 1);

  heading(ctx, x1, top, cw, bonuses(m).compassBroken ? T.runEndless(formatNumber(m.shifts + 1)) : T.run(formatNumber(m.shifts + 1)), COLORS.magenta);
  rows(ctx, x1, top + 30, cw, [
    [T.runTime, formatTime(st.t)],
    [T.earned, `${formatShort(st.totalEarned)} / ${formatShort(shiftGoal(m))}`],
    [T.income, T.perSecond(fx.incomePerSecond(st).toFixed(1))],
    [T.catchRate, `${Math.round(catchRate(st) * 100)}%`],
    [T.caught, formatNumber(caught)],
    [T.basic, formatNumber(s.caught.basic)],
    [T.gold, formatNumber(s.caught.gold), tier('gold')],
    [T.prism, formatNumber(s.caught.prism), tier('prism')],
    [T.void, formatNumber(s.caught.void), tier('void')],
    [T.missed, formatNumber(s.missed)],
    [T.bestCombo, formatNumber(s.bestCombo)],
    [T.antiHits, formatNumber(s.anti), COLORS.red],
    [T.events, formatNumber(s.events)],
  ]);

  heading(ctx, x2, top, cw, T.goals, COLORS.amber);
  let y = top + 30;
  for (const metric of GOAL_METRICS) y = goalGroup(ctx, st, x2, y, cw, metric);
  const done = GOALS.filter(g => st.goalsDone[g.id]).length;
  text(ctx, T.rewardNote, x2, y + 4, 9, 'rgba(95,155,179,.7)');
  text(ctx, T.goalsDone(formatNumber(done), formatNumber(GOALS.length)), x2 + cw, y + 4, 9, COLORS.amber, 400, 'right');

  const lifeCaught = life.caught.basic + life.caught.gold + life.caught.prism + life.caught.void;
  heading(ctx, x3, top, cw, T.lifetime, COLORS.cyan);
  rows(ctx, x3, top + 30, cw, [
    [T.playTime, formatDuration(life.time)],
    [T.coinsEarned, formatShort(life.earned)],
    [T.caught, formatNumber(lifeCaught)],
    [T.gold, formatNumber(life.caught.gold), tier('gold')],
    [T.prism, formatNumber(life.caught.prism), tier('prism')],
    [T.void, formatNumber(life.caught.void), tier('void')],
    [T.bestComboEver, formatNumber(life.bestCombo)],
    [T.shifts, formatNumber(m.shifts)],
    [T.fastest, life.fastest > 0 ? formatTime(life.fastest) : T.none],
    [T.cores, `${formatNumber(m.coresEarned)} ◆`, COLORS.core],
    [T.goalsLife, formatNumber(life.goals)],
    [T.pulls, formatNumber(life.pulls)],
    [T.antiDodged, formatNumber(life.antiDodged)],
  ]);
}
