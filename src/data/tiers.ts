import { ANTI } from './tuning';

export type TierId = 'basic' | 'gold' | 'prism' | 'anti';
export type GoodTierId = Exclude<TierId, 'anti'>;

export interface Tier {
  id: TierId;
  /** Multiplies both value and drift speed. */
  mult: number;
  /** Base spawn chance (rarest tiers are rolled first; basic takes the rest). */
  chance: number;
  /** Multiplies how fast the magnet pulls the coin in (rare coins resist a bit). */
  pull: number;
}

/** Rolled on spawn, rarest first. Left mutable so debug params can boost chances. */
export const TIERS: Tier[] = [
  { id: 'prism', mult: 3, chance: 0.01, pull: 0.7 },
  { id: 'gold', mult: 2, chance: 0.1, pull: 0.85 },
  { id: 'basic', mult: 1, chance: 1, pull: 1 },
];

export const ANTI_TIER: Tier = { id: 'anti', mult: 1, chance: ANTI.chance, pull: ANTI.pull };
