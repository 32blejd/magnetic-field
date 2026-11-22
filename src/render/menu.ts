/* Title screen, New Game confirm, pause menu, settings and the ⚙ button (look: docs/mockups/menu.html). */
import { VIEW } from '../data/tuning';
import type { GameState, Vec } from '../game/types';
import type { Settings } from '../save/settings';
import { LODESTONES } from '../data/lodestones';
import { bonuses } from '../game/prestige';
import { formatNumber, formatShort, formatTime } from '../ui/format';
import { inRect, PANEL, type Rect } from '../ui/layout';
import {
  ENDING_BUTTON, GEAR_BUTTON, NEWGAME_BOX, NEWGAME_CANCEL, NEWGAME_ERASE, PAUSE_BOX, PAUSE_BUTTONS, SETTINGS_BACK, SETTINGS_BOX, SETTINGS_LABEL_X,
  SLIDERS, TOGGLES, sliderHit, titleButtons,
} from '../ui/menuLayout';
import { MENU } from '../ui/strings';
import { glow, hexPath, noGlow, starPath, type Ctx } from './draw';
import { COLORS, FONT } from './theme';

interface TextOpts { size?: number; weight?: number; color?: string; align?: CanvasTextAlign }
function text(ctx: Ctx, s: string, x: number, y: number, { size = 12, weight = 400, color = COLORS.text, align = 'left' }: TextOpts = {}): void {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function box(ctx: Ctx, r: Rect, stroke: string, blur = 20): void {
  glow(ctx, stroke, blur); ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
}

interface ButtonOpts { primary?: boolean; danger?: boolean; hover?: boolean; sub?: string; key?: string }
/** Menu button: primary = filled magenta glow, danger = red, otherwise cyan outline. */
function button(ctx: Ctx, r: Rect, label: string, { primary = false, danger = false, hover = false, sub, key }: ButtonOpts = {}): void {
  const col = danger ? COLORS.red : primary ? COLORS.magenta : COLORS.cyan;
  if (primary || hover) glow(ctx, col, hover ? 20 : 10);
  ctx.fillStyle = primary ? col + (hover ? '40' : '1a') : hover ? (danger ? 'rgba(255,51,85,.12)' : 'rgba(0,240,255,.12)') : 'rgba(8,12,30,.85)';
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.stroke(); noGlow(ctx);
  const cy = r.y + r.h / 2 + (sub ? -6 : 1);
  text(ctx, label, r.x + r.w / 2, cy, { size: 14, weight: 700, color: primary && !danger ? '#ffd0f5' : col, align: 'center' });
  if (sub) text(ctx, sub, r.x + r.w / 2, r.y + r.h / 2 + 11, { size: 10, color: COLORS.sub, align: 'center' });
  if (key) text(ctx, key, r.x + r.w - 12, cy, { size: 10, color: COLORS.sub, align: 'right' });
}

const hov = (cursor: Vec | null, r: Rect): boolean => cursor !== null && inRect(cursor, r);
const dim = (ctx: Ctx): void => { ctx.fillStyle = 'rgba(2,3,10,.72)'; ctx.fillRect(0, 0, VIEW.w, VIEW.h); };

/** Title backdrop: a big slow magnet field with a few coins orbiting it. */
function fieldBackdrop(ctx: Ctx, t: number): void {
  const { w: W, h: H } = VIEW;
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,229,255,.05)'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const cx = 300, cy = 270;
  for (let i = 1; i <= 5; i++) {
    ctx.strokeStyle = `rgba(0,240,255,${0.18 - i * 0.03})`;
    ctx.beginPath(); ctx.arc(cx, cy, 40 * i + 6 * Math.sin(t + i), 0, Math.PI * 2); ctx.stroke();
  }
  glow(ctx, COLORS.cyan, 24); ctx.fillStyle = COLORS.cyan; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill(); noGlow(ctx);
  const coins: [number, number, string][] = [[0.3, 170, COLORS.amber], [1.9, 120, COLORS.cyan], [3.4, 210, COLORS.cyan], [4.6, 90, COLORS.amber], [5.6, 150, COLORS.pink]];
  for (const [a, r, col] of coins) {
    const x = cx + Math.cos(a + t * 0.3) * r, y = cy + Math.sin(a + t * 0.3) * r * 0.8;
    glow(ctx, col, 12); ctx.fillStyle = col; hexPath(ctx, x, y, 9, t); ctx.fill(); noGlow(ctx);
  }
}

/** One line describing the run: shift count and Cores after the first shift, else run time and coins. */
function runSummary(st: GameState): string {
  const time = formatTime(st.t);
  if (bonuses(st.meta).compassBroken) return MENU.endlessSummary(formatNumber(st.meta.shifts), time);
  return st.meta.shifts > 0
    ? MENU.shiftSummary(formatNumber(st.meta.shifts), formatNumber(st.meta.coresEarned), time)
    : MENU.firstRunSummary(time, formatShort(st.totalEarned));
}

export interface TitleInfo {
  /** There is a run to continue (a save, or a run left via Back to menu). */
  hasRun: boolean;
  /** Seconds since the last save, or null when unknown. */
  savedAgo: number | null;
  /** The save existed but couldn't be read. */
  unreadable: boolean;
}

export function drawTitle(ctx: Ctx, st: GameState, info: TitleInfo, cursor: Vec | null, t: number, autosave: number): void {
  fieldBackdrop(ctx, t);
  glow(ctx, COLORS.cyan, 20); text(ctx, MENU.logo1, 560, 130, { size: 46, weight: 700, color: COLORS.cyan }); noGlow(ctx);
  glow(ctx, COLORS.magenta, 20); text(ctx, MENU.logo2, 560, 182, { size: 46, weight: 700, color: COLORS.magenta }); noGlow(ctx);
  text(ctx, MENU.tagline, 562, 218, { size: 12, color: COLORS.sub });
  for (const { action, rect } of titleButtons(info.hasRun)) {
    const hover = hov(cursor, rect);
    if (action === 'continue') {
      const sub = info.savedAgo === null ? runSummary(st) : `${runSummary(st)} · ${MENU.savedAgo(info.savedAgo)}`;
      button(ctx, rect, MENU.continue, { primary: true, hover, sub, key: MENU.enterKey });
    } else if (action === 'new') {
      button(ctx, rect, MENU.newGame, { primary: !info.hasRun, hover, key: info.hasRun ? undefined : MENU.enterKey });
    } else button(ctx, rect, MENU.settings, { hover });
  }
  if (info.unreadable) text(ctx, MENU.saveUnreadable, 560, 470, { size: 11, color: COLORS.red });
  text(ctx, MENU.footer(String(autosave)), 560, 512, { size: 10, color: 'rgba(95,155,179,.6)' });
}

export function drawNewGameConfirm(ctx: Ctx, st: GameState, cursor: Vec | null): void {
  dim(ctx);
  const M = NEWGAME_BOX, cx = M.x + M.w / 2;
  box(ctx, M, COLORS.red, 22);
  glow(ctx, COLORS.red, 14); text(ctx, MENU.newGameTitle, cx, M.y + 40, { size: 20, weight: 700, color: COLORS.red, align: 'center' }); noGlow(ctx);
  text(ctx, MENU.newGameErased, cx, M.y + 80, { size: 12, align: 'center' });
  const time = formatTime(st.t);
  const line = st.meta.shifts > 0
    ? MENU.newGameShift(formatNumber(st.meta.shifts), formatNumber(st.meta.coresEarned), formatNumber(Object.keys(st.meta.lodestones).length), time)
    : MENU.newGameFirst(time, formatNumber(st.totalEarned));
  text(ctx, line, cx, M.y + 102, { size: 12, weight: 700, color: COLORS.core, align: 'center' });
  text(ctx, MENU.newGameWarning, cx, M.y + 130, { size: 11, color: COLORS.sub, align: 'center' });
  button(ctx, NEWGAME_ERASE, MENU.newGameErase, { danger: true, hover: hov(cursor, NEWGAME_ERASE) });
  button(ctx, NEWGAME_CANCEL, MENU.newGameCancel, { hover: hov(cursor, NEWGAME_CANCEL), key: MENU.escKey });
}

/** ⚙ in the panel header, with a "MENU [Esc]" hint while hovered. */
export function drawGear(ctx: Ctx, cursor: Vec | null): void {
  const { x, y, w, h } = GEAR_BUTTON, cx = x + w / 2, cy = y + h / 2, hover = hov(cursor, GEAR_BUTTON);
  ctx.save();
  if (hover) { glow(ctx, COLORS.cyan, 12); ctx.fillStyle = 'rgba(0,240,255,.15)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); noGlow(ctx); }
  ctx.strokeStyle = hover ? COLORS.cyan : COLORS.sub; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke();
  ctx.fillStyle = hover ? COLORS.cyan : COLORS.sub;
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * Math.PI) / 4); ctx.fillRect(-1.6, -8, 3.2, 4); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLORS.panel; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
  if (hover) { // hint bubble left of the panel
    const r = { x: PANEL.x - 150, y, w: 142, h: 26 };
    glow(ctx, COLORS.cyan, 8); ctx.fillStyle = 'rgba(8,12,30,.96)'; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 7); ctx.fill();
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 1.2; ctx.stroke(); noGlow(ctx);
    text(ctx, MENU.gearHint, r.x + r.w / 2, r.y + 14, { size: 11, weight: 700, color: COLORS.cyan, align: 'center' });
  }
  ctx.restore();
}

export function drawPause(ctx: Ctx, cursor: Vec | null): void {
  dim(ctx);
  const M = PAUSE_BOX, cx = M.x + M.w / 2;
  box(ctx, M, COLORS.cyan);
  glow(ctx, COLORS.cyan, 14); text(ctx, MENU.pauseTitle, cx, M.y + 38, { size: 22, weight: 700, color: COLORS.cyan, align: 'center' }); noGlow(ctx);
  text(ctx, MENU.pauseSub, cx, M.y + 62, { size: 10, color: COLORS.sub, align: 'center' });
  const label = { resume: MENU.resume, settings: MENU.settings, menu: MENU.backToMenu } as const;
  for (const { action, rect } of PAUSE_BUTTONS) {
    button(ctx, rect, label[action], { primary: action === 'resume', hover: hov(cursor, rect), key: action === 'resume' ? MENU.escKey : undefined });
  }
  text(ctx, MENU.pauseFoot, cx, M.y + 262, { size: 10, color: COLORS.sub, align: 'center' });
}

function slider(ctx: Ctx, label: string, y: number, track: Rect, value: number, hover: boolean): void {
  const placeholder = 'rgba(230,251,255,.45)'; // no sound yet: sliders are dimmed but work
  text(ctx, label, SETTINGS_LABEL_X, y, { size: 12, weight: 700, color: placeholder });
  ctx.fillStyle = 'rgba(95,155,179,.25)'; ctx.beginPath(); ctx.roundRect(track.x, track.y, track.w, track.h, 3); ctx.fill();
  ctx.globalAlpha = hover ? 0.75 : 0.45;
  glow(ctx, COLORS.cyan, 8); ctx.fillStyle = COLORS.cyan;
  ctx.beginPath(); ctx.roundRect(track.x, track.y, track.w * value, track.h, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(track.x + track.w * value, y, 7, 0, Math.PI * 2); ctx.fill(); noGlow(ctx);
  ctx.globalAlpha = 1;
  text(ctx, `${Math.round(value * 100)}%`, track.x + track.w + 16, y, { size: 12, color: COLORS.sub });
}

function toggle(ctx: Ctx, label: string, y: number, knob: Rect, on: boolean, note: string, hover: boolean): void {
  text(ctx, label, SETTINGS_LABEL_X, y, { size: 12, weight: 700, color: hover ? COLORS.cyan : COLORS.text });
  const bx = knob.x;
  ctx.fillStyle = on ? COLORS.green + '30' : 'rgba(95,155,179,.15)'; ctx.beginPath(); ctx.roundRect(bx, knob.y, knob.w, knob.h, 10); ctx.fill();
  ctx.strokeStyle = on ? COLORS.green : COLORS.sub; ctx.lineWidth = 1.2; ctx.stroke();
  if (on) glow(ctx, COLORS.green, 8);
  ctx.fillStyle = on ? COLORS.green : COLORS.sub; ctx.beginPath(); ctx.arc(on ? bx + 34 : bx + 10, y, 7, 0, Math.PI * 2); ctx.fill(); noGlow(ctx);
  text(ctx, on ? MENU.on : MENU.off, bx + 56, y, { size: 12, color: on ? COLORS.green : COLORS.sub });
  text(ctx, note, bx + 100, y, { size: 10, color: COLORS.sub });
}

/** Settings dialog; drawn over the title screen or the frozen run (the caller draws the backdrop). */
export function drawSettings(ctx: Ctx, s: Settings, fullscreen: boolean, cursor: Vec | null, dragging: string | null): void {
  dim(ctx);
  const M = SETTINGS_BOX, cx = M.x + M.w / 2, x = SETTINGS_LABEL_X;
  box(ctx, M, COLORS.cyan);
  glow(ctx, COLORS.cyan, 14); text(ctx, MENU.settingsTitle, cx, M.y + 38, { size: 22, weight: 700, color: COLORS.cyan, align: 'center' }); noGlow(ctx);
  text(ctx, MENU.sound, x, M.y + 80, { size: 11, weight: 700, color: COLORS.magenta });
  text(ctx, MENU.soundSoon, x + 70, M.y + 80, { size: 10, color: COLORS.sub });
  for (const { id, y, track } of SLIDERS) {
    const hover = dragging === id || (dragging === null && hov(cursor, sliderHit(track)));
    slider(ctx, MENU.volume[id], y, track, s[id], hover);
  }
  text(ctx, MENU.display, x, M.y + 226, { size: 11, weight: 700, color: COLORS.magenta });
  for (const { id, y, knob, hit } of TOGGLES) {
    const hover = dragging === null && hov(cursor, hit);
    if (id === 'screenShake') toggle(ctx, MENU.screenShake, y, knob, s.screenShake, MENU.screenShakeNote, hover);
    else toggle(ctx, MENU.fullscreen, y, knob, fullscreen, MENU.fullscreenNote, hover);
  }
  button(ctx, SETTINGS_BACK, MENU.back, { hover: hov(cursor, SETTINGS_BACK), key: MENU.escKey });
}

/** The ending: a star bursts out of a cracked compass rose, the thank-you text and stats fade in, then PLAY ON starts endless. */
export function drawEnding(ctx: Ctx, st: GameState, cursor: Vec | null, t: number): void {
  const { w: W, h: H } = VIEW, cx = W / 2, cy = 150, gold = '#ffd76a';
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
  const k = Math.min(1, t / 1.5); // intro
  for (let i = 0; i < 16; i++) { // the rose, its points flying apart
    const a = (i * Math.PI) / 8 - Math.PI / 2, card = i % 4 === 0, len = (card ? 120 : i % 2 === 0 ? 90 : 65) * (0.6 + 0.4 * k);
    const off = 18 * k + 4 * Math.sin(t * 1.5 + i), wdt = card ? 9 : 6;
    const bx = cx + Math.cos(a) * off, by = cy + Math.sin(a) * off * 0.85, tip = { x: bx + Math.cos(a) * len, y: by + Math.sin(a) * len * 0.85 };
    const g = ctx.createLinearGradient(bx, by, tip.x, tip.y);
    g.addColorStop(0, 'rgba(185,140,255,.05)'); g.addColorStop(1, card ? 'rgba(255,215,106,.7)' : 'rgba(185,140,255,.45)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(bx - Math.sin(a) * wdt, by + Math.cos(a) * wdt); ctx.lineTo(bx + Math.sin(a) * wdt, by - Math.cos(a) * wdt); ctx.closePath(); ctx.fill();
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
  glow(ctx, gold, 26 + pulse * 14); ctx.fillStyle = gold; starPath(ctx, cx, cy, 24 + 8 * k, 10 + 3 * k, 5, -Math.PI / 2 + t * 0.2); ctx.fill(); noGlow(ctx);

  ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.6) / 1));
  text(ctx, MENU.endTitle, cx, 290, { size: 14, weight: 700, color: COLORS.core, align: 'center' });
  glow(ctx, gold, 22); text(ctx, MENU.endThanks, cx, 328, { size: 34, weight: 700, color: gold, align: 'center' }); noGlow(ctx);
  const stones = LODESTONES.filter(l => (st.meta.lodestones[l.id] ?? 0) > 0).length;
  text(ctx, MENU.endStats(formatNumber(st.meta.shifts), formatNumber(st.meta.coresEarned), formatNumber(stones)), cx, 368, { size: 12, color: COLORS.text, align: 'center' });
  text(ctx, MENU.endEndless, cx, 392, { size: 11, color: COLORS.sub, align: 'center' });
  text(ctx, MENU.endCredits, cx, 414, { size: 10, color: 'rgba(95,155,179,.7)', align: 'center' });
  ctx.globalAlpha = Math.min(1, Math.max(0, (t - 1.6) / 0.6));
  button(ctx, ENDING_BUTTON, MENU.endPlayOn, { primary: true, hover: hov(cursor, ENDING_BUTTON), key: MENU.enterKey });
  ctx.globalAlpha = 1;
}
