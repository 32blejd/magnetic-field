import { GOALS } from '../data/goals';
import { EVENTS } from '../data/tuning';
import { UPGRADES, UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { createState } from '../game/state';
import type { FeatureId, GameState } from '../game/types';
import { CURRENT_VERSION, migrate, type SaveData } from './migrations';

export const SAVE_KEY = 'magnetic-field-save';
/** A save that couldn't be read is moved here instead of being overwritten by the next autosave. */
export const BACKUP_KEY = 'magnetic-field-save-unreadable';
export const AUTOSAVE_INTERVAL = 30; // seconds

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function toSave(st: GameState, now = Date.now()): SaveData {
  return {
    version: CURRENT_VERSION,
    savedAt: now,
    rng: st.rng,
    t: st.t,
    money: st.money,
    totalEarned: st.totalEarned,
    levels: { ...st.levels },
    unlocked: { ...st.unlocked },
    unlockOrder: [...st.unlockOrder],
    features: { ...st.features },
    goalsDone: { ...st.goalsDone },
    stats: { ...st.stats, caught: { ...st.stats.caught } },
    nextEvent: st.nextEvent,
    pulseCd: st.pulseCd,
  };
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Builds a fresh state and overlays the saved data: unknown ids are ignored, levels clamped, missing fields defaulted. */
export function fromSave(data: SaveData): GameState {
  const st = createState(num(data.rng, 7) | 0);
  st.t = Math.max(0, num(data.t, 0));
  st.money = Math.max(0, data.money);
  st.totalEarned = Math.max(st.money, data.totalEarned);
  for (const u of UPGRADES) {
    const lv = data.levels[u.id];
    if (typeof lv === 'number' && Number.isFinite(lv)) st.levels[u.id] = Math.max(0, Math.min(u.max, Math.floor(lv)));
    if (data.unlocked?.[u.id] === true) st.unlocked[u.id] = true;
  }
  const known = new Set<string>(UPGRADE_IDS);
  const order = (data.unlockOrder ?? []).filter(
    (id, i, all): id is UpgradeId => known.has(id) && st.unlocked[id as UpgradeId] && all.indexOf(id) === i,
  );
  for (const u of UPGRADES) if (st.unlocked[u.id] && !order.includes(u.id)) order.push(u.id);
  st.unlockOrder = order;
  for (const id of Object.keys(st.features) as FeatureId[]) st.features[id] = data.features?.[id] === true;
  for (const g of GOALS) if (data.goalsDone?.[g.id] === true) st.goalsDone[g.id] = true;
  const s = data.stats ?? {};
  st.stats = {
    caught: { basic: num(s.caught?.basic, 0), gold: num(s.caught?.gold, 0), prism: num(s.caught?.prism, 0) },
    missed: num(s.missed, 0),
    anti: num(s.anti, 0),
    bestCombo: num(s.bestCombo, 0),
  };
  st.nextEvent = num(data.nextEvent, EVENTS.first);
  st.pulseCd = Math.max(0, num(data.pulseCd, 0));
  return st;
}

export const serialize = (st: GameState): string => JSON.stringify(toSave(st));

export function deserialize(text: string): GameState | null {
  try {
    const data = migrate(JSON.parse(text));
    return data ? fromSave(data) : null;
  } catch {
    return null;
  }
}

export function saveGame(st: GameState, storage: StorageLike): void {
  try { storage.setItem(SAVE_KEY, serialize(st)); } catch { /* storage full or blocked – keep playing */ }
}

export interface LoadResult {
  /** The loaded run, or null when there is no usable save. */
  state: GameState | null;
  /** True when a save existed but couldn't be read; its text was copied to BACKUP_KEY. */
  movedToBackup: boolean;
}

/**
 * Loads the save. A save that exists but can't be read (corrupted, or from a newer version of the game)
 * is copied to BACKUP_KEY first, so the next autosave can't destroy it.
 */
export function loadGame(storage: StorageLike): LoadResult {
  let text: string | null;
  try { text = storage.getItem(SAVE_KEY); } catch { return { state: null, movedToBackup: false }; }
  if (!text) return { state: null, movedToBackup: false };
  const state = deserialize(text);
  if (state) return { state, movedToBackup: false };
  try { storage.setItem(BACKUP_KEY, text); } catch { /* ignore */ }
  return { state: null, movedToBackup: true };
}

export function clearSave(storage: StorageLike): void {
  try { storage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/** Save as copy-pasteable text. */
export const exportSave = (st: GameState): string => btoa(serialize(st));

export function importSave(text: string): GameState | null {
  try { return deserialize(atob(text.trim())); } catch { return null; }
}
