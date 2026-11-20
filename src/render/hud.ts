import { GOAL_METRICS } from '../data/goals';
import { BOARD, PULSE } from '../data/tuning';
import { bonuses } from '../game/prestige';
import { antiUnlocked, catchRate, pulseUnlocked } from '../game/abilities';
import { goalProgress, nextGoal } from '../game/goals';
import type { GameState } from '../game/types';
import { formatNumber, formatTime } from '../ui/format';
import { GOALS_ANCHOR, PULSE_WIDGET } from '../ui/layout';
import { S } from '../ui/strings';
import { glow, noGlow, type Ctx } from './draw';
import type { Effects } from './effects';
import { COLORS, FONT } from './theme';

function drawStatsLine(ctx: Ctx, st: GameState): void {
  const s = st.stats;
  ctx.fillStyle = 'rgba(95,155,179,.7)'; ctx.font = `11px ${FONT}`; ctx.textBaseline = 'top';
  ctx.fillText(S.hudLine(formatTime(st.t), Math.round(catchRate(st) * 100), formatNumber(s.missed), formatNumber(s.bestCombo)), BOARD.x + 12, BOARD.y + 10);
  ctx.textBaseline = 'alphabetic';
}

function drawPulseWidget(ctx: Ctx, st: GameState): void {
  const { x, y, w, h } = PULSE_WIDGET;
  ctx.fillStyle = 'rgba(8,12,30,.85)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.font = `700 10px ${FONT}`;
  if (!pulseUnlocked(st)) {
    ctx.strokeStyle = 'rgba(95,155,179,.3)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = COLORS.sub; ctx.fillText(S.pulseLocked(formatNumber(PULSE.unlockAt * bonuses(st.meta).unlockMult)), x + 10, y + h / 2);
  } else {
    const ready = st.pulseCd <= 0, active = st.pulseT > 0;
    if (!ready) {
      ctx.fillStyle = 'rgba(255,43,214,.18)';
      ctx.beginPath(); ctx.roundRect(x, y, w * (1 - st.pulseCd / bonuses(st.meta).pulseCooldown), h, 6); ctx.fill();
    }
    ctx.strokeStyle = ready ? COLORS.magenta : 'rgba(255,43,214,.4)'; ctx.lineWidth = 1;
    if (ready) glow(ctx, COLORS.magenta, 8);
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke(); noGlow(ctx);
    ctx.fillStyle = ready || active ? COLORS.magenta : COLORS.sub;
    ctx.fillText(active ? S.pulseActive : ready ? S.pulseReady : S.pulseCooldown(Math.ceil(st.pulseCd)), x + 10, y + h / 2);
  }
  ctx.textBaseline = 'alphabetic';
}

/** Next unfinished goal per metric, bottom-right of the board. Anti goals appear once anti-coins are unlocked. */
function drawGoals(ctx: Ctx, st: GameState): void {
  const lines: { label: string; text: string; done: boolean }[] = [];
  for (const metric of GOAL_METRICS) {
    if (metric === 'anti' && !antiUnlocked(st)) continue;
    const g = nextGoal(st, metric);
    lines.push({
      label: S.goalLabel[metric],
      text: g ? `${formatNumber(Math.min(goalProgress(st, metric), g.target))} / ${formatNumber(g.target)}` : '✓',
      done: !g,
    });
  }
  const lh = 14, { x, y } = GOALS_ANCHOR, top = y - lines.length * lh - 16;
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 10px ${FONT}`; ctx.fillText(S.goalsTitle, x, top);
  lines.forEach((l, i) => {
    const ly = top + 16 + i * lh;
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = l.done ? COLORS.amber : 'rgba(230,251,255,.75)';
    ctx.fillText(l.text, x, ly);
    const w = ctx.measureText(l.text).width;
    ctx.fillStyle = COLORS.sub; ctx.fillText(l.label, x - w - 8, ly);
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

export function drawHud(ctx: Ctx, st: GameState): void {
  drawStatsLine(ctx, st);
  drawPulseWidget(ctx, st);
  drawGoals(ctx, st);
}

export function drawBanner(ctx: Ctx, fx: Effects): void {
  const b = fx.banners[0];
  if (!b) return;
  const age = b.total - b.life, appear = Math.min(1, age / 0.25);
  const y = BOARD.y + 58 - (1 - appear) * 10;
  ctx.save();
  ctx.globalAlpha = Math.min(appear, b.life / 0.4);
  ctx.textAlign = 'center';
  glow(ctx, b.color, 16); ctx.fillStyle = b.color; ctx.font = `700 22px ${FONT}`;
  ctx.fillText(b.title, BOARD.x + BOARD.w / 2, y); noGlow(ctx);
  if (b.sub) { ctx.fillStyle = COLORS.text; ctx.font = `12px ${FONT}`; ctx.fillText(b.sub, BOARD.x + BOARD.w / 2, y + 22); }
  ctx.restore();
}
