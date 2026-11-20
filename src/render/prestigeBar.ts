import { earnedShare } from '../game/money';
import { autoShiftAt, bonuses, canShift, coresFor, nextCoreAt, shiftGoal, treeUnlocked } from '../game/prestige';
import type { GameState, Vec } from '../game/types';
import { formatNumber, formatShort } from '../ui/format';
import { AUTO_SHIFT_BUTTON, PRESTIGE_BAR, PRESTIGE_BUTTON, inRect } from '../ui/layout';
import { S } from '../ui/strings';
import { glow, noGlow, wrapText, type Ctx } from './draw';
import { COLORS, FONT } from './theme';

/** Under the board: progress to this run's goal, Core tree preview button (from 100k) or SHIFT POLARITY (at the goal). */
export function drawPrestigeBar(ctx: Ctx, st: GameState, cursor: Vec | null, t: number): void {
  const R = PRESTIGE_BAR, ready = canShift(st), b = PRESTIGE_BUTTON, hover = !!cursor && inRect(cursor, b);
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save();
  ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, 10); ctx.fill();
  if (ready) { glow(ctx, COLORS.magenta, 8 + pulse * 10); ctx.strokeStyle = COLORS.magenta; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx); }
  else { ctx.strokeStyle = 'rgba(0,229,255,.35)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); }

  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 11px ${FONT}`;
  ctx.fillText(ready ? S.prestigeReadyTitle : S.prestigeTitle, R.x + 16, R.y + 18);
  ctx.font = `11px ${FONT}`; ctx.fillStyle = COLORS.sub;
  if (ready) {
    const line = S.prestigeReadyLine(formatShort(st.totalEarned));
    ctx.fillText(line, R.x + 16, R.y + 35);
    const x = R.x + 22 + ctx.measureText(line).width;
    ctx.fillStyle = COLORS.core; ctx.font = `700 12px ${FONT}`;
    const gain = S.prestigeGain(formatNumber(coresFor(st)));
    ctx.fillText(gain, x, R.y + 35);
    ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`;
    ctx.fillText(S.prestigeNext(formatShort(nextCoreAt(st))), x + ctx.measureText(gain).width + 18, R.y + 35);
  } else {
    ctx.fillText(S.prestigeProgress(formatShort(shiftGoal(st.meta)), formatShort(st.totalEarned)), R.x + 16, R.y + 35);
    const bx = R.x + 230, by = R.y + R.h / 2 - 4;
    const bw = autoShiftVisible(st) ? AUTO_SHIFT_BUTTON.x - 12 - bx : treeUnlocked(st) ? 260 : R.w - 230 - 130;
    const progress = earnedShare(st, shiftGoal(st.meta));
    ctx.fillStyle = 'rgba(0,229,255,.08)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 8, 4); ctx.fill();
    if (progress > 0) {
      glow(ctx, COLORS.magenta, 8); ctx.fillStyle = COLORS.magenta;
      ctx.beginPath(); ctx.roundRect(bx, by, Math.max(8, bw * progress), 8, 4); ctx.fill(); noGlow(ctx);
    }
  }

  if (ready || treeUnlocked(st)) { // right-hand button
    const col = ready ? COLORS.magenta : COLORS.core;
    glow(ctx, col, hover ? 20 : ready ? 10 + pulse * 8 : 6);
    ctx.fillStyle = col + (hover ? '44' : ready ? '24' : '14');
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = ready ? 1.5 : 1.2; ctx.stroke(); noGlow(ctx);
    ctx.fillStyle = ready ? '#ffd0f5' : col; ctx.font = `700 ${ready ? 12 : 11}px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(ready ? S.shiftButton : S.treeButton, b.x + b.w / 2, b.y + b.h / 2 + 1);
  } else {
    ctx.fillStyle = COLORS.text; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(S.cores(formatNumber(st.meta.cores)), R.x + R.w - 16, R.y + R.h / 2);
  }
  if (autoShiftVisible(st)) drawAutoShift(ctx, st, cursor);
  ctx.restore();
}

/** The Auto-shift toggle shows once its node is owned. */
export const autoShiftVisible = (st: GameState): boolean => bonuses(st.meta).autoShift;

/** Auto-shift toggle (off / ×1 / ×2 / ×4 the goal) with a hover hint above the bar. */
function drawAutoShift(ctx: Ctx, st: GameState, cursor: Vec | null): void {
  const b = AUTO_SHIFT_BUTTON, on = st.meta.autoShift > 0, hover = !!cursor && inRect(cursor, b), col = COLORS.green;
  if (on) glow(ctx, col, hover ? 16 : 8);
  ctx.fillStyle = on ? col + (hover ? '40' : '1c') : hover ? 'rgba(95,155,179,.15)' : 'rgba(8,12,30,.8)';
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 7); ctx.fill();
  ctx.strokeStyle = on ? col : COLORS.sub; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
  ctx.fillStyle = on ? col : COLORS.sub; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(on ? S.autoShiftOn(st.meta.autoShift) : S.autoShiftOff, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.textAlign = 'left';
  if (!hover) return;
  const at = autoShiftAt(st), w = 260;
  ctx.font = `11px ${FONT}`;
  const lines = wrapText(ctx, S.autoShiftTip(st.meta.autoShift, at === null ? '' : formatShort(at)), w - 24), h = 18 + lines.length * 15;
  const x = Math.min(b.x, PRESTIGE_BAR.x + PRESTIGE_BAR.w - w), y = PRESTIGE_BAR.y - h - 6;
  glow(ctx, col, 10); ctx.fillStyle = 'rgba(8,12,30,.96)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);
  ctx.fillStyle = COLORS.text; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 12, y + 9 + i * 15));
  ctx.textBaseline = 'alphabetic';
}

/** What the prestige bar button does right now. */
export function prestigeButtonAction(st: GameState): 'shift' | 'browse' | null {
  return canShift(st) ? 'shift' : treeUnlocked(st) ? 'browse' : null;
}
