/* All player-facing text in one place. Counts and amounts arrive already formatted (formatNumber/formatShort). */
import type { GoalDef, GoalMetric } from '../data/goals';
import type { Element, LodestoneDef, LodestoneExtra, Rarity } from '../data/lodestones';
import type { Branch } from '../data/prestige';
import type { UpgradeId } from '../data/upgrades';
import type { FeatureId } from '../game/types';
import { formatNumber } from './format';

export const UPGRADE_TEXT: Record<UpgradeId, { name: string; desc: string }> = {
  value: { name: 'Value', desc: 'Coins added to your wallet per coin collected.' },
  range: { name: 'Range', desc: 'Radius of the magnetic field. Coins inside it get pulled toward the magnet.' },
  spawn: { name: 'Spawn rate', desc: 'How many new coins appear on the board per second.' },
  strength: { name: 'Strength', desc: 'How fast coins inside the field fly to the magnet. Higher = fewer coins slip away.' },
  capacity: { name: 'Capacity', desc: 'Maximum number of coins on the board at once. New coins stop spawning at the limit.' },
  rarity: { name: 'Rarity', desc: 'Raises the chance of rare coins: +0.5% for both Gold (×2) and Prism (×3) per level.' },
  speed: { name: 'Coin speed', desc: 'Slows down drifting coins, giving you more time before they escape the board.' },
};

export const BRANCH_TEXT: Record<Branch, string> = { N: 'Active play', E: 'Coins & events', S: 'Economy', W: 'Automation' };

export const NODE_TEXT: Record<string, { name: string; desc: string }> = {
  core: { name: 'Polarity Core', desc: 'The heart of the tree. Every Core you have ever earned gives +2% coin value.' },
  Nb1: { name: 'Charged Field', desc: '+10% magnetic field range per level.' },
  Nb2: { name: 'Momentum', desc: 'Moving the cursor fast widens the field: up to +15% range per level at full speed.' },
  Nb3: { name: 'Hot Streak', desc: 'Combo window +0.3 s per level.' },
  Nb4: { name: 'Combo Shield', desc: "Once every 30 s, touching an anti-coin doesn't reset your combo." },
  Nb5: { name: 'Grounding', desc: 'Anti-coin short circuit −0.4 s per level.' },
  Nb6: { name: 'Combo Limit', desc: 'Max combo multiplier ×2 → ×2.5.' },
  Nkey: { name: 'Satellites', desc: 'KEYSTONE · A small magnet orbits the edge of your field and pulls in coins on its own (+1 per level). Ignores anti-coins.' },
  Eb1: { name: 'Lucky Charge', desc: '+1% Gold and Prism chance per level.' },
  Eb2: { name: 'Prism Resonance', desc: 'Prism coins are worth ×4 instead of ×3.' },
  Eb3: { name: 'Storm Front', desc: 'Events happen 20% more often per level.' },
  Eb4: { name: 'Chain Reaction', desc: 'Catching a Prism also collects every coin within 80 px of it.' },
  Eb5: { name: 'Meteor Shower', desc: 'New event: a line of fast coins sweeps across the board from one edge.' },
  Eb6: { name: 'Golden Fountain', desc: 'Fountain events spray Gold coins only.' },
  Ekey: { name: 'Void Coin', desc: 'KEYSTONE · New coin tier: Void, ×10 value, 0.3% chance. Drifts ×1.5 and resists the pull.' },
  Sb1: { name: 'Dividend', desc: '+15% coin value per level.' },
  Sb2: { name: 'Head Start', desc: 'Start each run with 500 / 5,000 / 50,000 coins.' },
  Sb3: { name: 'Discount', desc: 'Upgrades cost 8% less per level.' },
  Sb4: { name: 'Fast Track', desc: 'Upgrades, Combo and Pulse unlock at half the usual earnings.' },
  Sb5: { name: 'Compound', desc: '+1% coin value for every minute of the current run, up to +30%.' },
  Sb6: { name: 'Core Yield', desc: '+20% Cores from every shift per level.' },
  Skey: { name: 'Interest', desc: 'KEYSTONE · Every 10 s you gain 1% of the coins you hold, up to 10 s of perfect income.' },
  Wb1: { name: 'Bulk Buy', desc: 'Hold Shift while buying an upgrade to buy as many levels as you can afford.' },
  Wb2: { name: 'Auto-buyer', desc: 'Automatically buys the cheapest affordable upgrade (up to 4 levels per second).' },
  Wb3: { name: 'Magnet Memory', desc: 'The field keeps working for 1 s after the cursor leaves the board.' },
  Wb4: { name: 'Auto-pulse', desc: 'Pulse fires on its own when it is ready and 5+ coins are within its range.' },
  Wb5: { name: 'Homing Prisms', desc: 'Prism coins slowly steer toward your magnet from anywhere on the board.' },
  Wb6: { name: 'Auto-shift', desc: 'Shift polarity automatically at 1×, 2× or 4× the run goal (button in the shift bar, key A). Cores are banked for your next manual shift.' },
  Wkey: { name: 'Drones', desc: 'KEYSTONE · An autonomous magnet chases coins around the board (+1 per level). Ignores anti-coins.' },
};

export const ELEMENT_TEXT: Record<Element, string> = { iron: 'Iron', cobalt: 'Cobalt', nickel: 'Nickel', neodymium: 'Neodymium' };
const RARITIES_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_TEXT: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
const STONE_SUFFIX: Record<Rarity, string> = { common: 'Shard', rare: 'Ingot', epic: 'Heart', legendary: 'Crown' };
const EXTRA_TEXT: Record<LodestoneExtra, (x: number) => string> = {
  range: x => `+${(x * 100).toFixed(0)}% field range`,
  rareChance: x => `+${(x * 100).toFixed(1)}% Gold & Prism chance`,
  goalReward: x => `+${(x * 100).toFixed(0)}% mini-goal rewards`,
  crystalFind: x => `+${(x * 100).toFixed(0)}% crystal chance from Prisms`,
};

export const lodestoneName = (l: LodestoneDef): string => `${ELEMENT_TEXT[l.element]} ${STONE_SUFFIX[l.rarity]}`;
/** Effect at a given level, e.g. "+3% coin value · +4% field range". */
export function lodestoneEffect(l: LodestoneDef, level: number): string {
  const parts = [`+${(l.valuePerLevel * level * 100).toFixed(0)}% coin value`];
  if (l.extra) parts.push(EXTRA_TEXT[l.extra.kind](l.extra.perLevel * level));
  return parts.join(' · ');
}

export const M = {
  title: 'MAGNETRON',
  subtitle: 'Pull Lodestones with Charge Crystals – kept forever',
  locked: 'Shift polarity once to open the Magnetron',
  crystals: 'CHARGE CRYSTALS',
  pull1: (cost: string) => `PULL ×1 · ${cost} ◈`,
  pull10: (cost: string) => `PULL ×10 · ${cost} ◈`,
  pity: (n: number) => (n <= 1 ? 'Next pull: Epic or better guaranteed' : `Epic or better guaranteed within ${n} pulls`),
  odds: (o: Record<Rarity, number>) => RARITIES_ORDER.map(r => `${RARITY_TEXT[r]} ${Math.round(o[r] * 100)}%`).join(' · '),
  sources: 'Crystals: +1 per mini-goal · +1 per event · +3 per shift · Prisms sometimes drop one',
  collection: 'COLLECTION',
  setBonus: (n: string) => `set bonus +${n}%`,
  totalBonus: (v: string) => `Lodestones: +${v}% coin value`,
  isNew: 'NEW!',
  levelUp: (lv: number) => `LV ${lv}`,
  maxed: 'MAX',
  refund: (n: number) => `+${n} ◈`,
  back: '◀  BACK TO RUN',
  unknown: '???',
  notOwned: 'Not found yet',
  level: (lv: number, max: number) => `Lv ${lv}/${max}`,
  panelButton: (n: string) => `◈ ${n}  [G]`,
  shieldPop: 'SHIELDED',
  chainPop: 'CHAIN',
  meteor: { title: 'METEOR SHOWER', sub: 'A line of fast coins incoming!' },
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
  goalComplete: (reward: string) => `GOAL COMPLETE · +${reward}`,
  goalText: (g: GoalDef) => `Catch ${formatNumber(g.target)} ${GOAL_NOUN[g.metric][g.target === 1 ? 0 : 1]}`,
  goalLabel: { coins: 'COINS', gold: 'GOLD', prism: 'PRISM', anti: 'ANTI' } as Record<GoalMetric, string>,
  goalsTitle: 'GOALS',
  shortCircuit: 'SHORT CIRCUIT',

  hudLine: (time: string, catchPct: number, missed: string, best: string) =>
    `RUN ${time}   CATCH ${catchPct}%   MISSED ${missed}   BEST COMBO ${best}`,
  pulseLocked: (n: string) => `PULSE · earn ${n}`,
  pulseReady: 'PULSE  [SPACE]',
  pulseActive: 'PULSE ACTIVE',
  pulseCooldown: (s: number) => `PULSE  ${s}s`,
  auto: 'AUTO',
  offline: (s: string) => `OFFLINE ${s}s`,
  combo: (n: string) => `COMBO ${n}`,

  upgradesTitle: 'UPGRADES',
  perSecond: (v: string) => `+${v} / s`,
  level: (lv: string, max: string, key: number) => `Lv ${lv}/${max}  [${key}]`,
  locked: 'LOCKED',
  max: 'MAX',
  unlockHint: (n: string) => `Earn ${n} to unlock`,

  prestigeTitle: 'POLARITY SHIFT',
  prestigeProgress: (goal: string, earned: string) => `Earn ${goal} this run · ${earned}`,
  prestigeReadyTitle: 'POLARITY SHIFT · READY',
  prestigeReadyLine: (earned: string) => `Earned ${earned} · shift now for`,
  prestigeGain: (n: string) => `+${n} ◆ CORES`,
  prestigeNext: (at: string) => `next Core at ${at}`,
  treeButton: '◆ CORE TREE  [T]',
  shiftButton: 'SHIFT POLARITY  [P]',
  cores: (n: string) => `CORES: ${n}`,
  autoShiftOff: 'AUTO OFF  [A]',
  autoShiftOn: (mult: number) => `AUTO ×${mult}  [A]`,
  autoShiftTip: (mult: number, at: string) =>
    mult > 0 ? `Auto-shift at ${at} (${mult}× the goal). Cores are banked for your next manual shift. Click or A to change.`
      : 'Auto-shift is off. Click or press A to shift automatically at 1×, 2× or 4× the goal.',
  autoShiftDone: (n: string) => `AUTO-SHIFT #${n}`,
  autoShiftDoneSub: (cores: string, banked: string) => `+${cores} ◆ banked · ${banked} ◆ to spend on your next manual shift`,

  treeTitle: 'POLARITY SHIFT',
  treePreview: 'CORE TREE · PREVIEW',
  treePreviewHint: (goal: string) => `Reach ${goal} and shift to spend Cores here`,
  treeShift: (n: string) => `CORE TREE · shift #${n}`,
  treeGain: (n: string) => `+${n} ◆ from this run`,
  treeTentative: 'choices are final only after you confirm',
  treeCores: 'CORES',
  treeHintBuy: 'drag · scroll to zoom · click to buy',
  treeHintBrowse: 'drag · scroll to zoom · hover for details',
  treeHintReveal: 'new nodes appear next to owned ones',
  treeBack: '◀  BACK TO RUN',
  treeNotYet: '◀  NOT YET',
  treeUndo: 'UNDO',
  treeShiftStart: 'SHIFT & START RUN  ▶',
  nodeAlways: 'Always active',
  nodeMax: (lv: string, max: string) => `MAX · Lv ${lv}/${max}`,
  nodeNext: (lv: string, max: string, cost: string) => `Lv ${lv}/${max} · next: ${cost} ◆`,
  nodePoor: ' (not enough Cores)',
  nodePreview: ' (spend after shifting)',

  confirmTitle: 'SHIFT POLARITY?',
  confirmGain: (n: string) => `+${n} ◆ earned this run`,
  confirmSpent: (spent: string, nodes: number, left: string) =>
    `Spent ${spent} ◆ on ${nodes} node${nodes === 1 ? '' : 's'} · ${left} ◆ saved for later`,
  confirmFormula: (goal: string) => `Cores = 10 × √(earned this run ÷ ${goal}), rounded down`,
  confirmResets: 'RESETS',
  confirmResetList: ['Coins', 'Upgrade levels', 'Unlocks & mini-goals', 'Run stats'],
  confirmKeeps: 'YOU KEEP',
  confirmKeepList: ['Cores & Core tree', 'Lifetime stats', 'Settings'],
  confirmOk: 'SHIFT & START RUN',
  confirmBack: 'BACK TO TREE',
  shiftDone: (n: string) => `POLARITY SHIFT #${n}`,
  shiftDoneSub: 'A new run begins – your Core tree is active.',
  saveUnreadable: { title: 'SAVE COULD NOT BE LOADED', sub: 'Starting a new run. The old save was kept as a backup copy.' },
};
