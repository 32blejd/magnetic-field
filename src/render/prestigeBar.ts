import { earnedShare } from '../game/money';
import { canShift, coresFor, nextCoreAt, shiftGoal, treeUnlocked } from '../game/prestige';
import type { GameState, Vec } from '../game/types';
import { formatNumber, formatShort } from '../ui/format';
import { PRESTIGE_BAR, PRESTIGE_BUTTON, inRect } from '../ui/layout';
import { S } from '../ui/strings';
import { glow, noGlow, type Ctx } from './draw';
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
    const bx = R.x + 230, bw = treeUnlocked(st) ? 260 : R.w - 230 - 130, by = R.y + R.h / 2 - 4;
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
  ctx.restore();
}

/** What the prestige bar button does right now. */
export function prestigeButtonAction(st: GameState): 'shift' | 'browse' | null {
  return canShift(st) ? 'shift' : treeUnlocked(st) ? 'browse' : null;
}
