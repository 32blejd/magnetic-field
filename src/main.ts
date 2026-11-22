import { readDebugOptions } from './debug';
import { BOARD, STEP, VIEW } from './data/tuning';
import { triggerPulse } from './game/abilities';
import { magnetronUnlocked, pullMany } from './game/lodestones';
import {
  autoShiftDue, bonuses, buyNode, canShift, commitAutoShift, commitShift, nextAutoShiftTarget, refundNode, resetDraft, shiftGoal, startDraft,
  treeUnlocked,
} from './game/prestige';
import { buy, buyMax, canBuy } from './game/shop';
import { step } from './game/simulation';
import { createState } from './game/state';
import { getStats } from './game/stats';
import type { GameEvent, GameState, Vec } from './game/types';
import { drawBoard } from './render/board';
import { Effects } from './render/effects';
import { drawPanel, drawTooltip } from './render/panel';
import { autoShiftVisible, drawPrestigeBar, prestigeButtonAction } from './render/prestigeBar';
import { COLORS } from './render/theme';
import { cellAt, drawMagnetron } from './render/magnetron';
import { drawConfirm, drawShiftAnim, drawTree, nodeAt, treeButtons } from './render/tree';
import { drawGear, drawNewGameConfirm, drawPause, drawSettings, drawTitle } from './render/menu';
import { AUTOSAVE_INTERVAL, clearSave, loadGame, saveGame, type LoadResult } from './save/save';
import { loadSettings, saveSettings, type VolumeId } from './save/settings';
import { rowKey, setupInput } from './ui/input';
import { AUTO_BUY_BUTTON, AUTO_SHIFT_BUTTON, MAGNETRON_BUTTON, PRESTIGE_BUTTON, buttonRect, inRect, visibleRows } from './ui/layout';
import { MAG_BACK, PULL1, PULL10, newMagnetronView, type MagnetronView } from './ui/magnetronLayout';
import {
  GEAR_BUTTON, NEWGAME_CANCEL, NEWGAME_ERASE, PAUSE_BUTTONS, SETTINGS_BACK, SLIDERS, TOGGLES, sliderHit, sliderValue, titleButtons,
} from './ui/menuLayout';
import { formatNumber, formatShort } from './ui/format';
import { S } from './ui/strings';
import { CONFIRM_BACK, CONFIRM_OK, newTreeView, zoomAt, type TreeMode, type TreeView } from './ui/treeLayout';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dpr = Math.max(2, window.devicePixelRatio || 1);
canvas.width = VIEW.w * dpr;
canvas.height = VIEW.h * dpr;
ctx.scale(dpr, dpr);

// ---- state ----
const debug = readDebugOptions(location.search);
if (debug.reset) clearSave(localStorage);
const loaded: LoadResult = debug.noSave ? { state: null, movedToBackup: false, savedAt: null } : loadGame(localStorage);
// A new run gets a random seed; from then on all game randomness comes from the state's RNG.
const newSeed = (): number => (Date.now() ^ (Math.random() * 1e9)) >>> 0;
let st: GameState = loaded.state ?? createState(newSeed());
/** There is a run to continue: a loaded save, or a run started this session. */
let hasRun = loaded.state !== null || debug.skipTitle;
/** A run is being played (not on the title screen) – only then is the game saved, so opening the title never writes a save. */
let inGame = debug.skipTitle;
let savedAt = loaded.savedAt;
const settings = loadSettings(localStorage);
if (debug.earned) st.money = st.totalEarned = debug.earned;
if (debug.cores) st.meta.cores = debug.cores;
if (debug.crystals) st.meta.crystals = debug.crystals;
if (debug.shifts) st.meta.shifts = debug.shifts;
if (debug.pulls) { st.meta.crystals += debug.pulls * 10; pullMany(st, debug.pulls); }
if (debug.nodes) st.meta.nodes = { ...st.meta.nodes, ...debug.nodes };
const fx = new Effects();
fx.shakeOn = settings.screenShake;
if (loaded.movedToBackup) fx.banner(S.saveUnreadable.title, S.saveUnreadable.sub, COLORS.red, 6);
const events: GameEvent[] = [];
let cursor: Vec | null = null;

/** title = title screen · newgame = erase confirm over it · run = playing · pause = pause menu · settings (from the title or the pause menu) ·
    tree = Core tree (browse or spend) · confirm = dialog over the tree · shift = polarity-flip animation · gacha = Magnetron */
type Screen = 'title' | 'newgame' | 'run' | 'pause' | 'settings' | 'tree' | 'confirm' | 'shift' | 'gacha';
let magnetron: MagnetronView | null = null;
let screen: Screen = debug.skipTitle ? 'run' : 'title'; // debug URL params start the run directly
let settingsFrom: 'title' | 'pause' = 'title';
let dragSlider: VolumeId | null = null;
let tree: TreeView | null = null;
let shiftAnim = 0;
const SHIFT_ANIM = 1.1;
let uiTime = 0; // keeps UI animations running while the simulation is paused

// Magnet Memory: the field keeps working at the last board position for 1 s after the cursor leaves the board
let lastBoardPos: Vec | null = null, memoryUntil = 0;
function magnet(): Vec | null {
  if (cursor && inRect(cursor, BOARD)) { lastBoardPos = cursor; memoryUntil = st.t + 1; return cursor; }
  return bonuses(st.meta).magnetMemory && lastBoardPos && st.t < memoryUntil ? lastBoardPos : null;
}

function tick(): void {
  events.length = 0;
  step(st, STEP, magnet(), events);
  fx.handle(events, st);
  fx.update(STEP, st);
  if (autoShiftDue(st)) autoShift();
}

/** Auto-shift: restart the run on the spot, banking this run's Cores (no tree screen, no pause). */
function autoShift(): void {
  const gained = commitAutoShift(st);
  fx.reset();
  fx.banner(S.autoShiftDone(formatNumber(st.meta.shifts)), S.autoShiftDoneSub(formatNumber(gained), formatNumber(st.meta.cores), formatShort(shiftGoal(st.meta))), COLORS.green, 4);
  lastBoardPos = null;
  save();
}
function cycleAutoShift(): void {
  if (!autoShiftVisible(st)) return;
  st.meta.autoShift = nextAutoShiftTarget(st.meta.autoShift);
  save();
}
/** Pause / resume the Auto-buyer (only once its node is owned). */
function toggleAutoBuy(): void {
  if (!bonuses(st.meta).autoBuy) return;
  st.meta.autoBuyOff = !st.meta.autoBuyOff;
  save();
}
for (let i = 0; i < debug.warm / STEP; i++) tick();

// ---- screens ----
/** Title → play: CONTINUE keeps the current run, NEW GAME replaces it (after the erase confirm, if there was one). */
function play(fresh: boolean): void {
  if (fresh && hasRun) {
    if (!debug.noSave) clearSave(localStorage);
    st = createState(newSeed());
    fx.reset();
    lastBoardPos = null;
  }
  hasRun = inGame = true;
  screen = 'run';
  save();
}
function backToMenu(): void { save(); inGame = false; screen = 'title'; }
function openSettings(from: 'title' | 'pause'): void { settingsFrom = from; screen = 'settings'; }
function closeSettings(): void { dragSlider = null; saveSettings(settings, localStorage); screen = settingsFrom; }
function setVolume(id: VolumeId, x: number): void {
  const s = SLIDERS.find(r => r.id === id);
  if (s) settings[id] = Math.round(sliderValue(s.track, x) * 100) / 100;
}
function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
function openTree(mode: TreeMode): void {
  tree = newTreeView(mode, mode === 'shift' ? startDraft(st) : null);
  screen = 'tree';
}
function closeTree(): void { tree = null; screen = 'run'; }
function openMagnetron(): void { if (magnetronUnlocked(st)) { magnetron = newMagnetronView(); screen = 'gacha'; } }
function closeMagnetron(): void { magnetron = null; screen = 'run'; }
function doPull(count: number): void {
  if (!magnetron) return;
  const res = pullMany(st, count);
  if (res.length) { magnetron.results = res; magnetron.revealT = 0; save(); }
}
function finishShift(): void {
  if (!tree?.draft) return;
  commitShift(st, tree.draft);
  fx.reset();
  fx.banner(S.shiftDone(String(st.meta.shifts)), S.shiftDoneSub(formatShort(shiftGoal(st.meta))), COLORS.core, 4);
  lastBoardPos = null;
  save();
  closeTree();
}

if (debug.open === 'shift' && canShift(st)) openTree('shift');
else if (debug.open === 'browse') openTree('browse');
else if (debug.open === 'gacha') openMagnetron();

// ---- input ----
function tryBuy(row: number, bulk: boolean): void {
  const r = visibleRows(st)[row];
  if (!r || r.locked) return;
  const bought = bulk && bonuses(st.meta).bulkBuy ? buyMax(st, r.def) > 0 : buy(st, r.def);
  if (bought) fx.flash[r.def.id] = 0.3;
}
function pressPrestigeButton(): void {
  const action = prestigeButtonAction(st);
  if (action) openTree(action);
}
function treeAction(action: 'back' | 'confirm' | 'undo' | 'reset' | 'notYet'): void {
  if (!tree) return;
  if (action === 'back' || action === 'notYet') closeTree();
  else if (action === 'confirm') screen = 'confirm';
  else if (action === 'reset') { if (tree.draft) resetDraft(tree.draft); } // free respec; UNDO brings the saved tree back
  else tree.draft = startDraft(st);
}
function menuPointer(p: Vec): boolean {
  switch (screen) {
    case 'title': return titleButtons(hasRun).some(b => inRect(p, b.rect));
    case 'newgame': return inRect(p, NEWGAME_ERASE) || inRect(p, NEWGAME_CANCEL);
    case 'pause': return PAUSE_BUTTONS.some(b => inRect(p, b.rect));
    case 'settings':
      return dragSlider !== null || inRect(p, SETTINGS_BACK) || SLIDERS.some(s => inRect(p, sliderHit(s.track))) || TOGGLES.some(t => inRect(p, t.hit));
    default: return false;
  }
}
function updateCursorStyle(p: Vec): void {
  let pointer = false;
  if (screen === 'title' || screen === 'newgame' || screen === 'pause' || screen === 'settings') {
    canvas.style.cursor = menuPointer(p) ? 'pointer' : 'default';
  } else if (screen === 'run') {
    pointer = (inRect(p, PRESTIGE_BUTTON) && prestigeButtonAction(st) !== null) || (inRect(p, MAGNETRON_BUTTON) && magnetronUnlocked(st)) ||
      (inRect(p, AUTO_SHIFT_BUTTON) && autoShiftVisible(st)) || (inRect(p, AUTO_BUY_BUTTON) && bonuses(st.meta).autoBuy) || inRect(p, GEAR_BUTTON) ||
      visibleRows(st).some(({ def, locked }, i) => !locked && inRect(p, buttonRect(i)) && canBuy(st, def));
    canvas.style.cursor = inRect(p, BOARD) ? 'none' : pointer ? 'pointer' : 'default';
  } else if (screen === 'tree' && tree) {
    pointer = treeButtons(tree).some(b => inRect(p, b.rect)) || (!!tree.hover && !!tree.draft && tree.mode === 'shift');
    canvas.style.cursor = tree.drag?.moved ? 'grabbing' : pointer ? 'pointer' : 'grab';
  } else if (screen === 'gacha') {
    canvas.style.cursor = magnetron?.results || inRect(p, PULL1) || inRect(p, PULL10) || inRect(p, MAG_BACK) ? 'pointer' : 'default';
  } else {
    canvas.style.cursor = screen === 'confirm' && (inRect(p, CONFIRM_OK) || inRect(p, CONFIRM_BACK)) ? 'pointer' : 'default';
  }
}

setupInput(canvas, {
  onMove(p) {
    cursor = p;
    if (screen === 'settings' && dragSlider) setVolume(dragSlider, p.x);
    if (screen === 'tree' && tree) {
      const d = tree.drag;
      if (d) {
        const dx = p.x - d.start.x, dy = p.y - d.start.y;
        if (Math.hypot(dx, dy) > 4) d.moved = true;
        if (d.moved) { tree.cam.x = d.cam.x - dx / tree.cam.z; tree.cam.y = d.cam.y - dy / tree.cam.z; }
      }
      tree.hover = nodeAt(st, tree, p);
    }
    if (screen === 'gacha' && magnetron) magnetron.hover = cellAt(p);
    updateCursorStyle(p);
  },
  onLeave() { cursor = null; if (tree) tree.hover = null; if (magnetron) magnetron.hover = null; },
  onDown(p) {
    if (screen === 'settings') {
      const s = SLIDERS.find(r => inRect(p, sliderHit(r.track)));
      if (s) { dragSlider = s.id; setVolume(s.id, p.x); }
    }
    if (screen === 'tree' && tree) tree.drag = { start: p, cam: { x: tree.cam.x, y: tree.cam.y }, moved: false };
  },
  onUp(p, shift) {
    if (screen === 'title') {
      const b = titleButtons(hasRun).find(r => inRect(p, r.rect));
      if (b?.action === 'continue') play(false);
      else if (b?.action === 'new') { if (hasRun) screen = 'newgame'; else play(true); }
      else if (b?.action === 'settings') openSettings('title');
    } else if (screen === 'newgame') {
      if (inRect(p, NEWGAME_ERASE)) play(true);
      else if (inRect(p, NEWGAME_CANCEL)) screen = 'title';
    } else if (screen === 'pause') {
      const b = PAUSE_BUTTONS.find(r => inRect(p, r.rect));
      if (b?.action === 'resume') screen = 'run';
      else if (b?.action === 'settings') openSettings('pause');
      else if (b?.action === 'menu') backToMenu();
    } else if (screen === 'settings') {
      if (dragSlider) { dragSlider = null; saveSettings(settings, localStorage); return; }
      if (inRect(p, SETTINGS_BACK)) { closeSettings(); return; }
      const t = TOGGLES.find(r => inRect(p, r.hit));
      if (t?.id === 'screenShake') { settings.screenShake = fx.shakeOn = !settings.screenShake; saveSettings(settings, localStorage); }
      else if (t?.id === 'fullscreen') toggleFullscreen();
    } else if (screen === 'run') {
      if (inRect(p, GEAR_BUTTON)) { screen = 'pause'; return; }
      if (inRect(p, PRESTIGE_BUTTON)) { pressPrestigeButton(); return; }
      if (inRect(p, MAGNETRON_BUTTON)) { openMagnetron(); return; }
      if (inRect(p, AUTO_SHIFT_BUTTON) && autoShiftVisible(st)) { cycleAutoShift(); return; }
      if (inRect(p, AUTO_BUY_BUTTON) && bonuses(st.meta).autoBuy) { toggleAutoBuy(); return; }
      visibleRows(st).forEach((_, i) => { if (inRect(p, buttonRect(i))) tryBuy(i, shift); });
    } else if (screen === 'tree' && tree) {
      const drag = tree.drag;
      tree.drag = null;
      if (drag?.moved) return;
      const btn = treeButtons(tree).find(b => inRect(p, b.rect));
      if (btn) { treeAction(btn.action); return; }
      const n = nodeAt(st, tree, p);
      if (n && tree.mode === 'shift' && tree.draft && buyNode(tree.draft, n)) tree.flashes.push({ id: n.id, life: 0.5 });
    } else if (screen === 'gacha' && magnetron) {
      if (magnetron.results) { magnetron.results = null; return; } // dismiss the reveal
      if (inRect(p, PULL1)) doPull(1);
      else if (inRect(p, PULL10)) doPull(10);
      else if (inRect(p, MAG_BACK)) closeMagnetron();
    } else if (screen === 'confirm') {
      if (inRect(p, CONFIRM_OK)) { screen = 'shift'; shiftAnim = 0; }
      else if (inRect(p, CONFIRM_BACK)) screen = 'tree';
    }
  },
  onWheel(p, dy) { if (screen === 'tree' && tree) zoomAt(tree, p, dy < 0 ? 1.1 : 1 / 1.1); },
  onRightClick(p) {
    if (screen === 'run') pulse();
    else if (screen === 'tree' && tree?.mode === 'shift' && tree.draft) { // refund one level of the node under the cursor
      const n = nodeAt(st, tree, p);
      if (n && refundNode(tree.draft, n)) tree.flashes.push({ id: n.id, life: 0.5 });
    }
  },
  onKey(code, shift) {
    if (code === 'F11') { toggleFullscreen(); return true; }
    if (screen === 'title') {
      if (code === 'Enter') play(!hasRun);
      return false;
    }
    if (screen === 'newgame') { if (code === 'Escape') screen = 'title'; return false; }
    if (screen === 'pause') { if (code === 'Escape') screen = 'run'; return false; }
    if (screen === 'settings') { if (code === 'Escape') closeSettings(); return false; }
    if (screen === 'run') {
      if (code === 'Escape') { screen = 'pause'; return true; }
      if (code === 'Space') { pulse(); return true; }
      if (code === 'KeyT' && treeUnlocked(st)) openTree('browse');
      if (code === 'KeyP' && canShift(st)) openTree('shift');
      if (code === 'KeyG') openMagnetron();
      if (code === 'KeyA') cycleAutoShift();
      if (code === 'KeyB') toggleAutoBuy();
      const row = rowKey(code);
      if (row >= 0) tryBuy(row, shift);
      return false;
    }
    if (screen === 'gacha' && magnetron && (code === 'Escape' || code === 'KeyG')) { if (magnetron.results) magnetron.results = null; else closeMagnetron(); }
    else if (screen === 'tree' && tree && (code === 'Escape' || (code === 'KeyT' && tree.mode === 'browse'))) closeTree();
    else if (screen === 'confirm' && code === 'Escape') screen = 'tree';
    else if (screen === 'confirm' && code === 'Enter') { screen = 'shift'; shiftAnim = 0; }
    return code === 'Space';
  },
});

function pulse(): void {
  if (!triggerPulse(st)) return;
  const m = magnet();
  if (m) fx.pulseShock(m, getStats(st).range);
}

// ---- saving ----
function save(): void {
  if (debug.noSave || !inGame) return;
  saveGame(st, localStorage);
  savedAt = Date.now();
}
setInterval(save, AUTOSAVE_INTERVAL * 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

// ---- loop: fixed-step simulation while playing, render every frame ----
let last = performance.now(), acc = 0;
function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  uiTime += dt;
  if (screen === 'run') {
    acc += dt * debug.speed; // ?speed=N: more fixed steps per frame, never a longer step
    while (acc >= STEP) { tick(); acc -= STEP; }
  } else acc = 0; // the run is paused while the Core tree is open
  if (magnetron) magnetron.revealT += dt;
  if (tree) { for (const f of tree.flashes) f.life -= dt; tree.flashes = tree.flashes.filter(f => f.life > 0); }
  if (screen === 'shift' && (shiftAnim += dt) >= SHIFT_ANIM) finishShift();
  if (cursor) updateCursorStyle(cursor); // also right after a screen change, not only on mouse moves

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const overTitle = screen === 'title' || screen === 'newgame' || (screen === 'settings' && settingsFrom === 'title');
  const overRun = screen === 'pause' || (screen === 'settings' && settingsFrom === 'pause');
  if (overTitle) {
    const info = { hasRun, savedAgo: savedAt === null ? null : Math.max(0, (Date.now() - savedAt) / 1000), unreadable: loaded.movedToBackup };
    drawTitle(ctx, st, info, screen === 'title' ? cursor : null, uiTime, AUTOSAVE_INTERVAL);
    if (screen === 'newgame') drawNewGameConfirm(ctx, st, cursor);
  } else if (screen === 'gacha' && magnetron) drawMagnetron(ctx, st, magnetron, cursor, uiTime);
  else if (screen === 'run' || overRun || !tree) {
    const live = screen === 'run' ? cursor : null; // no hover effects behind a menu
    drawBoard(ctx, st, fx, screen === 'run' ? magnet() : null, getStats(st));
    drawPrestigeBar(ctx, st, live, uiTime);
    drawPanel(ctx, st, fx, live);
    drawGear(ctx, live);
    drawTooltip(ctx, st, live);
    if (screen === 'pause') drawPause(ctx, cursor);
  } else if (screen === 'tree') drawTree(ctx, st, tree, cursor, uiTime);
  else if (screen === 'confirm') drawConfirm(ctx, st, tree, cursor, uiTime);
  else drawShiftAnim(ctx, st, tree, shiftAnim / SHIFT_ANIM, uiTime);
  if (screen === 'settings') drawSettings(ctx, settings, !!document.fullscreenElement, cursor, dragSlider);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
