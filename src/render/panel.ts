import { VIEW } from '../data/tuning';
import { upgradeUnlockAt } from '../game/abilities';
import { magnetronUnlocked } from '../game/lodestones';
import { canBuy, isMaxed, nextCost } from '../game/shop';
import type { GameState, Vec } from '../game/types';
import { formatNumber, formatShort, formatUpgradeValue } from '../ui/format';
import { MAGNETRON_BUTTON, buttonRect, inRect, PANEL, rowAt, rowRect, visibleRows } from '../ui/layout';
import { M, S, UPGRADE_TEXT } from '../ui/strings';
import { glow, hexPath, noGlow, wrapText, type Ctx } from './draw';
import type { Effects } from './effects';
import { COLORS, FONT } from './theme';

export function drawPanel(ctx: Ctx, st: GameState, fx: Effects, cursor: Vec | null): void {
  const P = PANEL;
  ctx.save();
  glow(ctx, '#00e5ff', 12); ctx.fillStyle = COLORS.panel;
  ctx.beginPath(); ctx.roundRect(P.x, P.y, P.w, P.h, 10); ctx.fill();
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);

  ctx.textBaseline = 'middle';
  glow(ctx, COLORS.cyan, 8); ctx.fillStyle = COLORS.cyan; hexPath(ctx, P.x + 26, P.y + 33, 8, st.t * 0.8); ctx.fill(); noGlow(ctx);
  ctx.fillStyle = COLORS.text; ctx.font = `600 22px ${FONT}`; ctx.fillText(formatNumber(st.money), P.x + 42, P.y + 33);
  ctx.fillStyle = COLORS.sub; ctx.font = `12px ${FONT}`; ctx.fillText(S.perSecond(fx.incomePerSecond(st).toFixed(1)), P.x + 42, P.y + 54);
  fx.goalPops.forEach((g, i) => { // mini-goal payout rising from the wallet
    const k = 1 - g.life / 1.6;
    ctx.globalAlpha = Math.min(1, g.life / 0.4);
    glow(ctx, COLORS.amber, 12); ctx.fillStyle = COLORS.amber; ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(g.text, P.x + P.w - 14, P.y + 34 - k * 22 - i * 16); noGlow(ctx);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  });
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 11px ${FONT}`; ctx.fillText(S.upgradesTitle, P.x + 16, P.y + 82);
  if (magnetronUnlocked(st)) { // Magnetron button with the crystal count
    const b = MAGNETRON_BUTTON, hover = cursor !== null && inRect(cursor, b);
    glow(ctx, COLORS.core, hover ? 14 : 6); ctx.fillStyle = COLORS.core + (hover ? '40' : '18');
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill();
    ctx.strokeStyle = COLORS.core; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);
    ctx.fillStyle = COLORS.core; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(M.panelButton(formatNumber(st.meta.crystals)), b.x + b.w / 2, b.y + b.h / 2 + 1); ctx.textAlign = 'left';
  }

  visibleRows(st).forEach(({ def, locked }, i) => {
    const r = rowRect(i), b = buttonRect(i), lv = st.levels[def.id], flash = fx.flash[def.id] ?? 0;
    const text = UPGRADE_TEXT[def.id];
    ctx.fillStyle = flash > 0 ? `rgba(0,240,255,${0.25 * Math.min(1, flash / 0.3)})` : 'rgba(0,229,255,.05)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();

    if (locked) { // teaser for the next unlock
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(95,155,179,.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(230,251,255,.35)'; ctx.font = `600 13px ${FONT}`; ctx.fillText(text.name.toUpperCase(), r.x + 10, r.y + 15);
      ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(S.unlockHint(formatNumber(upgradeUnlockAt(st, def))), r.x + 10, r.y + 36);
      ctx.fillStyle = 'rgba(95,155,179,.6)'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(S.locked, b.x + b.w / 2, r.y + 15); ctx.textAlign = 'left';
      return;
    }

    const maxed = isMaxed(st, def), ok = canBuy(st, def), hover = cursor !== null && inRect(cursor, b);
    ctx.fillStyle = COLORS.text; ctx.font = `600 13px ${FONT}`; ctx.fillText(text.name.toUpperCase(), r.x + 10, r.y + 15);
    ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(S.level(formatNumber(lv), formatNumber(def.max), i + 1), r.x + 10, r.y + 30);
    const now = formatUpgradeValue(def.id, def.fx(lv));
    ctx.fillStyle = COLORS.text;
    ctx.fillText(maxed ? now : `${now} → ${formatUpgradeValue(def.id, def.fx(lv + 1))}`, r.x + 10, r.y + 43);

    ctx.textAlign = 'center';
    if (maxed) {
      ctx.fillStyle = COLORS.magenta; ctx.font = `700 12px ${FONT}`; ctx.fillText(S.max, b.x + b.w / 2, b.y + b.h / 2 + 1);
    } else {
      ctx.globalAlpha = ok ? 1 : 0.35;
      if (ok) glow(ctx, COLORS.cyan, hover ? 14 : 6);
      if (ok && hover) { ctx.fillStyle = 'rgba(0,240,255,.15)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill(); }
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 6); ctx.stroke(); noGlow(ctx);
      ctx.fillStyle = COLORS.cyan; ctx.font = `700 12px ${FONT}`; ctx.fillText(formatShort(nextCost(st, def)), b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  });
  ctx.restore();
}

/** Description bubble to the left of the hovered row. */
export function drawTooltip(ctx: Ctx, st: GameState, cursor: Vec | null): void {
  if (!cursor) return;
  const i = rowAt(st, cursor);
  if (i < 0) return;
  const { def, locked } = visibleRows(st)[i]!;
  const text = locked ? `${S.unlockHint(formatNumber(upgradeUnlockAt(st, def)))}.` : UPGRADE_TEXT[def.id].desc;
  const r = rowRect(i), w = 230;
  ctx.save();
  ctx.font = `11px ${FONT}`;
  const lines = wrapText(ctx, text, w - 24), h = 30 + lines.length * 15;
  const x = PANEL.x - w - 8, y = Math.min(r.y, VIEW.h - h - 10);
  glow(ctx, COLORS.cyan, 10); ctx.fillStyle = 'rgba(8,12,30,.96)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.magenta; ctx.font = `700 11px ${FONT}`;
  ctx.fillText(UPGRADE_TEXT[def.id].name.toUpperCase() + (locked ? ` · ${S.locked}` : ''), x + 12, y + 10);
  ctx.fillStyle = COLORS.text; ctx.font = `11px ${FONT}`;
  lines.forEach((l, k) => ctx.fillText(l, x + 12, y + 26 + k * 15));
  ctx.restore();
}
