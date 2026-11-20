import { readDebugOptions } from './debug';
import { BOARD, STEP, VIEW } from './data/tuning';
import { triggerPulse } from './game/abilities';
import { buy, canBuy } from './game/money';
import { step } from './game/simulation';
import { createState } from './game/state';
import { getStats } from './game/stats';
import type { GameEvent, Vec } from './game/types';
import { drawBoard } from './render/board';
import { Effects } from './render/effects';
import { drawPanel, drawTooltip } from './render/panel';
import { drawPrestigeBar } from './render/prestigeBar';
import { COLORS } from './render/theme';
import { AUTOSAVE_INTERVAL, clearSave, loadGame, saveGame } from './save/save';
import { setupInput } from './ui/input';
import { buttonRect, inRect, visibleRows } from './ui/layout';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dpr = Math.max(2, window.devicePixelRatio || 1);
canvas.width = VIEW.w * dpr;
canvas.height = VIEW.h * dpr;
ctx.scale(dpr, dpr);

// ---- state ----
const debug = readDebugOptions(location.search);
if (debug.reset) clearSave(localStorage);
const st = (!debug.noSave && loadGame(localStorage)) || createState((Date.now() ^ (Math.random() * 1e9)) >>> 0);
if (debug.earned) st.money = st.totalEarned = debug.earned;
const fx = new Effects();
const events: GameEvent[] = [];
let cursor: Vec | null = null;

const magnet = (): Vec | null => (cursor && inRect(cursor, BOARD) ? cursor : null);

function tick(): void {
  events.length = 0;
  step(st, STEP, magnet(), events);
  fx.handle(events, st);
  fx.update(STEP, st);
}
for (let i = 0; i < debug.warm / STEP; i++) tick();

// ---- input ----
function tryBuy(row: number): void {
  const r = visibleRows(st)[row];
  if (r && !r.locked && buy(st, r.def)) fx.flash[r.def.id] = 0.3;
}
setupInput(canvas, {
  onMove(p) {
    cursor = p;
    const overButton = visibleRows(st).some(({ def, locked }, i) => !locked && inRect(p, buttonRect(i)) && canBuy(st, def));
    canvas.style.cursor = inRect(p, BOARD) ? 'none' : overButton ? 'pointer' : 'default';
  },
  onLeave() { cursor = null; },
  onClick(p) { visibleRows(st).forEach((_, i) => { if (inRect(p, buttonRect(i))) tryBuy(i); }); },
  onPulse() {
    if (!triggerPulse(st)) return;
    const m = magnet();
    if (m) fx.pulseShock(m, getStats(st).range);
  },
  onRowKey: tryBuy,
});

// ---- saving ----
const save = (): void => { if (!debug.noSave) saveGame(st, localStorage); };
setInterval(save, AUTOSAVE_INTERVAL * 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

// ---- loop: fixed-step simulation, render every frame ----
let last = performance.now(), acc = 0;
function frame(now: number): void {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { tick(); acc -= STEP; }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  drawBoard(ctx, st, fx, magnet(), getStats(st));
  drawPrestigeBar(ctx, st);
  drawPanel(ctx, st, fx, cursor);
  drawTooltip(ctx, st, cursor);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
