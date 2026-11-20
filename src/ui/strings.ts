/* All player-facing text in one place. */
import type { GoalDef, GoalMetric } from '../data/goals';
import type { UpgradeId } from '../data/upgrades';
import type { FeatureId } from '../game/types';

export const UPGRADE_TEXT: Record<UpgradeId, { name: string; desc: string }> = {
  value: { name: 'Value', desc: 'Coins added to your wallet per coin collected.' },
  range: { name: 'Range', desc: 'Radius of the magnetic field. Coins inside it get pulled toward the magnet.' },
  spawn: { name: 'Spawn rate', desc: 'How many new coins appear on the board per second.' },
  strength: { name: 'Strength', desc: 'How fast coins inside the field fly to the magnet. Higher = fewer coins slip away.' },
  capacity: { name: 'Capacity', desc: 'Maximum number of coins on the board at once. New coins stop spawning at the limit.' },
  rarity: { name: 'Rarity', desc: 'Raises the chance of rare coins: +0.5% for both Gold (×2) and Prism (×3) per level.' },
  speed: { name: 'Coin speed', desc: 'Slows down drifting coins, giving you more time before they escape the board.' },
};

export const FEATURE_BANNERS: Record<FeatureId, { title: string; sub: string }> = {
  combo: { title: 'COMBO UNLOCKED', sub: 'Chain pickups within 1.5 s: +10% each, up to ×2' },
  pulse: { title: 'PULSE UNLOCKED', sub: 'SPACE or right click: huge range for 1 s' },
  anti: { title: 'ANTI-COINS INCOMING', sub: 'Red coins short-circuit your magnet. Watch for the warning marker!' },
};

const GOAL_NOUN: Record<GoalMetric, [string, string]> = {
  coins: ['coin', 'coins'],
  gold: ['Gold coin', 'Gold coins'],
  prism: ['Prism coin', 'Prism coins'],
  anti: ['anti-coin', 'anti-coins'],
};

export const S = {
  newUpgrade: (name: string) => `NEW UPGRADE: ${name.toUpperCase()}`,
  burst: { title: 'COIN BURST', sub: 'Triple spawns for a few seconds!' },
  fountain: { title: 'FOUNTAIN', sub: 'Grab them while you can!' },
  goalComplete: 'GOAL COMPLETE',
  goalText: (g: GoalDef) => `Catch ${g.target.toLocaleString('en-US')} ${GOAL_NOUN[g.metric][g.target === 1 ? 0 : 1]}`,
  goalLabel: { coins: 'COINS', gold: 'GOLD', prism: 'PRISM', anti: 'ANTI' } as Record<GoalMetric, string>,
  goalsTitle: 'GOALS',
  shortCircuit: 'SHORT CIRCUIT',

  hudLine: (time: string, catchPct: number, missed: number, best: number) =>
    `RUN ${time}   CATCH ${catchPct}%   MISSED ${missed}   BEST COMBO ${best}`,
  pulseLocked: (n: string) => `PULSE · earn ${n}`,
  pulseReady: 'PULSE  [SPACE]',
  pulseActive: 'PULSE ACTIVE',
  pulseCooldown: (s: number) => `PULSE  ${s}s`,
  offline: (s: string) => `OFFLINE ${s}s`,
  combo: (n: number) => `COMBO ${n}`,

  upgradesTitle: 'UPGRADES',
  perSecond: (v: string) => `+${v} / s`,
  level: (lv: number, max: number, key: number) => `Lv ${lv}/${max}  [${key}]`,
  locked: 'LOCKED',
  max: 'MAX',
  unlockHint: (n: string) => `Earn ${n} to unlock`,

  prestigeTitle: 'POLARITY SHIFT',
  prestigeProgress: (earned: string) => `Earn 1M this run · ${earned}`,
  prestigeReady: 'READY (coming in M5)',
  cores: (n: number) => `CORES: ${n}`,
};
