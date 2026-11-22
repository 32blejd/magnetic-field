/* Magnetron (gacha): pulling Lodestones with Charge Crystals. Deterministic – uses the state's RNG. */
import { GACHA, LODESTONES, RARITIES, type LodestoneDef, type Rarity } from '../data/lodestones';
import { rand } from './rng';
import type { GameState } from './types';

export interface PullResult {
  def: LodestoneDef;
  /** Level after this pull. */
  level: number;
  isNew: boolean;
  /** Crystals refunded (duplicate of a max-level stone). */
  refund: number;
  /** This pull was forced by a pity rule: Epic+ by the counter, or Legendary once everything below is maxed. */
  pity: boolean;
}

export const magnetronUnlocked = (st: GameState): boolean => st.meta.shifts >= GACHA.unlockShifts;
export const canPull = (st: GameState, count = 1): boolean => magnetronUnlocked(st) && st.meta.crystals >= GACHA.pullCost * count;
/** Pulls left until the pity guarantee kicks in (1 = the next pull is guaranteed Epic+). */
export const pullsToPity = (st: GameState): number => GACHA.pity - st.meta.pity;
const maxed = (st: GameState, l: LodestoneDef): boolean => (st.meta.lodestones[l.id] ?? 0) >= GACHA.maxLevel;
/** Legendary pity: every Common, Rare and Epic stone is at max level, so every pull is a Legendary that isn't maxed yet. */
export const legendaryPity = (st: GameState): boolean => LODESTONES.every(l => l.rarity === 'legendary' || maxed(st, l));
/** Every stone at max level – pulls only refund crystals. */
export const collectionComplete = (st: GameState): boolean => LODESTONES.every(l => maxed(st, l));

function rollRarity(st: GameState, forceEpic: boolean): Rarity {
  const pool = forceEpic ? (['epic', 'legendary'] as Rarity[]) : RARITIES;
  const total = pool.reduce((a, r) => a + GACHA.odds[r], 0);
  let x = rand(st) * total;
  for (const r of pool) { if (x < GACHA.odds[r]) return r; x -= GACHA.odds[r]; }
  return pool[pool.length - 1]!;
}

/** One pull (no-op returning null if the player can't afford it). */
export function pull(st: GameState): PullResult | null {
  if (!canPull(st)) return null;
  const m = st.meta;
  m.crystals -= GACHA.pullCost;
  m.life.pulls++;
  const legendary = legendaryPity(st);
  const forced = !legendary && m.pity + 1 >= GACHA.pity;
  const rarity = legendary ? 'legendary' : rollRarity(st, forced);
  m.pity = rarity === 'epic' || rarity === 'legendary' ? 0 : m.pity + 1;
  let options = LODESTONES.filter(l => l.rarity === rarity);
  if (legendary && options.some(l => !maxed(st, l))) options = options.filter(l => !maxed(st, l));
  const def = options[Math.floor(rand(st) * options.length)]!;
  const before = m.lodestones[def.id] ?? 0;
  let refund = 0;
  if (before >= GACHA.maxLevel) { refund = GACHA.maxedRefund; m.crystals += refund; }
  else m.lodestones = { ...m.lodestones, [def.id]: before + 1 };
  return { def, level: Math.min(GACHA.maxLevel, before + 1), isNew: before === 0, refund, pity: forced || legendary };
}

/** Up to `count` pulls, stopping when crystals run out. */
export function pullMany(st: GameState, count: number): PullResult[] {
  const out: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = pull(st);
    if (!r) break;
    out.push(r);
  }
  return out;
}

/** Total coin value bonus from lodestones incl. set bonuses (for display). */
export function lodestoneValueBonus(st: GameState): number {
  let v = 0;
  for (const l of LODESTONES) v += l.valuePerLevel * (st.meta.lodestones[l.id] ?? 0);
  return v;
}
