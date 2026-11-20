import { ANTI } from './tuning';

export type TierId = 'basic' | 'gold' | 'prism' | 'void' | 'anti';
export type GoodTierId = Exclude<TierId, 'anti'>;
export const GOOD_TIERS: readonly GoodTierId[] = ['basic', 'gold', 'prism', 'void'];

export interface Tier {
  id: TierId;
  /** Value multiplier. */
  mult: number;
  /** Drift speed multiplier. */
  speed: number;
  /** Base spawn chance (rarest tiers are rolled first; basic takes the rest). */
  chance: number;
  /** Multiplies how fast the magnet pulls the coin in (rare coins resist a bit). */
  pull: number;
}

/** Rolled on spawn, rarest first. Left mutable so debug params can boost chances. */
export const TIERS: Tier[] = [
  { id: 'prism', mult: 3, speed: 3, chance: 0.01, pull: 0.7 },
  { id: 'gold', mult: 2, speed: 2, chance: 0.1, pull: 0.85 },
  { id: 'basic', mult: 1, speed: 1, chance: 1, pull: 1 },
];

/** Void Coin (E keystone): rolled before TIERS only when the keystone is owned. Rarity bonuses don't apply to it. Mutable for ?rare=1. */
export const VOID_TIER: Tier = { id: 'void', mult: 10, speed: 1.5, chance: 0.003, pull: 0.6 };

/** What a coin takes from its tier. */
export type CoinKind = Pick<Tier, 'id' | 'mult' | 'speed' | 'pull'>;

/** Anti-coins are not rolled with TIERS – their spawn chance is ANTI.chance (data/tuning.ts). */
export const ANTI_TIER: CoinKind = { id: 'anti', mult: 1, speed: ANTI.speed, pull: ANTI.pull };
