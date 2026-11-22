/* Player settings: stored apart from the game save (own key, no version), so a New Game or a save migration never touches them. */
import type { StorageLike } from './save';

export const SETTINGS_KEY = 'magnetic-field-settings';

export interface Settings {
  /** Volumes 0–1. Placeholders until there is sound, but already saved. */
  master: number;
  music: number;
  effects: number;
  /** Shake the board when an anti-coin hits the magnet. */
  screenShake: boolean;
}
export type VolumeId = 'master' | 'music' | 'effects';
export const VOLUME_IDS: readonly VolumeId[] = ['master', 'music', 'effects'];

export const defaultSettings = (): Settings => ({ master: 0.8, music: 0.6, effects: 0.8, screenShake: true });

const volume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Tolerant: unknown or wrong-typed fields fall back to the default, volumes are clamped to 0–1. */
export function parseSettings(text: string | null): Settings {
  const def = defaultSettings();
  if (!text) return def;
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return def; }
  if (typeof raw !== 'object' || raw === null) return def;
  const r = raw as Record<string, unknown>;
  return {
    master: volume(r.master, def.master),
    music: volume(r.music, def.music),
    effects: volume(r.effects, def.effects),
    screenShake: typeof r.screenShake === 'boolean' ? r.screenShake : def.screenShake,
  };
}

export function loadSettings(storage: StorageLike): Settings {
  try { return parseSettings(storage.getItem(SETTINGS_KEY)); } catch { return defaultSettings(); }
}

export function saveSettings(s: Settings, storage: StorageLike): void {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ }
}
