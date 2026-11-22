/* Game tuning constants. All distances are in logical units of a 960×540 view (×2 on a 1920×1080 screen).
   Objects that debug URL params may tweak are left mutable on purpose. */
import type { UpgradeId } from './upgrades';

export const VIEW = { w: 960, h: 540 } as const;
export const BOARD = { x: 16, y: 16, w: 700, h: 446 } as const;

/** Fixed simulation step (seconds). */
export const STEP = 1 / 60;

export const MAGNET_RADIUS = 10;
export const COIN_RADIUS = 11.88;
/** Coins can't be pulled or collected during the spawn animation. */
export const SPAWN_TIME = 0.25;
/** Pull speed inside the field: strength × tierPull × (base + bonus × (1 − distance / range)) px/s. */
export const PULL = { base: 45, bonus: 130 } as const;
/** Distance at which a coin counts as touching the magnet. */
export const TOUCH_DISTANCE = MAGNET_RADIUS + COIN_RADIUS * 0.6;

/** Spawn area as a fraction of the board (keeps new coins away from the edges). */
export const SPAWN_AREA = { min: 0.15, size: 0.7 } as const;

export const COMBO = { unlockAt: 5000, window: 1.5, step: 0.1, max: 2 } as const;
export const PULSE = { unlockAt: 2000, duration: 1, rangeMult: 3, cooldown: 25 } as const;

/** Anti-coins: rare red hazards that short-circuit the magnet. */
export const ANTI = {
  unlockAt: 25000,
  chance: 0.005,
  /** Magnet offline time after touching one (s). */
  stun: 1.5,
  /** Pull multiplier – a bit heavier than Prism (0.7). Pulse range doesn't apply. */
  pull: 0.6,
  /** Drift speed multiplier. */
  speed: 0.2,
  /** Lifetime before it vanishes on its own (s), the last `fade` seconds fading out. */
  life: 5,
  fade: 0.8,
  /** Warning marker shown this long before it appears (s). */
  warn: 1,
};

export const EVENTS = {
  first: 120,
  every: [120, 180] as const,
  burst: { duration: 6, spawnMult: 3, capMult: 2 },
  fountain: { count: 14, banner: 2 },
} as const;

/** Earn this much in one run to unlock Polarity Shift. */
export const PRESTIGE_GOAL = 1_000_000;

/* ---------- M5: keystones and automation from the Core tree ---------- */

/** Satellites (N keystone): small magnets orbiting the cursor, one per level. Sizes are fractions of the field radius without Pulse. */
export const SATELLITES = {
  /** Orbit radius (× field radius) – they ride the edge of the main field. */
  orbit: 1,
  /** Field radius of each satellite (× field radius). */
  range: 0.4,
  /** Orbit speed (rad/s). */
  spin: 2.4,
  /** Body radius (touch distance = radius + 60% of the coin radius). */
  radius: 5,
};

/** Drones (W keystone): autonomous magnets that chase the nearest coin, one per level. */
export const DRONES = {
  /** Flight speed (px/s). */
  speed: 140,
  /** Field radius (× the main field radius without Pulse). */
  range: 0.45,
  radius: 7,
};

/** Twin Magnet (NW keystone): a second magnet mirrored through the board centre; field radius × the main field without Pulse. */
export const TWIN = { range: 0.8 };

/** Chain Reaction (E): catching a Prism also collects every coin within this radius of it. */
export const CHAIN = { radius: 80 };

/** Interest (S keystone): every `every` s gain `rate` of held coins, at most `capSeconds` of perfect income. */
export const INTEREST = { every: 10, rate: 0.01, capSeconds: 10 };

/** Automation (W). */
export const AUTO = {
  /** Auto-pulse fires when at least this many coins are inside the Pulse radius. */
  pulseCoins: 5,
  /** Auto-buyer buys at most one level per this many seconds. */
  buyEvery: 0.25,
  /** Auto-buyer picks the lowest cost × weight (missing = 1) and saves up for it. Value is the best upgrade, so it counts as 3× cheaper:
      buying cheapest-first instead costs ~20% of run speed (bot: 1M in 13:25 vs 10:53). */
  buyWeight: { value: 0.33 } as Partial<Record<UpgradeId, number>>,
};
