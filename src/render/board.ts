import { ANTI, BOARD, COIN_RADIUS, COMBO, MAGNET_RADIUS, SPAWN_TIME } from '../data/tuning';
import { comboMult } from '../game/abilities';
import type { Stats } from '../game/stats';
import type { AntiWarning, Coin, GameState, Vec } from '../game/types';
import { formatNumber } from '../ui/format';
import { S } from '../ui/strings';
import { clamp, easeOutBack, glow, hexPath, noGlow, starPath, type Ctx } from './draw';
import type { Effects } from './effects';
import { drawBanner, drawHud } from './hud';
import { COLORS, FONT, tierColor } from './theme';

const B = BOARD;

function drawGrid(ctx: Ctx, st: GameState): void {
  const burst = st.event?.type === 'burst';
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(B.x, B.y, B.w, B.h);
  ctx.strokeStyle = burst ? `rgba(255,194,26,${0.09 + 0.05 * Math.sin(st.t * 8)})` : 'rgba(0,240,255,.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = B.x; x < B.x + B.w; x += 28) { ctx.moveTo(x + 0.5, B.y); ctx.lineTo(x + 0.5, B.y + B.h); }
  for (let y = B.y; y < B.y + B.h; y += 28) { ctx.moveTo(B.x, y + 0.5); ctx.lineTo(B.x + B.w, y + 0.5); }
  ctx.stroke();
}

function drawTrail(ctx: Ctx, c: Coin, trail: readonly Vec[], t: number): void {
  for (let k = 1; k < trail.length; k++) {
    const p0 = trail[k - 1]!, p1 = trail[k]!, a = k / trail.length;
    ctx.strokeStyle = tierColor(c.tier, t - (trail.length - k) * 0.03, c.phase);
    ctx.globalAlpha = a * (c.anti ? 0.3 : 0.5);
    ctx.lineWidth = COIN_RADIUS * 1.1 * a;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawCoin(ctx: Ctx, c: Coin, scale: number, t: number): void {
  if (scale <= 0) return;
  if (c.anti) { // spiky red star with an ×; fades and shrinks at the end of its life
    const f = clamp((ANTI.life - c.age) / ANTI.fade, 0, 1);
    ctx.globalAlpha *= f;
    scale *= 0.6 + 0.4 * f;
    const r = COIN_RADIUS * 1.1 * scale;
    glow(ctx, COLORS.red, 14);
    ctx.fillStyle = 'rgba(255,51,85,.18)'; ctx.strokeStyle = COLORS.red; ctx.lineWidth = 1.8;
    starPath(ctx, c.x, c.y, r * (1 + 0.1 * Math.sin(t * 12 + c.phase)), r * 0.5, 7, t * 1.5 + c.phase);
    ctx.fill(); ctx.stroke();
    const s = 3 * scale;
    ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(c.x - s, c.y - s); ctx.lineTo(c.x + s, c.y + s);
    ctx.moveTo(c.x + s, c.y - s); ctx.lineTo(c.x - s, c.y + s);
    ctx.stroke(); noGlow(ctx);
    return;
  }
  if (c.tier === 'basic') {
    glow(ctx, COLORS.cyan, 12);
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(0,240,255,.12)';
    hexPath(ctx, c.x, c.y, COIN_RADIUS * scale, t * 0.8 + c.phase); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bff9ff'; ctx.beginPath(); ctx.arc(c.x, c.y, 2.2 * scale, 0, Math.PI * 2); ctx.fill();
    noGlow(ctx);
    return;
  }
  const col = tierColor(c.tier, t, c.phase), prism = c.tier === 'prism';
  const r = COIN_RADIUS * (prism ? 1.35 : 1.15) * scale, pulse = 1 + 0.08 * Math.sin(t * 10 + c.phase);
  glow(ctx, col, prism ? 22 : 16);
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.fillStyle = prism ? 'rgba(255,255,255,.10)' : 'rgba(255,194,26,.16)';
  hexPath(ctx, c.x, c.y, r * pulse, t * 2 + c.phase); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.2; hexPath(ctx, c.x, c.y, r * 0.55, -t * 3 + c.phase); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y, 2.2 * scale, 0, Math.PI * 2); ctx.fill();
  if (prism) { // orbiting sparks
    for (let k = 0; k < 3; k++) {
      const a = t * 4 + k * 2.094 + c.phase;
      ctx.fillStyle = tierColor('prism', t + k * 0.3, c.phase);
      ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * r * 1.5, c.y + Math.sin(a) * r * 1.5, 1.8 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  noGlow(ctx);
}

function drawCoins(ctx: Ctx, st: GameState, fx: Effects): void {
  const t = st.t;
  for (const c of st.coins) {
    if (c.tier !== 'basic') drawTrail(ctx, c, fx.trailOf(c), t);
    if (c.age < SPAWN_TIME) { // spawn animation: subtle expanding ring + pop-in
      const k = c.age / SPAWN_TIME, col = tierColor(c.tier, t, c.phase);
      ctx.globalAlpha = 0.7 * (1 - k); ctx.strokeStyle = col; ctx.lineWidth = 1.5; glow(ctx, col, 6);
      ctx.beginPath(); ctx.arc(c.x, c.y, COIN_RADIUS * (1 + k * 2.4), 0, Math.PI * 2); ctx.stroke(); noGlow(ctx);
      ctx.globalAlpha = 0.7 + 0.3 * k;
      drawCoin(ctx, c, Math.max(0, easeOutBack(k)), t);
    } else {
      const edge = Math.min(c.x - B.x, B.x + B.w - c.x, c.y - B.y, B.y + B.h - c.y);
      ctx.globalAlpha = edge < 40 && !c.anti ? 0.45 + 0.55 * Math.abs(Math.sin(t * 9)) : 1;
      drawCoin(ctx, c, 1, t);
    }
    ctx.globalAlpha = 1;
  }
}

/** Anti-coin telegraph: two red rings closing in, a crosshair, a growing glow and a blinking "!". */
function drawWarning(ctx: Ctx, w: AntiWarning, t: number): void {
  const k = clamp(1 - w.t / ANTI.warn, 0, 1);
  ctx.save();
  const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 46);
  g.addColorStop(0, `rgba(255,51,85,${0.12 + 0.28 * k})`); g.addColorStop(1, 'rgba(255,51,85,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, 46, 0, Math.PI * 2); ctx.fill();
  glow(ctx, COLORS.red, 14); ctx.strokeStyle = COLORS.red;
  for (const off of [0, 0.35]) {
    const kk = (k + off) % 1;
    ctx.globalAlpha = 0.25 + 0.75 * kk; ctx.lineWidth = 1.5 + kk * 1.5;
    ctx.beginPath(); ctx.arc(w.x, w.y, COIN_RADIUS + (1 - kk) * 52, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 0.5 + 0.5 * k; ctx.lineWidth = 1.5;
  const a = 16, b = 26;
  ctx.beginPath();
  ctx.moveTo(w.x - b, w.y); ctx.lineTo(w.x - a, w.y); ctx.moveTo(w.x + a, w.y); ctx.lineTo(w.x + b, w.y);
  ctx.moveTo(w.x, w.y - b); ctx.lineTo(w.x, w.y - a); ctx.moveTo(w.x, w.y + a); ctx.lineTo(w.x, w.y + b);
  ctx.stroke();
  if (Math.sin(t * (14 + k * 26)) > 0) {
    ctx.globalAlpha = 1; ctx.fillStyle = COLORS.red; ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', w.x, w.y + 1);
  }
  ctx.restore();
}

function drawEffects(ctx: Ctx, st: GameState, fx: Effects): void {
  const t = st.t;
  for (const s of fx.shocks) {
    const k = 1 - s.life / s.max, col = s.kind === 'pulse' ? COLORS.magenta : tierColor(s.kind, t);
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = col; ctx.lineWidth = s.kind === 'pulse' ? 3 : 2; glow(ctx, col, 12);
    ctx.beginPath(); ctx.arc(s.x, s.y, 8 + k * s.radius, 0, Math.PI * 2); ctx.stroke(); noGlow(ctx);
  }
  for (const p of fx.parts) {
    ctx.globalAlpha = p.life / p.max; ctx.fillStyle = tierColor(p.tier, t, p.phase);
    const size = p.tier === 'basic' ? 3 : 4;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawMagnet(ctx: Ctx, st: GameState, m: Vec, range: number): void {
  const t = st.t;
  if (st.stunT > 0) { // short-circuited: flickering red core, no field
    const on = Math.sin(t * 40) > 0;
    ctx.strokeStyle = on ? COLORS.red : 'rgba(255,51,85,.3)'; ctx.lineWidth = 2.5; glow(ctx, COLORS.red, on ? 12 : 0);
    ctx.beginPath(); ctx.arc(m.x, m.y, MAGNET_RADIUS, 0, Math.PI * 2); ctx.stroke(); noGlow(ctx);
    ctx.fillStyle = COLORS.red; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(S.offline(st.stunT.toFixed(1)), m.x, m.y + MAGNET_RADIUS + 14); ctx.textAlign = 'left';
    return;
  }
  const pulsing = st.pulseT > 0;
  ctx.strokeStyle = `rgba(255,43,214,${pulsing ? 0.6 : 0.35})`; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const r = (t * (pulsing ? 120 : 30) + (i * range) / 3) % range;
    ctx.globalAlpha = 1 - r / range; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (pulsing) { ctx.fillStyle = 'rgba(255,43,214,.06)'; ctx.beginPath(); ctx.arc(m.x, m.y, range, 0, Math.PI * 2); ctx.fill(); }
  glow(ctx, COLORS.magenta, pulsing ? 18 : 10);
  ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = `rgba(255,43,214,${pulsing ? 0.9 : 0.6})`;
  ctx.beginPath(); ctx.arc(m.x, m.y, range, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineWidth = 2.5; ctx.strokeStyle = COLORS.magenta;
  ctx.beginPath(); ctx.arc(m.x, m.y, MAGNET_RADIUS, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd0f5'; ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI * 2); ctx.fill(); noGlow(ctx);

  if (st.combo >= 2) { // combo badge + timer arc
    const mult = comboMult(st.combo), k = Math.max(0, st.comboT / COMBO.window), hot = mult >= COMBO.max;
    const col = hot ? COLORS.amber : COLORS.magenta;
    ctx.strokeStyle = col; ctx.lineWidth = 2; glow(ctx, col, 8);
    ctx.beginPath(); ctx.arc(m.x, m.y, MAGNET_RADIUS + 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `700 ${hot ? 14 : 13}px ${FONT}`;
    ctx.fillText(`×${mult.toFixed(1)}`, m.x + 18, m.y - 14); noGlow(ctx);
    ctx.fillStyle = COLORS.sub; ctx.font = `10px ${FONT}`; ctx.fillText(S.combo(formatNumber(st.combo)), m.x + 18, m.y - 2);
  }
}

function drawFloats(ctx: Ctx, st: GameState, fx: Effects): void {
  ctx.textAlign = 'center';
  for (const f of fx.floats) {
    const rare = f.tier !== 'basic', col = rare ? tierColor(f.tier, st.t) : COLORS.pink;
    ctx.font = `700 ${f.tier === 'anti' ? 12 : rare ? 16 : 13}px ${FONT}`;
    ctx.globalAlpha = Math.min(1, f.life / 0.4);
    glow(ctx, rare ? col : COLORS.magenta, rare ? 12 : 8);
    ctx.fillStyle = col; ctx.fillText(f.text, f.x, f.y); noGlow(ctx);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

function drawFrame(ctx: Ctx, st: GameState): void {
  const burst = st.event?.type === 'burst';
  glow(ctx, COLORS.red, 10);
  ctx.strokeStyle = `rgba(255,51,85,${0.35 + 0.2 * Math.sin(st.t * 4)})`; ctx.lineWidth = 3; // escape edge
  ctx.beginPath(); ctx.roundRect(B.x + 1.5, B.y + 1.5, B.w - 3, B.h - 3, 9); ctx.stroke();
  const frame = burst ? COLORS.amber : COLORS.cyan;
  glow(ctx, frame, burst ? 18 : 12); ctx.strokeStyle = frame; ctx.lineWidth = burst ? 1.5 : 1;
  ctx.beginPath(); ctx.roundRect(B.x + 0.5, B.y + 0.5, B.w - 1, B.h - 1, 10); ctx.stroke(); noGlow(ctx);
}

export function drawBoard(ctx: Ctx, st: GameState, fx: Effects, magnet: Vec | null, stats: Stats): void {
  ctx.save();
  if (fx.shake > 0) {
    const s = (8 * fx.shake) / 0.3;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  ctx.save();
  ctx.beginPath(); ctx.roundRect(B.x, B.y, B.w, B.h, 10); ctx.clip();
  drawGrid(ctx, st);
  drawCoins(ctx, st, fx);
  for (const w of st.warnings) drawWarning(ctx, w, st.t);
  drawEffects(ctx, st, fx);
  if (magnet) drawMagnet(ctx, st, magnet, stats.range);
  drawFloats(ctx, st, fx);
  drawHud(ctx, st);
  drawBanner(ctx, fx);
  ctx.restore();
  drawFrame(ctx, st);
  ctx.restore();
}
