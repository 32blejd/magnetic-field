import { CueGate, cuesFor, nodeCue, revealCues, type SoundId } from './audio/cues';
import { Synth } from './audio/synth';
import { readDebugOptions } from './debug';
import { activeTip, TIP_TIMEOUT, type TipId } from './ui/tips';
import { drawTip, tipRect } from './render/tips';
import { BOARD, STEP, VIEW } from './data/tuning';
import { triggerPulse } from './game/abilities';
import { magnetronUnlocked, pullMany } from './game/lodestones';
import {
  autoShiftDue, bonuses, buyNode, canShift, openStage, commitAutoShift, commitShift, nextAutoShiftTarget, refundNode, resetDraft, shiftGoal, startDraft,
  treeUnlocked,
} from './game/prestige';
import { buy, buyMax, canBuy, isMaxed } from './game/shop';
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
import { drawEnding, drawGear, drawNewGameConfirm, drawPause, drawSettings, drawTitle } from './render/menu';
import { drawStats } from './render/stats';
import { AUTOSAVE_INTERVAL, clearSave, loadGame, saveGame, type LoadResult } from './save/save';
import { loadSettings, saveSettings, type VolumeId } from './save/settings';
import { rowKey, setupInput } from './ui/input';
import { AUTO_BUY_BUTTON, AUTO_SHIFT_BUTTON, MAGNETRON_BUTTON, PRESTIGE_BUTTON, buttonRect, inRect, visibleRows } from './ui/layout';
import { MAG_BACK, PULL1, PULL10, REVEAL_STEP, newMagnetronView, type MagnetronView } from './ui/magnetronLayout';
import {
  ENDING_BUTTON, GEAR_BUTTON, NEWGAME_CANCEL, NEWGAME_ERASE, PAUSE_BUTTONS, SETTINGS_BACK, STATS_BOX, SLIDERS, TOGGLES, sliderHit, sliderValue, titleButtons,
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
// Sound: synthesized effects, silent until the first click or key press (browser autoplay rules)
const sfx = new Synth();
const cueGate = new CueGate();
const applyVolume = (): void => sfx.setVolume(settings.master * settings.effects);
applyVolume();
window.addEventListener('pointerdown', () => sfx.unlock());
window.addEventListener('keydown', () => sfx.unlock());
const sound = (id: SoundId): void => sfx.play({ id });
const click = (): void => sound('uiClick');
// Tutorial tips: one at a time while playing; done tips are remembered in the settings
let tip: TipId | null = null, tipT = 0;
function markTip(id: TipId): void {
  if (settings.tipsSeen.includes(id)) return;
  settings.tipsSeen.push(id);
  saveSettings(settings, localStorage);
}
if (loaded.movedToBackup) fx.banner(S.saveUnreadable.title, S.saveUnreadable.sub, COLORS.red, 6);
const events: GameEvent[] = [];
let cursor: Vec | null = null;

/** title = title screen · newgame = erase confirm over it · run = playing · pause = pause menu · stats (Tab, or from the pause menu) ·
    settings (from the title or the pause menu) ·
    tree = Core tree (browse or spend) · confirm = dialog over the tree · shift = polarity-flip animation · gacha = Magnetron ·
    ending = the thank-you screen after Break the Compass */
type Screen = 'title' | 'newgame' | 'run' | 'pause' | 'stats' | 'settings' | 'tree' | 'confirm' | 'shift' | 'gacha' | 'ending';
let magnetron: MagnetronView | null = null;
let screen: Screen = debug.skipTitle ? 'run' : 'title'; // debug URL params start the run directly
let settingsFrom: 'title' | 'pause' = 'title';
let statsFrom: 'run' | 'pause' = 'run';
let dragSlider: VolumeId | null = null;
let tree: TreeView | null = null;
let shiftAnim = 0;
let endingT = 0;
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
  for (const c of cuesFor(events, st.combo, cueGate, performance.now() / 1000)) sfx.play(c);
  if (events.some(e => e.type === 'pickup')) markTip('move');
  fx.update(STEP, st);
  if (autoShiftDue(st)) autoShift();
}

/** Auto-shift: restart the run on the spot, banking this run's Cores (no tree screen, no pause). */
function autoShift(): void {
  const gained = commitAutoShift(st);
  sound('autoShift');
  markTip('shift');
  fx.reset();
  fx.banner(S.autoShiftDone(formatNumber(st.meta.shifts)), S.autoShiftDoneSub(formatNumber(gained), formatNumber(st.meta.cores), formatShort(shiftGoal(st.meta))), COLORS.green, 4);
  lastBoardPos = null;
  save();
}
function cycleAutoShift(): void {
  if (!autoShiftVisible(st)) return;
  st.meta.autoShift = nextAutoShiftTarget(st.meta.autoShift);
  click();
  save();
}
/** Pause / resume the Auto-buyer (only once its node is owned). */
function toggleAutoBuy(): void {
  if (!bonuses(st.meta).autoBuy) return;
  st.meta.autoBuyOff = !st.meta.autoBuyOff;
  click();
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
  click();
  save();
}
function backToMenu(): void { save(); inGame = false; screen = 'title'; click(); }
function openPause(): void { screen = 'pause'; click(); }
function resume(): void { screen = 'run'; click(); }
function openStats(from: 'run' | 'pause'): void { statsFrom = from; screen = 'stats'; click(); }
function closeStats(): void { screen = statsFrom; click(); }
function openSettings(from: 'title' | 'pause'): void { settingsFrom = from; screen = 'settings'; click(); }
function closeSettings(): void { dragSlider = null; saveSettings(settings, localStorage); screen = settingsFrom; click(); }
function setVolume(id: VolumeId, x: number): void {
  const s = SLIDERS.find(r => r.id === id);
  if (s) settings[id] = Math.round(sliderValue(s.track, x) * 100) / 100;
  applyVolume();
}
function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
function openTree(mode: TreeMode): void {
  markTip('tree');
  tree = newTreeView(mode, mode === 'shift' ? startDraft(st) : null, openStage(st.meta.nodes));
  screen = 'tree';
  click();
}
function closeTree(): void { tree = null; screen = 'run'; click(); }
function openMagnetron(): void { if (magnetronUnlocked(st)) { magnetron = newMagnetronView(); screen = 'gacha'; click(); markTip('gacha'); } }
function closeMagnetron(): void { magnetron = null; screen = 'run'; click(); }
function doPull(count: number): void {
  if (!magnetron) return;
  const res = pullMany(st, count);
  if (!res.length) { sound('buyFail'); return; }
  magnetron.results = res; magnetron.revealT = 0;
  sound('pull');
  for (const c of revealCues(res.map(r => r.def.rarity), REVEAL_STEP)) sfx.play(c);
  save();
}
function finishShift(): void {
  if (!tree?.draft) return;
  const wasBroken = bonuses(st.meta).compassBroken;
  commitShift(st, tree.draft);
  markTip('shift');
  fx.reset();
  fx.banner(S.shiftDone(String(st.meta.shifts)), S.shiftDoneSub(formatShort(shiftGoal(st.meta))), COLORS.core, 4);
  lastBoardPos = null;
  save();
  closeTree();
  if (!wasBroken && bonuses(st.meta).compassBroken) openEnding(); // Break the Compass was just bought
}
function openEnding(): void { screen = 'ending'; endingT = 0; sound('ending'); }
function startShiftAnim(): void { screen = 'shift'; shiftAnim = 0; sound('shiftStart'); }

if (debug.open === 'shift' && canShift(st)) openTree('shift');
else if (debug.open === 'browse') openTree('browse');
else if (debug.open === 'gacha') openMagnetron();
else if (debug.open === 'ending') openEnding();
else if (debug.open === 'stats') openStats('run');

// ---- input ----
function tryBuy(row: number, bulk: boolean): void {
  const r = visibleRows(st)[row];
  if (!r || r.locked) return;
  const bought = bulk && bonuses(st.meta).bulkBuy ? buyMax(st, r.def) > 0 : buy(st, r.def);
  if (bought) { fx.flash[r.def.id] = 0.3; markTip('buy'); }
  sound(!bought ? 'buyFail' : isMaxed(st, r.def) ? 'buyMax' : 'buy');
}
function pressPrestigeButton(): void {
  const action = prestigeButtonAction(st);
  if (action) openTree(action);
}
function treeAction(action: 'back' | 'confirm' | 'undo' | 'reset' | 'notYet'): void {
  if (!tree) return;
  if (action === 'back' || action === 'notYet') closeTree();
  else if (action === 'confirm') { screen = 'confirm'; click(); }
  else if (action === 'reset') { if (tree.draft) sound(resetDraft(tree.draft) > 0 ? 'treeReset' : 'buyFail'); } // free respec; UNDO brings the saved tree back
  else { tree.draft = startDraft(st); sound('nodeRefund'); }
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
  if (screen === 'stats') {
    canvas.style.cursor = inRect(p, STATS_BOX) ? 'default' : 'pointer';
  } else if (screen === 'title' || screen === 'newgame' || screen === 'pause' || screen === 'settings') {
    canvas.style.cursor = menuPointer(p) ? 'pointer' : 'default';
  } else if (screen === 'run') {
    pointer = (inRect(p, PRESTIGE_BUTTON) && prestigeButtonAction(st) !== null) || (inRect(p, MAGNETRON_BUTTON) && magnetronUnlocked(st)) ||
      (inRect(p, AUTO_SHIFT_BUTTON) && autoShiftVisible(st)) || (inRect(p, AUTO_BUY_BUTTON) && bonuses(st.meta).autoBuy) || inRect(p, GEAR_BUTTON) ||
      visibleRows(st).some(({ def, locked }, i) => !locked && inRect(p, buttonRect(i)) && canBuy(st, def));
    canvas.style.cursor = inRect(p, BOARD) ? 'none' : pointer ? 'pointer' : 'default';
  } else if (screen === 'tree' && tree) {
    pointer = treeButtons(tree).some(b => inRect(p, b.rect)) || (!!tree.hover && !!tree.draft && tree.mode === 'shift');
    canvas.style.cursor = tree.drag?.moved ? 'grabbing' : pointer ? 'pointer' : 'grab';
  } else if (screen === 'ending') {
    canvas.style.cursor = inRect(p, ENDING_BUTTON) ? 'pointer' : 'default';
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
      else if (b?.action === 'new') { if (hasRun) { screen = 'newgame'; click(); } else play(true); }
      else if (b?.action === 'settings') openSettings('title');
    } else if (screen === 'newgame') {
      if (inRect(p, NEWGAME_ERASE)) play(true);
      else if (inRect(p, NEWGAME_CANCEL)) { screen = 'title'; click(); }
    } else if (screen === 'pause') {
      const b = PAUSE_BUTTONS.find(r => inRect(p, r.rect));
      if (b?.action === 'resume') resume();
      else if (b?.action === 'stats') openStats('pause');
      else if (b?.action === 'settings') openSettings('pause');
      else if (b?.action === 'menu') backToMenu();
    } else if (screen === 'settings') {
      if (dragSlider) { dragSlider = null; saveSettings(settings, localStorage); click(); return; } // a click at the new volume
      if (inRect(p, SETTINGS_BACK)) { closeSettings(); return; }
      const t = TOGGLES.find(r => inRect(p, r.hit));
      if (t?.id === 'screenShake') { settings.screenShake = fx.shakeOn = !settings.screenShake; saveSettings(settings, localStorage); click(); }
      else if (t?.id === 'tips') { // turning tips back on shows them all again
        settings.tips = !settings.tips;
        if (settings.tips) settings.tipsSeen = [];
        saveSettings(settings, localStorage); click();
      }
      else if (t?.id === 'fullscreen') { toggleFullscreen(); click(); }
    } else if (screen === 'stats') {
      if (!inRect(p, STATS_BOX)) closeStats(); // a click outside the panel closes it
    } else if (screen === 'ending') {
      if (endingT > 1.6 && inRect(p, ENDING_BUTTON)) resume();
    } else if (screen === 'run') {
      if (tip && inRect(p, tipRect(ctx, tip))) { markTip(tip); click(); return; } // a click on a tip hides it
      if (inRect(p, GEAR_BUTTON)) { openPause(); return; }
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
      if (n && tree.mode === 'shift' && tree.draft) {
        if (buyNode(tree.draft, n)) { tree.flashes.push({ id: n.id, life: 0.5 }); sfx.play(nodeCue(n.stage)); } else sound('buyFail');
      }
    } else if (screen === 'gacha' && magnetron) {
      if (magnetron.results) { magnetron.results = null; click(); return; } // dismiss the reveal
      if (inRect(p, PULL1)) doPull(1);
      else if (inRect(p, PULL10)) doPull(10);
      else if (inRect(p, MAG_BACK)) closeMagnetron();
    } else if (screen === 'confirm') {
      if (inRect(p, CONFIRM_OK)) startShiftAnim();
      else if (inRect(p, CONFIRM_BACK)) { screen = 'tree'; click(); }
    }
  },
  onWheel(p, dy) { if (screen === 'tree' && tree) zoomAt(tree, p, dy < 0 ? 1.1 : 1 / 1.1); },
  onRightClick(p) {
    if (screen === 'run') pulse();
    else if (screen === 'tree' && tree?.mode === 'shift' && tree.draft) { // refund one level of the node under the cursor
      const n = nodeAt(st, tree, p);
      if (n && refundNode(tree.draft, n)) { tree.flashes.push({ id: n.id, life: 0.5 }); sound('nodeRefund'); }
    }
  },
  onKey(code, shift) {
    if (code === 'F11') { toggleFullscreen(); return true; }
    if (screen === 'title') {
      if (code === 'Enter') play(!hasRun);
      return false;
    }
    if (screen === 'newgame') { if (code === 'Escape') { screen = 'title'; click(); } return false; }
    if (screen === 'pause') {
      if (code === 'Escape') resume();
      else if (code === 'Tab') { openStats('pause'); return true; }
      return false;
    }
    if (screen === 'stats') {
      if (code === 'Escape' || code === 'Tab') closeStats();
      return code === 'Tab';
    }
    if (screen === 'settings') { if (code === 'Escape') closeSettings(); return false; }
    if (screen === 'ending') { if (endingT > 1.6 && (code === 'Enter' || code === 'Escape')) resume(); return false; }
    if (screen === 'run') {
      if (code === 'Escape') { markTip('menu'); openPause(); return true; }
      if (code === 'Tab') { markTip('menu'); openStats('run'); return true; }
      if (code === 'Space') { pulse(); return true; }
      if (code === 'KeyT' && treeUnlocked(st)) openTree('browse');
      if (code === 'KeyP' && canShift(st)) openTree('shift');
      if (code === 'KeyG') openMagnetron();
      if (code === 'KeyA') cycleAutoShift();
      if (code === 'KeyB') toggleAutoBuy();
      const row = rowKey(code);
      if (row >= 0) { tryBuy(row, shift); markTip('keys'); }
      return false;
    }
    if (screen === 'gacha' && magnetron && (code === 'Escape' || code === 'KeyG')) { if (magnetron.results) { magnetron.results = null; click(); } else closeMagnetron(); }
    else if (screen === 'tree' && tree && (code === 'Escape' || (code === 'KeyT' && tree.mode === 'browse'))) closeTree();
    else if (screen === 'confirm' && code === 'Escape') { screen = 'tree'; click(); }
    else if (screen === 'confirm' && code === 'Enter') startShiftAnim();
    return code === 'Space';
  },
});

function pulse(): void {
  if (!triggerPulse(st)) return;
  sound('pulse');
  markTip('pulse');
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
  if (screen === 'ending') endingT += dt;
  if (screen === 'run') { // tutorial tip: the first relevant unseen one; timed tips hide on their own
    const next = settings.tips ? activeTip(st, settings.tipsSeen) : null;
    if (next !== tip) { tip = next; tipT = 0; } else tipT += dt;
    const limit = tip ? TIP_TIMEOUT[tip] : null;
    if (tip && limit !== null && tipT > limit) markTip(tip);
  }
  if (tree) { for (const f of tree.flashes) f.life -= dt; tree.flashes = tree.flashes.filter(f => f.life > 0); }
  if (screen === 'shift' && (shiftAnim += dt) >= SHIFT_ANIM) finishShift();
  if (cursor) updateCursorStyle(cursor); // also right after a screen change, not only on mouse moves

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const overTitle = screen === 'title' || screen === 'newgame' || (screen === 'settings' && settingsFrom === 'title');
  const overRun = screen === 'pause' || screen === 'stats' || (screen === 'settings' && settingsFrom === 'pause');
  if (screen === 'ending') drawEnding(ctx, st, cursor, endingT);
  else if (overTitle) {
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
    if (screen === 'run' && tip) drawTip(ctx, tip, tipT, cursor);
    if (screen === 'pause') drawPause(ctx, cursor);
    if (screen === 'stats') drawStats(ctx, st, fx);
  } else if (screen === 'tree') drawTree(ctx, st, tree, cursor, uiTime);
  else if (screen === 'confirm') drawConfirm(ctx, st, tree, cursor, uiTime);
  else drawShiftAnim(ctx, st, tree, shiftAnim / SHIFT_ANIM, uiTime);
  if (screen === 'settings') drawSettings(ctx, settings, !!document.fullscreenElement, cursor, dragSlider);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
