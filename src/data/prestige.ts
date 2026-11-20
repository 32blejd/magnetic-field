/* Polarity Shift (prestige) and the Core tree – pure data. Node names/descriptions live in ui/strings.ts,
   node positions in ui/treeLayout.ts, effect magnitudes in game/prestige.ts. */

export const PRESTIGE = {
  /** Earned this run needed for the first shift. */
  goal: 1_000_000,
  /** Each completed shift raises the goal linearly: goal × (1 + goalStep × shifts). Linear, because in-run income has a ceiling (upgrade caps) and Core tree bonuses grow roughly linearly. */
  goalStep: 1.5,
  /** Earned this run from which the Core tree can be browsed (always available after the first shift). */
  treeUnlockAt: 100_000,
  /** Cores = floor(coreBase × √(earned ÷ this run's goal) × Core Yield bonus) – about 10 at the goal of any run. */
  coreBase: 10,
  /** Polarity Core (tree centre): +2% coin value per Core ever earned. */
  coreValuePerCore: 0.02,
};

/** Auto-shift targets as multiples of the run goal (0 = off). Cores ≈ 10 × √multiple: 10 · 14 · 20. */
export const AUTO_SHIFT_TARGETS: readonly number[] = [0, 1, 2, 4];

/** Compass directions of the four branches. */
export type Branch = 'N' | 'E' | 'S' | 'W';
export const BRANCHES: readonly Branch[] = ['N', 'E', 'S', 'W'];

/** Every branch has the same shape: b1 → b2/b3 → b4/b5/b6 → key. */
export type Slot = 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'key';
export const SLOT_PARENTS: Readonly<Record<Slot, readonly (Slot | 'core')[]>> = {
  b1: ['core'], b2: ['b1'], b3: ['b1'], b4: ['b2'], b5: ['b2', 'b3'], b6: ['b3'], key: ['b4', 'b5', 'b6'],
};

export type NodeEffect =
  | 'core'
  // N – active play
  | 'range' | 'momentum' | 'comboWindow' | 'comboShield' | 'stun' | 'comboMax'
  // E – coins & events
  | 'rareChance' | 'prismValue' | 'eventRate' | 'meteorShower' | 'goldenFountain'
  // S – economy
  | 'value' | 'headStart' | 'discount' | 'fastTrack' | 'compound' | 'coreYield'
  // W – automation
  | 'bulkBuy' | 'magnetMemory' | 'homingPrisms'
  // keystones and M5 mechanics
  | 'satellites' | 'chainReaction' | 'voidCoin' | 'interest' | 'autoBuy' | 'autoPulse' | 'autoShift' | 'drones';

export interface NodeDef {
  id: string;
  branch: Branch | 'core';
  slot: Slot | 'core';
  max: number;
  /** Cost in Cores of each level. */
  cost: readonly number[];
  effect: NodeEffect;
  /** Short glyph drawn inside the node. */
  icon: string;
}

type Def = Pick<NodeDef, 'max' | 'cost' | 'effect' | 'icon'>;
const branch = (b: Branch, defs: Record<Slot, Def>): NodeDef[] =>
  (Object.entries(defs) as [Slot, Def][]).map(([slot, d]) => ({ id: `${b}${slot}`, branch: b, slot, ...d }));

export const NODES: readonly NodeDef[] = [
  { id: 'core', branch: 'core', slot: 'core', max: 1, cost: [0], effect: 'core', icon: '◆' },
  ...branch('N', {
    b1: { max: 3, cost: [1, 2, 3], effect: 'range', icon: 'R+' },
    b2: { max: 2, cost: [2, 4], effect: 'momentum', icon: '»R' },
    b3: { max: 2, cost: [2, 4], effect: 'comboWindow', icon: 'C+' },
    b4: { max: 1, cost: [5], effect: 'comboShield', icon: '⛉' },
    b5: { max: 2, cost: [3, 5], effect: 'stun', icon: '⏚' },
    b6: { max: 1, cost: [5], effect: 'comboMax', icon: '×' },
    key: { max: 3, cost: [10, 15, 20], effect: 'satellites', icon: '◎' },
  }),
  ...branch('E', {
    b1: { max: 3, cost: [2, 3, 4], effect: 'rareChance', icon: '%' },
    b2: { max: 1, cost: [6], effect: 'prismValue', icon: '◇' },
    b3: { max: 2, cost: [2, 4], effect: 'eventRate', icon: '~' },
    b4: { max: 1, cost: [6], effect: 'chainReaction', icon: '⚡' },
    b5: { max: 1, cost: [5], effect: 'meteorShower', icon: '☄' },
    b6: { max: 1, cost: [5], effect: 'goldenFountain', icon: '✺' },
    key: { max: 1, cost: [15], effect: 'voidCoin', icon: '●' },
  }),
  ...branch('S', {
    b1: { max: 5, cost: [1, 2, 3, 4, 5], effect: 'value', icon: '$+' },
    b2: { max: 3, cost: [2, 4, 6], effect: 'headStart', icon: '▶$' },
    b3: { max: 3, cost: [2, 4, 6], effect: 'discount', icon: '−%' },
    b4: { max: 1, cost: [4], effect: 'fastTrack', icon: '»' },
    b5: { max: 1, cost: [5], effect: 'compound', icon: '↗' },
    b6: { max: 2, cost: [6, 10], effect: 'coreYield', icon: '◆+' },
    key: { max: 1, cost: [14], effect: 'interest', icon: '%$' },
  }),
  ...branch('W', {
    b1: { max: 1, cost: [1], effect: 'bulkBuy', icon: '≡' },
    b2: { max: 1, cost: [6], effect: 'autoBuy', icon: 'A' },
    b3: { max: 1, cost: [3], effect: 'magnetMemory', icon: 'M' },
    b4: { max: 1, cost: [8], effect: 'autoPulse', icon: '⟳' },
    b5: { max: 1, cost: [4], effect: 'homingPrisms', icon: '◇→' },
    b6: { max: 1, cost: [12], effect: 'autoShift', icon: '⇄' },
    key: { max: 3, cost: [12, 18, 24], effect: 'drones', icon: '✦' },
  }),
];

export const NODE_BY_ID: Readonly<Record<string, NodeDef>> = Object.fromEntries(NODES.map(n => [n.id, n]));

/** Ids of a node's parents (a node is revealed once any parent is owned). */
export function parentsOf(def: NodeDef): string[] {
  if (def.branch === 'core' || def.slot === 'core') return [];
  return SLOT_PARENTS[def.slot].map(p => (p === 'core' ? 'core' : `${def.branch}${p}`));
}
