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
  /** Run goal multiplier by the highest open tree stage: later stages make every run's goal bigger, so runs don't shrink to seconds
      as the stage-2/3 bonuses multiply income (keys = stage 1–4). Mutable for the balance scripts. */
  stageGoal: { 1: 1, 2: 3.5, 3: 7.5, 4: 10 } as Record<1 | 2 | 3 | 4, number>,
  /** Endless (after Break the Compass): its bonuses and the +50 upgrade levels multiply income again, so the goal jumps too. */
  endlessGoal: 300,
};

/** Auto-shift targets as multiples of the run goal (0 = off). Cores ≈ 10 × √multiple: 10 · 14 · 20. */
export const AUTO_SHIFT_TARGETS: readonly number[] = [0, 1, 2, 4];

/** Stage 1 (compass): the four cardinal branches. */
export type Cardinal = 'N' | 'E' | 'S' | 'W';
/** Stage 2 (broken compass): intercardinal branches mixing two neighbours. */
export type Hybrid = 'NE' | 'SE' | 'SW' | 'NW';
/** Stage 3 (full rose): thin mastery spokes between a cardinal and a hybrid branch. */
export type Spoke = 'NNE' | 'ENE' | 'ESE' | 'SSE' | 'SSW' | 'WSW' | 'WNW' | 'NNW';
export type Branch = Cardinal | Hybrid | Spoke;
export const BRANCHES: readonly Cardinal[] = ['N', 'E', 'S', 'W'];
export const HYBRIDS: readonly Hybrid[] = ['NE', 'SE', 'SW', 'NW'];
export const SPOKES: readonly Spoke[] = ['NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW'];
/** The two branches whose keystones a spoke grows from. */
export const SPOKE_PARENTS: Readonly<Record<Spoke, readonly [Cardinal, Hybrid]>> = {
  NNE: ['N', 'NE'], ENE: ['E', 'NE'], ESE: ['E', 'SE'], SSE: ['S', 'SE'], SSW: ['S', 'SW'], WSW: ['W', 'SW'], WNW: ['W', 'NW'], NNW: ['N', 'NW'],
};

/** Cardinal branches: b1 → b2/b3 → b4/b5/b6 → key. Hybrid branches: b1 → b2/b3 → key. Spokes: b1 → key. */
export type Slot = 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'key';
export const SLOT_PARENTS: Readonly<Record<Slot, readonly (Slot | 'core')[]>> = {
  b1: ['core'], b2: ['b1'], b3: ['b1'], b4: ['b2'], b5: ['b2', 'b3'], b6: ['b3'], key: ['b4', 'b5', 'b6'],
};
const HYBRID_PARENTS: Partial<Record<Slot, readonly (Slot | 'core')[]>> = { b1: ['core'], b2: ['b1'], b3: ['b1'], key: ['b2', 'b3'] };

/**
 * 0 = Polarity Core · 1 = compass · 2 = broken compass · 3 = full rose · 4 = Break the Compass (the last upgrade).
 * A stage opens once every node of the previous stage is maxed.
 */
export type Stage = 0 | 1 | 2 | 3 | 4;

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
  | 'satellites' | 'chainReaction' | 'voidCoin' | 'interest' | 'autoBuy' | 'autoPulse' | 'autoShift' | 'drones'
  // stage 2 – NE Hunter · SE Merchant · SW Foundry · NW Machine
  | 'rarePull' | 'goldStreak' | 'goldValue' | 'polarity'
  | 'goalReward' | 'marketDay' | 'insurance' | 'mint'
  | 'helperRange' | 'overtime' | 'smelter' | 'secondShift'
  | 'pulseCooldown' | 'droneLink' | 'pulseDuration' | 'twinMagnet'
  // stage 3 – spokes
  | 'range2' | 'perfectField' | 'rareChance2' | 'jackpot' | 'goldChance' | 'goldenAge' | 'value2' | 'compound2'
  | 'discount2' | 'blueprint' | 'droneSpeed' | 'swarm' | 'pulseRange' | 'orbit' | 'comboWindow2' | 'comboMax2'
  // stage 4
  | 'breakCompass';

export interface NodeDef {
  id: string;
  branch: Branch | 'core' | 'final';
  slot: Slot | 'core' | 'final';
  stage: Stage;
  max: number;
  /** Cost in Cores of each level. */
  cost: readonly number[];
  effect: NodeEffect;
  /** Short glyph drawn inside the node. */
  icon: string;
  /** Ids of the nodes that reveal this one (any owned parent is enough once its stage is open). */
  parents: readonly string[];
}

type Def = Pick<NodeDef, 'max' | 'cost' | 'effect' | 'icon'>;
const branch = (b: Cardinal, defs: Record<Slot, Def>): NodeDef[] =>
  (Object.entries(defs) as [Slot, Def][]).map(([slot, d]) => ({
    id: `${b}${slot}`, branch: b, slot, stage: 1, ...d, parents: SLOT_PARENTS[slot].map(p => (p === 'core' ? 'core' : `${b}${p}`)),
  }));
const hybrid = (b: Hybrid, defs: Record<'b1' | 'b2' | 'b3' | 'key', Def>): NodeDef[] =>
  (Object.entries(defs) as [Slot, Def][]).map(([slot, d]) => ({
    id: `${b}${slot}`, branch: b, slot, stage: 2, ...d, parents: HYBRID_PARENTS[slot]!.map(p => (p === 'core' ? 'core' : `${b}${p}`)),
  }));
const spoke = (b: Spoke, b1: Def, key: Def): NodeDef[] => [
  { id: `${b}b1`, branch: b, slot: 'b1', stage: 3, ...b1, parents: SPOKE_PARENTS[b].map(p => `${p}key`) },
  { id: `${b}key`, branch: b, slot: 'key', stage: 3, ...key, parents: [`${b}b1`] },
];

export const NODES: readonly NodeDef[] = [
  { id: 'core', branch: 'core', slot: 'core', stage: 0, max: 1, cost: [0], effect: 'core', icon: '◆', parents: [] },
  ...branch('N', {
    b1: { max: 3, cost: [1, 2, 3], effect: 'range', icon: 'R+' },
    b2: { max: 2, cost: [2, 4], effect: 'momentum', icon: '»R' },
    b3: { max: 2, cost: [2, 4], effect: 'comboWindow', icon: 'C+' },
    b4: { max: 1, cost: [5], effect: 'comboShield', icon: '⛉' },
    b5: { max: 2, cost: [3, 5], effect: 'stun', icon: '⏚' },
    b6: { max: 1, cost: [5], effect: 'comboMax', icon: '×' },
    key: { max: 3, cost: [7, 10, 13], effect: 'satellites', icon: '◎' },
  }),
  ...branch('E', {
    b1: { max: 3, cost: [2, 3, 4], effect: 'rareChance', icon: '%' },
    b2: { max: 1, cost: [6], effect: 'prismValue', icon: '◇' },
    b3: { max: 2, cost: [2, 4], effect: 'eventRate', icon: '~' },
    b4: { max: 1, cost: [6], effect: 'chainReaction', icon: '⚡' },
    b5: { max: 1, cost: [5], effect: 'meteorShower', icon: '☄' },
    b6: { max: 1, cost: [5], effect: 'goldenFountain', icon: '✺' },
    key: { max: 1, cost: [10], effect: 'voidCoin', icon: '●' },
  }),
  ...branch('S', {
    b1: { max: 5, cost: [1, 2, 3, 4, 5], effect: 'value', icon: '$+' },
    b2: { max: 3, cost: [2, 4, 6], effect: 'headStart', icon: '▶$' },
    b3: { max: 3, cost: [2, 4, 6], effect: 'discount', icon: '−%' },
    b4: { max: 1, cost: [4], effect: 'fastTrack', icon: '»' },
    b5: { max: 1, cost: [5], effect: 'compound', icon: '↗' },
    b6: { max: 2, cost: [6, 7], effect: 'coreYield', icon: '◆+' },
    key: { max: 1, cost: [9], effect: 'interest', icon: '%$' },
  }),
  ...branch('W', {
    b1: { max: 1, cost: [1], effect: 'bulkBuy', icon: '≡' },
    b2: { max: 1, cost: [6], effect: 'autoBuy', icon: 'A' },
    b3: { max: 1, cost: [3], effect: 'magnetMemory', icon: 'M' },
    b4: { max: 1, cost: [5], effect: 'autoPulse', icon: '⟳' },
    b5: { max: 1, cost: [4], effect: 'homingPrisms', icon: '◇→' },
    b6: { max: 1, cost: [8], effect: 'autoShift', icon: '⇄' },
    key: { max: 3, cost: [8, 12, 16], effect: 'drones', icon: '✦' },
  }),
  // ---- stage 2: the broken compass ----
  ...hybrid('NE', {
    b1: { max: 3, cost: [5, 7, 9], effect: 'rarePull', icon: '»◇' },
    b2: { max: 2, cost: [8, 10], effect: 'goldStreak', icon: '×$' },
    b3: { max: 2, cost: [8, 10], effect: 'goldValue', icon: '$$' },
    key: { max: 1, cost: [16], effect: 'polarity', icon: '±' },
  }),
  ...hybrid('SE', {
    b1: { max: 3, cost: [5, 7, 9], effect: 'goalReward', icon: '★+' },
    b2: { max: 1, cost: [10], effect: 'marketDay', icon: '−$' },
    b3: { max: 2, cost: [8, 10], effect: 'insurance', icon: '⛨' },
    key: { max: 1, cost: [16], effect: 'mint', icon: '❖' },
  }),
  ...hybrid('SW', {
    b1: { max: 3, cost: [5, 7, 9], effect: 'helperRange', icon: '◎+' },
    b2: { max: 1, cost: [10], effect: 'overtime', icon: '%»' },
    b3: { max: 1, cost: [10], effect: 'smelter', icon: 'A»' },
    key: { max: 1, cost: [16], effect: 'secondShift', icon: '✦+' },
  }),
  ...hybrid('NW', {
    b1: { max: 2, cost: [6, 9], effect: 'pulseCooldown', icon: '⟳−' },
    b2: { max: 1, cost: [10], effect: 'droneLink', icon: '✦◎' },
    b3: { max: 2, cost: [8, 10], effect: 'pulseDuration', icon: '⟳+' },
    key: { max: 1, cost: [16], effect: 'twinMagnet', icon: '◐' },
  }),
  // ---- stage 3: the full rose (each spoke grows from the keystones of its two neighbours) ----
  ...spoke('NNE', { max: 3, cost: [8, 10, 12], effect: 'range2', icon: 'R+' }, { max: 1, cost: [22], effect: 'perfectField', icon: '◉' }),
  ...spoke('ENE', { max: 3, cost: [8, 10, 12], effect: 'rareChance2', icon: '%' }, { max: 1, cost: [22], effect: 'jackpot', icon: '7' }),
  ...spoke('ESE', { max: 3, cost: [8, 10, 12], effect: 'goldChance', icon: '$%' }, { max: 1, cost: [22], effect: 'goldenAge', icon: '☼' }),
  ...spoke('SSE', { max: 3, cost: [8, 10, 12], effect: 'value2', icon: '$+' }, { max: 1, cost: [22], effect: 'compound2', icon: '↗↗' }),
  ...spoke('SSW', { max: 3, cost: [8, 10, 12], effect: 'discount2', icon: '−%' }, { max: 1, cost: [22], effect: 'blueprint', icon: '▦' }),
  ...spoke('WSW', { max: 3, cost: [8, 10, 12], effect: 'droneSpeed', icon: '✦»' }, { max: 1, cost: [22], effect: 'swarm', icon: '✦✦' }),
  ...spoke('WNW', { max: 2, cost: [10, 12], effect: 'pulseRange', icon: '⟳R' }, { max: 1, cost: [22], effect: 'orbit', icon: '◎◎' }),
  ...spoke('NNW', { max: 2, cost: [10, 12], effect: 'comboWindow2', icon: 'C+' }, { max: 1, cost: [22], effect: 'comboMax2', icon: '×3' }),
  // ---- stage 4: the last upgrade ----
  { id: 'compass', branch: 'final', slot: 'final', stage: 4, max: 1, cost: [100], effect: 'breakCompass', icon: '★', parents: [] },
];

export const NODE_BY_ID: Readonly<Record<string, NodeDef>> = Object.fromEntries(NODES.map(n => [n.id, n]));

/** Ids of a node's parents (a node is revealed once any parent is owned and its stage is open). */
export const parentsOf = (def: NodeDef): readonly string[] => def.parents;

/** Nodes of each stage (stage 0 = the Polarity Core). */
export const STAGE_NODES: Readonly<Record<Stage, readonly NodeDef[]>> = {
  0: NODES.filter(n => n.stage === 0), 1: NODES.filter(n => n.stage === 1), 2: NODES.filter(n => n.stage === 2),
  3: NODES.filter(n => n.stage === 3), 4: NODES.filter(n => n.stage === 4),
};

/** Break the Compass (the last upgrade): extra levels on every upgrade cap and its other bonuses. */
export const BREAK_COMPASS = { extraLevels: 50, valueMult: 3, drones: 2, satellites: 2 };
