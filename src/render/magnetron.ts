/* Magnetron screen: the machine, the Lodestone collection and the pull reveal. */
import { ELEMENTS, GACHA, LODESTONES, RARITIES, type Element, type LodestoneDef, type Rarity } from '../data/lodestones';
import { VIEW } from '../data/tuning';
import { canPull, collectionComplete, legendaryPity, lodestoneValueBonus, pullsToPity } from '../game/lodestones';
import type { GameState, Vec } from '../game/types';
import { formatNumber } from '../ui/format';
import { inRect, type Rect } from '../ui/layout';
import {
  GRID, MACHINE, MAG_BACK, MAG_TOP_BAR_H, PULL1, PULL10, REVEAL, REVEAL_STEP, cellRect, revealCard, type MagnetronView,
} from '../ui/magnetronLayout';
import { ELEMENT_TEXT, M, RARITY_TEXT, lodestoneEffect, lodestoneName } from '../ui/strings';
import { glow, hexPath, noGlow, wrapText, type Ctx } from './draw';
import { COLORS, FONT } from './theme';

const W = VIEW.w, H = VIEW.h;
export const ELEMENT_COLOR: Record<Element, string> = { iron: '#c9d2dc', cobalt: '#4d8dff', nickel: '#9ff0b4', neodymium: '#d27bff' };
export const RARITY_COLOR: Record<Rarity, string> = { common: '#8fa3b0', rare: COLORS.cyan, epic: COLORS.magenta, legendary: COLORS.amber };

function button(ctx: Ctx, r: Rect, label: string, color: string, enabled: boolean, hover: boolean): void {
  ctx.globalAlpha = enabled ? 1 : 0.35;
  if (enabled) glow(ctx, color, hover ? 20 : 8);
  ctx.fillStyle = color + (enabled && hover ? '40' : '1a');
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.stroke(); noGlow(ctx);
  ctx.fillStyle = color; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}

/** A lodestone: a faceted hex "rock" in the element color with a rarity glow. */
export function drawStone(ctx: Ctx, l: LodestoneDef, x: number, y: number, r: number, t: number, owned = true): void {
  if (!owned) {
    ctx.fillStyle = 'rgba(95,155,179,.08)'; hexPath(ctx, x, y, r, Math.PI / 6); ctx.fill();
    ctx.strokeStyle = 'rgba(95,155,179,.3)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(95,155,179,.5)'; ctx.font = `700 ${Math.round(r * 0.8)}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    return;
  }
  const col = ELEMENT_COLOR[l.element], rc = RARITY_COLOR[l.rarity];
  glow(ctx, rc, l.rarity === 'legendary' ? 22 : l.rarity === 'epic' ? 16 : 10);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, col); g.addColorStop(1, '#1a2238');
  ctx.fillStyle = g; hexPath(ctx, x, y, r, Math.PI / 6 + (l.rarity === 'legendary' ? Math.sin(t * 2) * 0.1 : 0)); ctx.fill();
  ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.stroke(); noGlow(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; // facets
  ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.3); ctx.lineTo(x, y + r * 0.1); ctx.lineTo(x + r * 0.45, y - r * 0.35); ctx.moveTo(x, y + r * 0.1); ctx.lineTo(x, y + r * 0.7); ctx.stroke();
  if (l.rarity === 'legendary') { // orbiting sparks
    for (let k = 0; k < 3; k++) {
      const a = t * 3 + k * 2.09;
      ctx.fillStyle = rc; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawMachine(ctx: Ctx, st: GameState, t: number, cursor: Vec | null): void {
  const { cx, cy, r } = MACHINE;
  for (let i = 0; i < 3; i++) { // spinning coil rings
    ctx.strokeStyle = [COLORS.magenta, COLORS.cyan, COLORS.core][i]! + '88'; ctx.lineWidth = 2; glow(ctx, ctx.strokeStyle, 10);
    ctx.beginPath(); ctx.ellipse(cx, cy, r - i * 18, (r - i * 18) * 0.35, t * (0.6 + i * 0.3) + i, 0, Math.PI * 2); ctx.stroke(); noGlow(ctx);
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  glow(ctx, COLORS.core, 20 + pulse * 10); ctx.fillStyle = COLORS.core + '55'; hexPath(ctx, cx, cy, 34, t * 0.4); ctx.fill();
  ctx.strokeStyle = COLORS.core; ctx.lineWidth = 2; ctx.stroke(); noGlow(ctx);
  ctx.fillStyle = '#fff'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('◈', cx, cy + 1);
  ctx.textBaseline = 'alphabetic';

  const pityLine = collectionComplete(st) ? M.collectionDone(formatNumber(GACHA.maxedRefund))
    : legendaryPity(st) ? M.legendaryPity : M.pity(pullsToPity(st));
  ctx.fillStyle = legendaryPity(st) ? COLORS.amber : COLORS.sub; ctx.font = `11px ${FONT}`; ctx.fillText(pityLine, cx, PULL1.y - 14);
  ctx.textAlign = 'left';
  button(ctx, PULL1, M.pull1(formatNumber(GACHA.pullCost)), COLORS.cyan, canPull(st, 1), !!cursor && inRect(cursor, PULL1));
  button(ctx, PULL10, M.pull10(formatNumber(GACHA.pullCost * 10)), COLORS.magenta, canPull(st, 10), !!cursor && inRect(cursor, PULL10));
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(M.odds(GACHA.odds), cx, PULL1.y + 56);
  for (const [i, line] of wrapText(ctx, M.sources, 340).entries()) ctx.fillText(line, cx, PULL1.y + 74 + i * 13);
  ctx.textAlign = 'left';
}

function drawCollection(ctx: Ctx, st: GameState, v: MagnetronView, t: number): void {
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 11px ${FONT}`; ctx.fillText(M.collection, GRID.labelX, GRID.y - 18);
  ctx.fillStyle = COLORS.core; ctx.font = `11px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(M.totalBonus((lodestoneValueBonus(st) * 100).toFixed(0)), GRID.x + 4 * GRID.cellW + 3 * GRID.gap, GRID.y - 18);
  ctx.textAlign = 'left';
  RARITIES.forEach(r => { // column headers
    const c = cellRect('iron', r);
    ctx.fillStyle = RARITY_COLOR[r]; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(RARITY_TEXT[r].toUpperCase(), c.x + c.w / 2, GRID.y - 4); ctx.textAlign = 'left';
  });
  for (const el of ELEMENTS) {
    const row = cellRect(el, 'common');
    const full = LODESTONES.every(l => l.element !== el || (st.meta.lodestones[l.id] ?? 0) > 0);
    ctx.fillStyle = ELEMENT_COLOR[el]; ctx.font = `700 12px ${FONT}`; ctx.fillText(ELEMENT_TEXT[el].toUpperCase(), GRID.labelX, row.y + 30);
    ctx.fillStyle = full ? COLORS.amber : COLORS.sub; ctx.font = `9px ${FONT}`;
    ctx.fillText(M.setBonus((GACHA.setBonus * 100).toFixed(0)), GRID.labelX, row.y + 46);
    for (const rar of RARITIES) {
      const l = LODESTONES.find(x => x.element === el && x.rarity === rar)!, c = cellRect(el, rar), lv = st.meta.lodestones[l.id] ?? 0;
      const hover = v.hover?.element === el && v.hover.rarity === rar;
      ctx.fillStyle = hover ? 'rgba(0,229,255,.12)' : 'rgba(8,12,30,.85)';
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 8); ctx.fill();
      ctx.strokeStyle = lv ? RARITY_COLOR[rar] + '88' : 'rgba(95,155,179,.2)'; ctx.lineWidth = 1; ctx.stroke();
      drawStone(ctx, l, c.x + c.w / 2, c.y + 30, 17, t, lv > 0);
      ctx.textAlign = 'center'; ctx.font = `9px ${FONT}`;
      ctx.fillStyle = lv ? COLORS.text : COLORS.sub;
      ctx.fillText(lv ? (lv >= GACHA.maxLevel ? M.maxed : M.level(lv, GACHA.maxLevel)) : M.unknown, c.x + c.w / 2, c.y + c.h - 10);
      ctx.textAlign = 'left';
    }
  }
}

function drawTooltip(ctx: Ctx, st: GameState, v: MagnetronView, cursor: Vec): void {
  if (!v.hover) return;
  const l = LODESTONES.find(x => x.element === v.hover!.element && x.rarity === v.hover!.rarity)!;
  const lv = st.meta.lodestones[l.id] ?? 0, w = 250, rc = RARITY_COLOR[l.rarity];
  const lines = lv
    ? [`${M.level(lv, GACHA.maxLevel)}: ${lodestoneEffect(l, lv)}`, ...(lv < GACHA.maxLevel ? [`Next: ${lodestoneEffect(l, lv + 1)}`] : [])]
    : [M.notOwned, `Lv 1: ${lodestoneEffect(l, 1)}`];
  ctx.font = `11px ${FONT}`;
  const wrapped = lines.flatMap(s => wrapText(ctx, s, w - 24)), h = 44 + wrapped.length * 15;
  const x = Math.min(cursor.x + 16, W - w - 8), y = Math.min(cursor.y + 14, H - h - 8);
  glow(ctx, rc, 12); ctx.fillStyle = 'rgba(8,12,30,.97)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);
  ctx.textBaseline = 'top';
  ctx.fillStyle = lv ? rc : COLORS.sub; ctx.font = `700 12px ${FONT}`; ctx.fillText(lv ? lodestoneName(l).toUpperCase() : M.unknown, x + 12, y + 10);
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(`${RARITY_TEXT[l.rarity]} · ${ELEMENT_TEXT[l.element]}`, x + 12, y + 26);
  ctx.fillStyle = COLORS.text; ctx.font = `11px ${FONT}`; wrapped.forEach((s, i) => ctx.fillText(s, x + 12, y + 42 + i * 15));
  ctx.textBaseline = 'alphabetic';
}

function drawReveal(ctx: Ctx, v: MagnetronView, t: number): void {
  const res = v.results;
  if (!res) return;
  ctx.fillStyle = 'rgba(2,3,10,.75)'; ctx.fillRect(0, 0, W, H);
  glow(ctx, COLORS.core, 20); ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(REVEAL.x, REVEAL.y, REVEAL.w, REVEAL.h, 12); ctx.fill();
  ctx.strokeStyle = COLORS.core; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
  ctx.textAlign = 'center';
  res.forEach((r, i) => {
    const c = revealCard(i, res.length), k = Math.min(1, Math.max(0, (v.revealT - i * REVEAL_STEP) / 0.25));
    if (k <= 0) return;
    const rc = RARITY_COLOR[r.def.rarity], cx = c.x + c.w / 2;
    ctx.save(); ctx.translate(cx, c.y + c.h / 2); ctx.scale(k, 1); ctx.translate(-cx, -(c.y + c.h / 2)); // flip in
    glow(ctx, rc, r.def.rarity === 'legendary' ? 26 : 12);
    ctx.fillStyle = 'rgba(8,12,30,.95)'; ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 10); ctx.fill();
    ctx.strokeStyle = rc; ctx.lineWidth = 1.8; ctx.stroke(); noGlow(ctx);
    const big = res.length === 1;
    drawStone(ctx, r.def, cx, c.y + (big ? 62 : 44), big ? 32 : 22, t);
    ctx.fillStyle = rc; ctx.font = `700 ${big ? 13 : 10}px ${FONT}`; ctx.fillText(lodestoneName(r.def), cx, c.y + c.h - (big ? 52 : 36));
    ctx.fillStyle = COLORS.sub; ctx.font = `${big ? 11 : 9}px ${FONT}`; ctx.fillText(RARITY_TEXT[r.def.rarity], cx, c.y + c.h - (big ? 36 : 23));
    ctx.font = `700 ${big ? 12 : 10}px ${FONT}`;
    ctx.fillStyle = r.isNew ? COLORS.amber : r.refund ? COLORS.core : COLORS.text;
    ctx.fillText(r.isNew ? M.isNew : r.refund ? M.refund(r.refund) : M.levelUp(r.level), cx, c.y + c.h - (big ? 16 : 9));
    ctx.restore();
  });
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText('click to continue', REVEAL.x + REVEAL.w / 2, REVEAL.y + REVEAL.h - 14);
  ctx.textAlign = 'left';
}

export function drawMagnetron(ctx: Ctx, st: GameState, v: MagnetronView, cursor: Vec | null, t: number): void {
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(MACHINE.cx, MACHINE.cy, 0, MACHINE.cx, MACHINE.cy, 320);
  g.addColorStop(0, COLORS.core + '22'); g.addColorStop(1, COLORS.core + '00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(8,12,30,.85)'; ctx.fillRect(0, 0, W, MAG_TOP_BAR_H);
  ctx.strokeStyle = 'rgba(185,140,255,.35)'; ctx.beginPath(); ctx.moveTo(0, MAG_TOP_BAR_H + 0.5); ctx.lineTo(W, MAG_TOP_BAR_H + 0.5); ctx.stroke();
  ctx.textBaseline = 'middle';
  glow(ctx, COLORS.core, 10); ctx.fillStyle = COLORS.core; ctx.font = `700 15px ${FONT}`; ctx.fillText(M.title, 18, 22); noGlow(ctx);
  ctx.fillStyle = COLORS.sub; ctx.font = `11px ${FONT}`; ctx.fillText(M.subtitle, 130, 23);
  ctx.textAlign = 'right';
  glow(ctx, COLORS.core, 12); ctx.fillStyle = COLORS.core; ctx.font = `700 18px ${FONT}`;
  ctx.fillText(`◈ ${formatNumber(st.meta.crystals)}`, W - 150, 22); noGlow(ctx);
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(M.crystals, W - 18, 23);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  drawMachine(ctx, st, t, cursor);
  drawCollection(ctx, st, v, t);
  button(ctx, MAG_BACK, M.back, COLORS.cyan, true, !!cursor && inRect(cursor, MAG_BACK));
  if (cursor && !v.results) drawTooltip(ctx, st, v, cursor);
  drawReveal(ctx, v, t);
}

/** Collection cell under a point. */
export function cellAt(p: Vec): { element: Element; rarity: Rarity } | null {
  for (const element of ELEMENTS) for (const rarity of RARITIES) if (inRect(p, cellRect(element, rarity))) return { element, rarity };
  return null;
}
