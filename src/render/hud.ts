import { BOARD, PULSE } from '../data/tuning';
import { bonuses } from '../game/prestige';
import { pulseUnlocked } from '../game/abilities';
import type { GameState } from '../game/types';
import { formatNumber } from '../ui/format';
import { PULSE_WIDGET, STATS_HINT_ANCHOR } from '../ui/layout';
import { S, STATS_TEXT } from '../ui/strings';
import { glow, noGlow, type Ctx } from './draw';
import type { Effects } from './effects';
import { COLORS, FONT } from './theme';

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
    if (bonuses(st.meta).autoPulse) { // Auto-pulse tag on the right
      ctx.fillStyle = COLORS.green; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'right';
      ctx.fillText(S.auto, x + w - 8, y + h / 2); ctx.textAlign = 'left';
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** Where the run stats and mini-goals went: a faint hint in the bottom-right corner of the board. */
function drawStatsHint(ctx: Ctx): void {
  const { x, y } = STATS_HINT_ANCHOR;
  ctx.fillStyle = 'rgba(95,155,179,.55)'; ctx.font = `10px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(STATS_TEXT.boardHint, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

export function drawHud(ctx: Ctx, st: GameState): void {
  drawPulseWidget(ctx, st);
  drawStatsHint(ctx);
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
