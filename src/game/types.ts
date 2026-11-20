import type { GoalDef } from '../data/goals';
import type { GoodTierId, TierId } from '../data/tiers';
import type { UpgradeId } from '../data/upgrades';

export interface Vec {
  x: number;
  y: number;
}

export interface Coin {
  x: number;
  y: number;
  /** Unit drift direction. */
  dx: number;
  dy: number;
  age: number;
  /** Random phase for animations. */
  phase: number;
  tier: TierId;
  /** Value multiplier. */
  mult: number;
  /** Drift speed multiplier. */
  speed: number;
  /** Pull multiplier. */
  pull: number;
  anti: boolean;
}

/** Telegraph shown before an anti-coin appears. */
export interface AntiWarning {
  x: number;
  y: number;
  angle: number;
  /** Seconds until the anti-coin appears. */
  t: number;
}

export interface ActiveEvent {
  type: 'burst' | 'fountain' | 'meteor';
  t: number;
  total: number;
}

export interface RunStats {
  caught: Record<GoodTierId, number>;
  missed: number;
  anti: number;
  bestCombo: number;
}

export type FeatureId = 'combo' | 'pulse' | 'anti';

/** Progress that survives Polarity Shift. */
export interface MetaState {
  /** Unspent Cores. */
  cores: number;
  /** Every Core ever earned (powers the Polarity Core bonus). */
  coresEarned: number;
  /** Number of completed shifts. */
  shifts: number;
  /** Core tree node levels by node id. */
  nodes: Record<string, number>;
  /** Charge Crystals (Magnetron currency). */
  crystals: number;
  /** Lodestone levels by id (1–5). */
  lodestones: Record<string, number>;
  /** Pulls since the last Epic-or-better (pity counter). */
  pity: number;
}

export interface GameState {
  meta: MetaState;
  /** RNG state (mulberry32). */
  rng: number;
  /** Run time (s). */
  t: number;
  money: number;
  totalEarned: number;
  levels: Record<UpgradeId, number>;
  unlocked: Record<UpgradeId, boolean>;
  /** Upgrades in the order they became available (panel order). */
  unlockOrder: UpgradeId[];
  /** Features already announced (so banners don't repeat after loading). */
  features: Record<FeatureId, boolean>;
  goalsDone: Record<string, boolean>;
  stats: RunStats;
  nextEvent: number;
  pulseCd: number;

  // transient (not saved)
  coins: Coin[];
  warnings: AntiWarning[];
  spawnT: number;
  combo: number;
  comboT: number;
  pulseT: number;
  stunT: number;
  event: ActiveEvent | null;
  /** Last magnet position and smoothed magnet speed (px/s) – for Momentum. */
  lastMagnet: Vec | null;
  magnetSpeed: number;
  /** Combo Shield cooldown (s). */
  shieldCd: number;
}

/** Things that happened during a simulation step, consumed by effects/UI. */
export type GameEvent =
  | { type: 'pickup'; coin: Coin; value: number }
  | { type: 'anti'; coin: Coin }
  | { type: 'miss'; coin: Coin }
  | { type: 'burst' }
  | { type: 'fountain'; x: number; y: number }
  | { type: 'unlock'; id: UpgradeId }
  | { type: 'feature'; id: FeatureId }
  | { type: 'goal'; goal: GoalDef; reward: number }
  | { type: 'meteor' }
  | { type: 'crystal'; amount: number; x: number; y: number }
  | { type: 'shield'; x: number; y: number };
