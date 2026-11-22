/* The tutorial tip box: a small callout over the board, with a pointer toward the thing it talks about. */
import { BOARD } from '../data/tuning';
import type { Vec } from '../game/types';
import { MAGNETRON_BUTTON, PRESTIGE_BUTTON, PULSE_WIDGET, inRect, rowRect, type Rect } from '../ui/layout';
import { TIPS } from '../ui/strings';
import type { TipId } from '../ui/tips';
import { drawText, glow, noGlow, wrapText, type Ctx } from './draw';
import { COLORS, FONT } from './theme';

const W = 300;
/** Where each tip sits and which way its pointer goes. */
const PLACE: Record<TipId, { x: number; y: number; point: 'down' | 'right' | null; at?: number }> = {
  move: { x: BOARD.x + (BOARD.w - W) / 2, y: BOARD.y + BOARD.h - 150, point: null },
  buy: { x: BOARD.x + BOARD.w - W - 14, y: rowRect(0).y + 4, point: 'right' },
  keys: { x: BOARD.x + BOARD.w - W - 14, y: rowRect(0).y + 4, point: 'right' },
  pulse: { x: PULSE_WIDGET.x, y: PULSE_WIDGET.y - 92, point: 'down', at: PULSE_WIDGET.x + 40 },
  menu: { x: BOARD.x + BOARD.w - W - 14, y: BOARD.y + 14, point: 'right' },
  tree: { x: PRESTIGE_BUTTON.x + PRESTIGE_BUTTON.w - W, y: BOARD.y + BOARD.h - 100, point: 'down', at: PRESTIGE_BUTTON.x + PRESTIGE_BUTTON.w / 2 },
  shift: { x: PRESTIGE_BUTTON.x + PRESTIGE_BUTTON.w - W, y: BOARD.y + BOARD.h - 116, point: 'down', at: PRESTIGE_BUTTON.x + PRESTIGE_BUTTON.w / 2 },
  gacha: { x: BOARD.x + BOARD.w - W - 14, y: MAGNETRON_BUTTON.y - 20, point: 'right' },
};

/** The tip box for hit-testing (a click on it dismisses the tip). */
export function tipRect(ctx: Ctx, id: TipId): Rect {
  ctx.font = `12px ${FONT}`;
  const lines = wrapText(ctx, TIPS[id], W - 28).length, p = PLACE[id];
  return { x: p.x, y: p.y, w: W, h: 44 + lines * 16 };
}

/** Fades in over `t` seconds of being shown; bobs slightly so it reads as a hint, not part of the HUD. */
export function drawTip(ctx: Ctx, id: TipId, t: number, cursor: Vec | null): void {
  const r = tipRect(ctx, id), p = PLACE[id], hover = cursor !== null && inRect(cursor, r);
  const bob = Math.sin(t * 3) * 2, y = r.y + bob;
  ctx.save();
  ctx.globalAlpha = Math.min(1, t / 0.3);
  glow(ctx, COLORS.amber, hover ? 18 : 12);
  ctx.fillStyle = 'rgba(8,12,30,.95)'; ctx.beginPath(); ctx.roundRect(r.x, y, r.w, r.h, 9); ctx.fill();
  ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = COLORS.amber; ctx.beginPath(); // pointer
  if (p.point === 'right') { const py = y + 22; ctx.moveTo(r.x + r.w + 10, py); ctx.lineTo(r.x + r.w, py - 7); ctx.lineTo(r.x + r.w, py + 7); }
  else if (p.point === 'down') { const px = p.at ?? r.x + r.w / 2; ctx.moveTo(px, y + r.h + 10); ctx.lineTo(px - 7, y + r.h); ctx.lineTo(px + 7, y + r.h); }
  ctx.fill(); noGlow(ctx);
  drawText(ctx, TIPS.label, r.x + 14, y + 16, { size: 10, weight: 700, color: COLORS.amber });
  drawText(ctx, TIPS.dismiss, r.x + r.w - 14, y + 16, { size: 9, color: hover ? COLORS.text : COLORS.sub, align: 'right' });
  ctx.font = `12px ${FONT}`;
  wrapText(ctx, TIPS[id], W - 28).forEach((line, i) => drawText(ctx, line, r.x + 14, y + 36 + i * 16, { size: 12 }));
  ctx.restore();
}
