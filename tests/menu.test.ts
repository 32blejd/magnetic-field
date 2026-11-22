import { describe, expect, it } from 'vitest';
import { readDebugOptions } from '../src/debug';
import { SETTINGS_KEY, defaultSettings, loadSettings, parseSettings, saveSettings } from '../src/save/settings';
import type { StorageLike } from '../src/save/save';
import { MAGNETRON_BUTTON } from '../src/ui/layout';
import { GEAR_BUTTON, PAUSE_BUTTONS, SLIDERS, sliderValue, titleButtons } from '../src/ui/menuLayout';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: k => void data.delete(k) };
}

describe('settings', () => {
  it('defaults when nothing or garbage is stored', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('not json')).toEqual(defaultSettings());
    expect(parseSettings('42')).toEqual(defaultSettings());
  });

  it('keeps valid fields, clamps volumes and defaults wrong types', () => {
    const s = parseSettings(JSON.stringify({ master: 2, music: -1, effects: 'loud', screenShake: false, extra: 1, tips: 'yes', tipsSeen: ['move', 3] }));
    expect(s).toEqual({ master: 1, music: 0, effects: defaultSettings().effects, screenShake: false, tips: true, tipsSeen: ['move'] });
  });

  it('round-trips through storage under its own key, apart from the game save', () => {
    const storage = memoryStorage();
    const saved = { master: 0.3, music: 0, effects: 1, screenShake: false, tips: false, tipsSeen: ['move', 'buy'] };
    saveSettings(saved, storage);
    expect([...storage.data.keys()]).toEqual([SETTINGS_KEY]);
    expect(loadSettings(storage)).toEqual(saved);
  });
});

describe('title screen', () => {
  it('is skipped by any debug URL param, shown otherwise', () => {
    expect(readDebugOptions('').skipTitle).toBe(false);
    expect(readDebugOptions('?utm_source=x').skipTitle).toBe(false);
    expect(readDebugOptions('?nosave=1').skipTitle).toBe(true);
    expect(readDebugOptions('?earned=1000000&open=shift').skipTitle).toBe(true);
  });

  it('shows CONTINUE only when there is a run to continue', () => {
    expect(titleButtons(false).map(b => b.action)).toEqual(['new', 'settings']);
    expect(titleButtons(true).map(b => b.action)).toEqual(['continue', 'new', 'settings']);
  });

  it('lays out buttons without overlaps', () => {
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const t = titleButtons(true).map(b => b.rect);
    expect(overlap(t[0]!, t[1]!) || overlap(t[1]!, t[2]!)).toBe(false);
    expect(overlap(PAUSE_BUTTONS[0]!.rect, PAUSE_BUTTONS[1]!.rect) || overlap(PAUSE_BUTTONS[1]!.rect, PAUSE_BUTTONS[2]!.rect)).toBe(false);
    expect(overlap(GEAR_BUTTON, MAGNETRON_BUTTON)).toBe(false);
  });

  it('maps a pointer x to a clamped slider value', () => {
    const { track } = SLIDERS[0]!;
    expect(sliderValue(track, track.x - 50)).toBe(0);
    expect(sliderValue(track, track.x + track.w / 2)).toBeCloseTo(0.5);
    expect(sliderValue(track, track.x + track.w + 50)).toBe(1);
  });
});
