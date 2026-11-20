/* Core tree screen (browse / spend Cores), the confirm dialog over it, and the polarity-flip animation. */
import { BRANCHES, NODES, parentsOf, type NodeDef } from '../data/prestige';
import { VIEW } from '../data/tuning';
import { canBuyNode, draftSummary, nodeCost, nodeLevel, nodeMaxed, nodeVisible, shiftGoal } from '../game/prestige';
import type { GameState, Vec } from '../game/types';
import { formatNumber, formatShort } from '../ui/format';
import { inRect, type Rect } from '../ui/layout';
import { BRANCH_TEXT, NODE_TEXT, S } from '../ui/strings';
import {
  AXES, CONFIRM, CONFIRM_BACK, CONFIRM_OK, TOP_BAR_H, TREE_BUTTONS, branchPoint, nodePos, nodeRadius, toScreen, type TreeView,
} from '../ui/treeLayout';
import { glow, hexPath, noGlow, wrapText, type Ctx } from './draw';
import { BRANCH_COLOR, COLORS, FONT } from './theme';

const W = VIEW.w, H = VIEW.h;

/** Node levels and spendable Cores shown on the tree: the draft while shifting, the saved tree otherwise. */
const shownNodes = (st: GameState, v: TreeView) => v.draft?.nodes ?? st.meta.nodes;
const shownCores = (st: GameState, v: TreeView) => v.draft?.cores ?? st.meta.cores;
const buyable = (v: TreeView, def: NodeDef) => v.mode === 'shift' && !!v.draft && canBuyNode(v.draft, def);

export interface TreeButton { rect: Rect; label: string; primary: boolean; action: 'back' | 'confirm' | 'undo' | 'notYet' }
export function treeButtons(v: TreeView): TreeButton[] {
  if (v.mode === 'browse') return [{ rect: TREE_BUTTONS.primary, label: S.treeBack, primary: true, action: 'back' }];
  return [
    { rect: TREE_BUTTONS.primary, label: S.treeShiftStart, primary: true, action: 'confirm' },
    { rect: TREE_BUTTONS.undo, label: S.treeUndo, primary: false, action: 'undo' },
    { rect: TREE_BUTTONS.notYet, label: S.treeNotYet, primary: false, action: 'notYet' },
  ];
}

function drawBackground(ctx: Ctx, v: TreeView, t: number): void {
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
  for (const b of BRANCHES) { // glow toward each compass direction + a big faint letter past the keystone
    const col = BRANCH_COLOR[b], p = toScreen(v, branchPoint(b, 420)), r = 300 * v.cam.z;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, col + '20'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const l = toScreen(v, branchPoint(b, 540));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col + '22'; ctx.font = `700 ${Math.round(110 * v.cam.z)}px ${FONT}`; ctx.fillText(b, l.x, l.y);
    ctx.fillStyle = col + '55'; ctx.font = `700 ${Math.round(13 * v.cam.z)}px ${FONT}`;
    ctx.fillText(BRANCH_TEXT[b].toUpperCase(), l.x, l.y + 70 * v.cam.z);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const c0 = toScreen(v, { x: 0, y: 0 });
  ctx.strokeStyle = 'rgba(185,140,255,.06)'; ctx.lineWidth = 1;
  for (let r = 90; r < 700; r += 90) { ctx.beginPath(); ctx.arc(c0.x, c0.y, r * v.cam.z, 0, Math.PI * 2); ctx.stroke(); }
  void t;
}

function drawEdges(ctx: Ctx, st: GameState, v: TreeView, t: number): void {
  const nodes = shownNodes(st, v);
  for (const n of NODES) {
    if (!nodeVisible(nodes, n)) continue;
    for (const pid of parentsOf(n)) {
      if (nodeLevel(nodes, pid) <= 0) continue;
      const parent = NODES.find(x => x.id === pid)!;
      const a = toScreen(v, nodePos(parent)), b = toScreen(v, nodePos(n));
      const col = BRANCH_COLOR[n.branch], on = nodeLevel(nodes, n.id) > 0;
      ctx.strokeStyle = on ? col : col + '55'; ctx.lineWidth = on ? 2.2 : 1.2;
      if (on) glow(ctx, col, 10); else { ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 20; }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]); noGlow(ctx);
    }
  }
}

function drawNodes(ctx: Ctx, st: GameState, v: TreeView, t: number): void {
  const nodes = shownNodes(st, v), cores = shownCores(st, v), z = v.cam.z;
  for (const n of NODES) {
    if (!nodeVisible(nodes, n)) continue;
    const p = toScreen(v, nodePos(n)), r = nodeRadius(n) * z, col = BRANCH_COLOR[n.branch];
    const lv = nodeLevel(nodes, n.id), canBuy = buyable(v, n);
    const pulse = 0.5 + 0.5 * Math.sin(t * 5 + p.x);
    if (lv > 0) {
      glow(ctx, col, v.hover === n ? 26 : 16);
      ctx.fillStyle = col + (nodeMaxed(nodes, n) ? 'cc' : '66'); hexPath(ctx, p.x, p.y, r, Math.PI / 6); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); noGlow(ctx);
    } else {
      if (canBuy) glow(ctx, col, 8 + pulse * 10);
      ctx.fillStyle = 'rgba(8,12,30,.9)'; hexPath(ctx, p.x, p.y, r, Math.PI / 6); ctx.fill();
      ctx.strokeStyle = canBuy ? col : col + '66'; ctx.lineWidth = canBuy ? 1.8 : 1.2;
      if (!canBuy) ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]); noGlow(ctx);
    }
    if (n.slot === 'key' || n.id === 'core') {
      ctx.strokeStyle = col + (lv ? 'aa' : '44'); ctx.lineWidth = 1;
      hexPath(ctx, p.x, p.y, r + 6 * z, Math.PI / 6 + t * 0.4); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = lv ? '#fff' : canBuy ? col : col + '99';
    ctx.font = `700 ${Math.round((n.slot === 'key' ? 15 : 12) * z)}px ${FONT}`;
    ctx.fillText(n.icon, p.x, p.y + 1);
    if (n.id !== 'core') { // level pips + next cost
      const yy = p.y + r + 9 * z;
      if (n.max > 1) for (let i = 0; i < n.max; i++) {
        ctx.fillStyle = i < lv ? col : col + '33';
        ctx.beginPath(); ctx.arc(p.x + (i - (n.max - 1) / 2) * 7 * z, yy, 2.2 * z, 0, Math.PI * 2); ctx.fill();
      }
      const ty = yy + (n.max > 1 ? 11 : 2) * z;
      ctx.font = `${Math.round(10 * z)}px ${FONT}`;
      if (!nodeMaxed(nodes, n)) {
        ctx.fillStyle = v.mode === 'shift' && cores >= nodeCost(nodes, n) ? COLORS.core : COLORS.sub;
        ctx.fillText(`${nodeCost(nodes, n)} ◆`, p.x, ty);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  for (const f of v.flashes) { // purchase rings
    const n = NODES.find(x => x.id === f.id)!, p = toScreen(v, nodePos(n)), k = 1 - f.life / 0.5, col = BRANCH_COLOR[n.branch];
    glow(ctx, col, 16); ctx.strokeStyle = col; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, (20 + k * 50) * z, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; noGlow(ctx);
  }
}

function drawButton(ctx: Ctx, rect: Rect, label: string, primary: boolean, hover: boolean, color: string = COLORS.cyan): void {
  const col = primary ? color : COLORS.sub;
  if (primary) glow(ctx, color, hover ? 20 : 10);
  ctx.fillStyle = primary ? (hover ? color + '40' : color + '1a') : hover ? 'rgba(95,155,179,.15)' : 'rgba(8,12,30,.8)';
  ctx.beginPath(); ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.stroke(); noGlow(ctx);
  ctx.fillStyle = primary && color === COLORS.magenta ? '#ffd0f5' : col;
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawHud(ctx: Ctx, st: GameState, v: TreeView, cursor: Vec | null): void {
  ctx.fillStyle = 'rgba(8,12,30,.85)'; ctx.fillRect(0, 0, W, TOP_BAR_H);
  ctx.strokeStyle = 'rgba(185,140,255,.35)'; ctx.beginPath(); ctx.moveTo(0, TOP_BAR_H + 0.5); ctx.lineTo(W, TOP_BAR_H + 0.5); ctx.stroke();
  ctx.textBaseline = 'middle';
  glow(ctx, COLORS.magenta, 10); ctx.fillStyle = COLORS.magenta; ctx.font = `700 15px ${FONT}`; ctx.fillText(S.treeTitle, 18, 22); noGlow(ctx);
  ctx.fillStyle = COLORS.sub; ctx.font = `11px ${FONT}`;
  if (v.mode === 'browse') {
    ctx.fillText(S.treePreview, 170, 23);
    ctx.fillStyle = COLORS.core; ctx.fillText(S.treePreviewHint(formatShort(shiftGoal(st.meta))), 340, 23);
  } else {
    ctx.fillText(S.treeShift(formatNumber(st.meta.shifts + 1)), 170, 23);
    ctx.fillStyle = COLORS.core; ctx.font = `700 12px ${FONT}`; ctx.fillText(S.treeGain(formatNumber(v.draft?.gained ?? 0)), 330, 23);
    ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(S.treeTentative, 500, 23);
  }
  ctx.textAlign = 'right';
  glow(ctx, COLORS.core, 12); ctx.fillStyle = COLORS.core; ctx.font = `700 18px ${FONT}`;
  ctx.fillText(`◆ ${formatNumber(shownCores(st, v))}`, W - 82, 22); noGlow(ctx);
  ctx.fillStyle = COLORS.sub; ctx.font = `11px ${FONT}`; ctx.fillText(S.treeCores, W - 18, 23);
  ctx.textAlign = 'left';

  // legend: compass rose (N up) with branch names, plus controls hint
  const cx = 52, cy = H - 52, R = 30;
  ctx.fillStyle = 'rgba(8,12,30,.85)'; ctx.beginPath(); ctx.roundRect(10, H - 126, 230, 118, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(185,140,255,.2)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = 'rgba(185,140,255,.25)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
  for (const b of BRANCHES) {
    const [u, s] = AXES[b], col = BRANCH_COLOR[b];
    glow(ctx, col, 6); ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(cx + u.x * R, cy + u.y * R); ctx.lineTo(cx + s.x * 4, cy + s.y * 4); ctx.lineTo(cx - s.x * 4, cy - s.y * 4);
    ctx.closePath(); ctx.fill(); noGlow(ctx);
    ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b, cx + u.x * (R + 8), cy + u.y * (R + 8));
  }
  ctx.textAlign = 'left';
  BRANCHES.forEach((b, i) => {
    const y = H - 79 + i * 17;
    ctx.fillStyle = BRANCH_COLOR[b]; ctx.font = `700 11px ${FONT}`; ctx.fillText(b, 100, y);
    ctx.fillStyle = COLORS.text; ctx.font = `11px ${FONT}`; ctx.fillText(BRANCH_TEXT[b], 116, y);
  });
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(95,155,179,.75)'; ctx.font = `9px ${FONT}`;
  ctx.fillText(v.mode === 'browse' ? S.treeHintBrowse : S.treeHintBuy, 20, H - 112);
  ctx.fillText(S.treeHintReveal, 20, H - 100);

  for (const b of treeButtons(v)) drawButton(ctx, b.rect, b.label, b.primary, !!cursor && inRect(cursor, b.rect));
}

function drawTooltip(ctx: Ctx, st: GameState, v: TreeView, cursor: Vec): void {
  const n = v.hover;
  if (!n) return;
  const nodes = shownNodes(st, v), cores = shownCores(st, v), lv = nodeLevel(nodes, n.id), col = BRANCH_COLOR[n.branch], w = 250;
  const text = NODE_TEXT[n.id]!;
  ctx.font = `11px ${FONT}`;
  const lines = wrapText(ctx, text.desc, w - 24), h = 66 + lines.length * 15;
  let x = cursor.x + 18, y = cursor.y + 14;
  if (x + w > W - 8) x = cursor.x - w - 18;
  if (y + h > H - 8) y = H - h - 8;
  glow(ctx, col, 12); ctx.fillStyle = 'rgba(8,12,30,.97)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke(); noGlow(ctx);
  ctx.textBaseline = 'top';
  ctx.fillStyle = col; ctx.font = `700 12px ${FONT}`; ctx.fillText(text.name.toUpperCase(), x + 12, y + 10);
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`;
  ctx.fillText(n.branch === 'core' ? 'POLARITY CORE' : `${n.branch} · ${BRANCH_TEXT[n.branch].toUpperCase()}`, x + 12, y + 27);
  ctx.fillStyle = COLORS.text; ctx.font = `11px ${FONT}`; lines.forEach((l, i) => ctx.fillText(l, x + 12, y + 44 + i * 15));
  let foot: string, footCol: string;
  if (n.id === 'core') { foot = S.nodeAlways; footCol = col; }
  else if (nodeMaxed(nodes, n)) { foot = S.nodeMax(formatNumber(lv), formatNumber(n.max)); footCol = col; }
  else {
    const cost = nodeCost(nodes, n), poor = cores < cost;
    foot = S.nodeNext(formatNumber(lv), formatNumber(n.max), formatNumber(cost)) + (v.mode === 'browse' ? S.nodePreview : poor ? S.nodePoor : '');
    footCol = v.mode === 'browse' ? COLORS.sub : poor ? COLORS.red : COLORS.core;
  }
  ctx.fillStyle = footCol; ctx.font = `700 10px ${FONT}`; ctx.fillText(foot, x + 12, y + h - 18);
  ctx.textBaseline = 'alphabetic';
}

export function drawTree(ctx: Ctx, st: GameState, v: TreeView, cursor: Vec | null, t: number): void {
  drawBackground(ctx, v, t);
  drawEdges(ctx, st, v, t);
  drawNodes(ctx, st, v, t);
  drawHud(ctx, st, v, cursor);
  if (cursor) drawTooltip(ctx, st, v, cursor);
}

export function drawConfirm(ctx: Ctx, st: GameState, v: TreeView, cursor: Vec | null, t: number): void {
  drawTree(ctx, st, { ...v, hover: null }, null, t);
  const M = CONFIRM, draft = v.draft;
  if (!draft) return;
  const { spent, bought } = draftSummary(st, draft);
  ctx.fillStyle = 'rgba(2,3,10,.72)'; ctx.fillRect(0, 0, W, H);
  glow(ctx, COLORS.magenta, 22); ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(M.x, M.y, M.w, M.h, 12); ctx.fill();
  ctx.strokeStyle = COLORS.magenta; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
  const cx = M.x + M.w / 2;
  ctx.textAlign = 'center';
  glow(ctx, COLORS.magenta, 14); ctx.fillStyle = COLORS.magenta; ctx.font = `700 20px ${FONT}`; ctx.fillText(S.confirmTitle, cx, M.y + 40); noGlow(ctx);
  glow(ctx, COLORS.core, 14); ctx.fillStyle = COLORS.core; ctx.font = `700 24px ${FONT}`; ctx.fillText(S.confirmGain(formatNumber(draft.gained)), cx, M.y + 78); noGlow(ctx);
  ctx.fillStyle = COLORS.text; ctx.font = `12px ${FONT}`;
  ctx.fillText(S.confirmSpent(formatNumber(spent), bought, formatNumber(draft.cores)), cx, M.y + 104);
  ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(S.confirmFormula(formatShort(shiftGoal(st.meta))), cx, M.y + 124);
  ctx.textAlign = 'left';
  const column = (x: number, title: string, color: string, items: string[]) => {
    ctx.fillStyle = color; ctx.font = `700 11px ${FONT}`; ctx.fillText(title, x, M.y + 156);
    ctx.fillStyle = COLORS.text; ctx.font = `11px ${FONT}`;
    items.forEach((s, i) => ctx.fillText(`· ${s}`, x, M.y + 176 + i * 17));
  };
  column(M.x + 30, S.confirmResets, COLORS.red, S.confirmResetList);
  column(M.x + 250, S.confirmKeeps, COLORS.cyan, S.confirmKeepList);
  drawButton(ctx, CONFIRM_OK, S.confirmOk, true, !!cursor && inRect(cursor, CONFIRM_OK), COLORS.magenta);
  drawButton(ctx, CONFIRM_BACK, S.confirmBack, false, !!cursor && inRect(cursor, CONFIRM_BACK));
}

/** Polarity flip: colors invert and rings spread from the Core; k goes 0 → 1. */
export function drawShiftAnim(ctx: Ctx, st: GameState, v: TreeView, k: number, t: number): void {
  drawTree(ctx, st, { ...v, hover: null }, null, t);
  const c = toScreen(v, { x: 0, y: 0 });
  ctx.save(); ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = `rgba(255,255,255,${Math.min(1, k * 2) * 0.9})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  for (const [off, col] of [[0, COLORS.magenta], [0.15, COLORS.cyan], [0.3, COLORS.core]] as const) {
    const kk = Math.max(0, k - off) / (1 - off);
    if (kk <= 0) continue;
    glow(ctx, col, 20); ctx.strokeStyle = col; ctx.lineWidth = 3 * (1 - kk) + 1; ctx.globalAlpha = 1 - kk;
    ctx.beginPath(); ctx.arc(c.x, c.y, kk * 1100, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; noGlow(ctx);
  }
  if (k > 0.55) { ctx.fillStyle = `rgba(4,5,12,${(k - 0.55) / 0.45})`; ctx.fillRect(0, 0, W, H); }
}

/** Node under a screen point (visible nodes only). */
export function nodeAt(st: GameState, v: TreeView, p: Vec): NodeDef | null {
  if (p.y < TOP_BAR_H) return null;
  const nodes = shownNodes(st, v);
  for (const n of NODES) {
    if (!nodeVisible(nodes, n)) continue;
    const s = toScreen(v, nodePos(n));
    if (Math.hypot(s.x - p.x, s.y - p.y) < (nodeRadius(n) + 4) * v.cam.z) return n;
  }
  return null;
}
