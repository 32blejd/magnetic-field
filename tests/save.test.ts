import { describe, expect, it } from 'vitest';
import { createState } from '../src/game/state';
import { migrate } from '../src/save/migrations';
import { deserialize, exportSave, importSave, loadGame, saveGame, serialize, type StorageLike } from '../src/save/save';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: k => void data.delete(k) };
}

function playedState() {
  const st = createState(42);
  st.t = 321;
  st.money = 1234;
  st.totalEarned = 5678;
  st.levels.value = 3;
  st.levels.strength = 2;
  st.unlocked.strength = true;
  st.unlocked.capacity = true;
  st.unlockOrder.push('strength', 'capacity');
  st.goalsDone['coins-10'] = true;
  st.stats.caught = { basic: 40, gold: 4, prism: 1 };
  st.features.pulse = true;
  return st;
}

describe('save', () => {
  it('round-trips the primary state', () => {
    const st = playedState();
    const loaded = deserialize(serialize(st))!;
    expect(loaded.money).toBe(1234);
    expect(loaded.totalEarned).toBe(5678);
    expect(loaded.levels).toEqual(st.levels);
    expect(loaded.unlockOrder).toEqual(['value', 'range', 'spawn', 'strength', 'capacity']);
    expect(loaded.goalsDone).toEqual({ 'coins-10': true });
    expect(loaded.stats.caught).toEqual({ basic: 40, gold: 4, prism: 1 });
    expect(loaded.features.pulse).toBe(true);
    expect(loaded.rng).toBe(st.rng);
  });

  it('does not save transient objects', () => {
    const st = playedState();
    st.coins.push({ x: 1, y: 1, dx: 0, dy: 0, age: 0, phase: 0, tier: 'basic', mult: 1, speed: 1, pull: 1, anti: false });
    expect(serialize(st)).not.toContain('"coins"');
    expect(deserialize(serialize(st))!.coins).toEqual([]);
  });

  it('works through storage and as exportable text', () => {
    const storage = memoryStorage();
    saveGame(playedState(), storage);
    expect(loadGame(storage)?.money).toBe(1234);
    expect(importSave(exportSave(playedState()))?.levels.value).toBe(3);
  });

  it('clamps levels and ignores unknown upgrades', () => {
    const data = JSON.parse(serialize(playedState()));
    data.levels.value = 999;
    data.levels.bogus = 5;
    data.unlockOrder.push('bogus');
    const loaded = deserialize(JSON.stringify(data))!;
    expect(loaded.levels.value).toBe(30);
    expect(loaded.unlockOrder).not.toContain('bogus');
  });

  it('rejects garbage and unknown versions', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{}')).toBeNull();
    expect(migrate({ version: 99, money: 1 })).toBeNull();
    expect(importSave('%%%')).toBeNull();
    expect(loadGame(memoryStorage())).toBeNull();
  });
});
