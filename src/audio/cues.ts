/* Which sounds to play: game events → sound cues. Pure (no Web Audio), so it runs in tests. Like render/effects.ts, sound is
   output only – nothing here feeds back into the game. */
import type { Rarity } from '../data/lodestones';
import type { GameEvent } from '../game/types';

export const SOUND_IDS = [
  // coins
  'pickupBasic', 'pickupGold', 'pickupPrism', 'pickupVoid', 'bounty',
  'spawnBasic', 'spawnGold', 'spawnPrism', 'spawnVoid', 'warning', 'antiHit', 'miss',
  // panel and actions
  'buy', 'buyFail', 'buyMax', 'autoBuy', 'unlock', 'pulse', 'autoPulse',
  'burst', 'fountain', 'meteor', 'goal', 'crystal', 'chain', 'shield', 'interest',
  // Core tree, shifts, Magnetron
  'nodeBuy', 'nodeRefund', 'treeReset', 'shiftStart', 'autoShift',
  'pull', 'revealCommon', 'revealRare', 'revealEpic', 'revealLegendary',
  // menus and the ending
  'uiClick', 'ending',
] as const;
export type SoundId = (typeof SOUND_IDS)[number];

export interface Cue {
  id: SoundId;
  /** Frequency multiplier (1 = as designed). */
  pitch?: number;
  /** Volume multiplier. */
  gain?: number;
  /** Seconds from now. */
  delay?: number;
}

/** Shortest gap (s) between two plays of a sound, so hundreds of pickups or spawns per second don't turn into noise. */
export const MIN_GAP: Partial<Record<SoundId, number>> = {
  pickupBasic: 0.035, pickupGold: 0.05, pickupPrism: 0.08, pickupVoid: 0.15, bounty: 0.1,
  spawnBasic: 0.12, spawnGold: 0.08, spawnPrism: 0.1, spawnVoid: 0.2, warning: 0.3, miss: 0.15,
  autoBuy: 0.12, crystal: 0.08, chain: 0.1, interest: 1, antiHit: 0.2,
};

/** Remembers when each sound last played. */
export class CueGate {
  private last = new Map<SoundId, number>();
  allow(id: SoundId, now: number): boolean {
    const gap = MIN_GAP[id] ?? 0, prev = this.last.get(id);
    if (prev !== undefined && now - prev < gap) return false;
    this.last.set(id, now);
    return true;
  }
}

/** Pickup pitch: rises with the combo, a full octave at combo 24 and above. */
export const comboPitch = (combo: number): number => 2 ** (Math.min(Math.max(combo, 0), 24) / 24);

const PICKUP: Record<string, SoundId> = { basic: 'pickupBasic', gold: 'pickupGold', prism: 'pickupPrism', void: 'pickupVoid', anti: 'bounty' };
const SPAWN: Record<string, SoundId> = { basic: 'spawnBasic', gold: 'spawnGold', prism: 'spawnPrism', void: 'spawnVoid' };
const SIMPLE: Partial<Record<GameEvent['type'], SoundId>> = {
  anti: 'antiHit', miss: 'miss', warning: 'warning', burst: 'burst', fountain: 'fountain', meteor: 'meteor', goal: 'goal',
  crystal: 'crystal', chain: 'chain', shield: 'shield', interest: 'interest', autobuy: 'autoBuy', autopulse: 'autoPulse',
  unlock: 'unlock', feature: 'unlock',
};

/**
 * Sound cues for one simulation step's events: at most one cue per sound (a step can hold many pickups), each sound
 * rate-limited by the gate. Pickups follow the combo in pitch.
 */
export function cuesFor(events: readonly GameEvent[], combo: number, gate: CueGate, now: number): Cue[] {
  const wanted = new Set<SoundId>();
  for (const e of events) {
    const id = e.type === 'pickup' ? PICKUP[e.coin.tier] : e.type === 'spawn' ? SPAWN[e.tier] : SIMPLE[e.type];
    if (id) wanted.add(id);
  }
  const out: Cue[] = [];
  for (const id of wanted) {
    if (!gate.allow(id, now)) continue;
    out.push(id.startsWith('pickup') ? { id, pitch: comboPitch(combo) } : { id });
  }
  return out;
}

/** Magnetron reveal: one cue per card as it flips (cards flip `step` seconds apart). */
export function revealCues(rarities: readonly Rarity[], step: number): Cue[] {
  const id: Record<Rarity, SoundId> = { common: 'revealCommon', rare: 'revealRare', epic: 'revealEpic', legendary: 'revealLegendary' };
  return rarities.map((r, i) => ({ id: id[r], delay: 0.3 + i * step, gain: rarities.length > 1 ? 0.8 : 1 }));
}

/** Core tree node purchase: the bell rings higher in later stages. */
export const nodeCue = (stage: number): Cue => ({ id: 'nodeBuy', pitch: [1, 1, 1.12, 1.26, 1.5][stage] ?? 1 });
