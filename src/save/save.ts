import { UPGRADES, UPGRADE_IDS, type UpgradeId } from '../data/upgrades';
import { createState } from '../game/state';
import type { GameState } from '../game/types';
import { CURRENT_VERSION, migrate, type SaveData } from './migrations';

export const SAVE_KEY = 'magnetic-field-save';
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

/** Builds a fresh state and overlays the saved data, ignoring unknown ids and clamping levels. */
export function fromSave(data: SaveData): GameState {
  const st = createState(data.rng);
  st.t = data.t;
  st.money = data.money;
  st.totalEarned = data.totalEarned;
  for (const u of UPGRADES) {
    const lv = data.levels[u.id];
    if (typeof lv === 'number') st.levels[u.id] = Math.max(0, Math.min(u.max, Math.floor(lv)));
    if (data.unlocked[u.id]) st.unlocked[u.id] = true;
  }
  const known = new Set<string>(UPGRADE_IDS);
  const order = data.unlockOrder.filter((id): id is UpgradeId => known.has(id) && st.unlocked[id]);
  for (const u of UPGRADES) if (st.unlocked[u.id] && !order.includes(u.id)) order.push(u.id);
  st.unlockOrder = order;
  st.features = { ...st.features, ...data.features };
  st.goalsDone = { ...data.goalsDone };
  st.stats = { ...st.stats, ...data.stats, caught: { ...st.stats.caught, ...data.stats.caught } };
  st.nextEvent = data.nextEvent;
  st.pulseCd = data.pulseCd;
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

export function loadGame(storage: StorageLike): GameState | null {
  try {
    const text = storage.getItem(SAVE_KEY);
    return text ? deserialize(text) : null;
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike): void {
  try { storage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/** Save as copy-pasteable text. */
export const exportSave = (st: GameState): string => btoa(serialize(st));

export function importSave(text: string): GameState | null {
  try { return deserialize(atob(text.trim())); } catch { return null; }
}
