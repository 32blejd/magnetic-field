import { PRESTIGE_GOAL } from '../data/tuning';
import { earnedShare } from '../game/money';
import type { GameState } from '../game/types';
import { formatNumber, formatShort } from '../ui/format';
import { PRESTIGE_BAR } from '../ui/layout';
import { S } from '../ui/strings';
import { glow, noGlow, type Ctx } from './draw';
import { COLORS, FONT } from './theme';

export function drawPrestigeBar(ctx: Ctx, st: GameState): void {
  const R = PRESTIGE_BAR, progress = earnedShare(st, PRESTIGE_GOAL), ready = progress >= 1;
  ctx.save();
  ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, 10); ctx.fill();
  ctx.strokeStyle = ready ? COLORS.magenta : 'rgba(0,229,255,.35)'; ctx.lineWidth = 1;
  if (!ready) ctx.setLineDash([5, 5]);
  ctx.stroke(); ctx.setLineDash([]);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 11px ${FONT}`; ctx.fillText(S.prestigeTitle, R.x + 16, R.y + 19);
  ctx.fillStyle = COLORS.sub; ctx.font = `11px ${FONT}`;
  ctx.fillText(ready ? S.prestigeReady : S.prestigeProgress(formatShort(st.totalEarned)), R.x + 16, R.y + 36);

  const bx = R.x + 250, bw = R.w - 250 - 130, by = R.y + R.h / 2 - 4;
  ctx.fillStyle = 'rgba(0,229,255,.08)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 8, 4); ctx.fill();
  if (progress > 0) {
    glow(ctx, COLORS.magenta, 8); ctx.fillStyle = COLORS.magenta;
    ctx.beginPath(); ctx.roundRect(bx, by, Math.max(8, bw * progress), 8, 4); ctx.fill(); noGlow(ctx);
  }
  ctx.fillStyle = COLORS.text; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(S.cores(formatNumber(0)), R.x + R.w - 16, R.y + R.h / 2);
  ctx.restore();
}
