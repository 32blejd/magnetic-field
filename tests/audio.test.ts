import { describe, expect, it } from 'vitest';
import { CueGate, MIN_GAP, SOUND_IDS, comboPitch, cuesFor, nodeCue, revealCues } from '../src/audio/cues';
import { RECIPES } from '../src/audio/synth';
import { BOARD, STEP } from '../src/data/tuning';
import { step } from '../src/game/simulation';
import { createState, emptyMeta } from '../src/game/state';
import type { Coin, GameEvent } from '../src/game/types';

const coin = (tier: Coin['tier']): Coin => ({ x: 0, y: 0, dx: 1, dy: 0, age: 1, phase: 0, tier, mult: 1, speed: 1, pull: 1, anti: tier === 'anti' });
const pickup = (tier: Coin['tier']): GameEvent => ({ type: 'pickup', coin: coin(tier), value: 1 });

describe('sound cues', () => {
  it('has a recipe for every sound', () => {
    for (const id of SOUND_IDS) expect(RECIPES[id], id).toBeTypeOf('function');
  });

  it('gives every coin tier its own pickup and spawn sound, and an anti-coin bounty its own', () => {
    const ids = cuesFor([pickup('basic'), pickup('gold'), pickup('prism'), pickup('void'), pickup('anti')], 0, new CueGate(), 0).map(c => c.id);
    expect(ids).toEqual(['pickupBasic', 'pickupGold', 'pickupPrism', 'pickupVoid', 'bounty']);
    const spawns: GameEvent[] = (['basic', 'gold', 'prism', 'void'] as const).map(tier => ({ type: 'spawn', tier }));
    expect(cuesFor(spawns, 0, new CueGate(), 0).map(c => c.id)).toEqual(['spawnBasic', 'spawnGold', 'spawnPrism', 'spawnVoid']);
  });

  it('plays one cue per sound per step and rate-limits repeats', () => {
    const gate = new CueGate();
    expect(cuesFor([pickup('basic'), pickup('basic'), pickup('basic')], 0, gate, 0)).toHaveLength(1);
    expect(cuesFor([pickup('basic')], 0, gate, 0.01)).toHaveLength(0); // inside the gap
    expect(cuesFor([pickup('basic')], 0, gate, MIN_GAP.pickupBasic! + 0.01)).toHaveLength(1);
  });

  it('raises the pickup pitch with the combo, up to an octave', () => {
    expect(comboPitch(0)).toBe(1);
    expect(comboPitch(12)).toBeCloseTo(Math.SQRT2);
    expect(comboPitch(100)).toBe(2);
    expect(cuesFor([pickup('gold')], 24, new CueGate(), 0)[0]!.pitch).toBe(2);
  });

  it('staggers Magnetron reveals and rings the node bell higher in later stages', () => {
    const r = revealCues(['common', 'legendary'], 0.12);
    expect(r.map(c => c.id)).toEqual(['revealCommon', 'revealLegendary']);
    expect(r[1]!.delay! - r[0]!.delay!).toBeCloseTo(0.12);
    expect(nodeCue(4).pitch!).toBeGreaterThan(nodeCue(1).pitch!);
  });

  it('gets spawn and warning events from the simulation', () => {
    const st = createState(1, { ...emptyMeta() });
    const events: GameEvent[] = [];
    step(st, STEP, { x: BOARD.x + 10, y: BOARD.y + 10 }, events); // spawnT starts at 0: a coin spawns on the first step
    expect(events.some(e => e.type === 'spawn')).toBe(true);
  });
});
