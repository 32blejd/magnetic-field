/* Polarity Shift: Cores, Core tree bonuses, tentative spending (draft) and the run reset. */
import { CRYSTALS, ELEMENTS, GACHA, LODESTONES } from '../data/lodestones';
import { AUTO_SHIFT_TARGETS, BREAK_COMPASS, NODE_BY_ID, NODES, PRESTIGE, STAGE_NODES, parentsOf, type NodeDef, type Stage } from '../data/prestige';
import { ANTI, AUTO, COMBO, INTEREST, PULSE } from '../data/tuning';
import { UPGRADES } from '../data/upgrades';
import { earnedRatio, hasEarned } from './money';
import { createState, emptyMeta } from './state';
import type { GameState, MetaState } from './types';

export { emptyMeta };

/** Everything the Core tree and Lodestones change, already combined. Neutral values when nothing is owned. */
export interface Bonuses {
  rangeMult: number;
  /** Momentum: max extra range (fraction) reached at full cursor speed. */
  momentum: number;
  pulseCooldown: number;
  pulseRangeMult: number;
  comboWindow: number;
  comboMax: number;
  /** Combo Shield: an anti-coin doesn't reset the combo, once per COMBO_SHIELD_COOLDOWN seconds. */
  comboShield: boolean;
  stunTime: number;
  /** Added to both Gold and Prism chance. */
  rareChance: number;
  prismValue: number;
  eventRateMult: number;
  /** Adds the Meteor Shower event to the event pool. */
  meteorShower: boolean;
  /** Fountain events spray Gold coins only. */
  goldenFountain: boolean;
  /** Dividend × Polarity Core × Lodestones. */
  valueMult: number;
  headStart: number;
  costMult: number;
  /** Multiplies upgrade / combo / pulse unlock thresholds (not anti-coins). */
  unlockMult: number;
  compound: boolean;
  coreYieldMult: number;
  bulkBuy: boolean;
  magnetMemory: boolean;
  /** Prism coins steer toward the magnet from anywhere on the board. */
  homingPrisms: boolean;
  /** Mini-goal reward multiplier (Nickel lodestones). */
  goalRewardMult: number;
  /** Extra chance for a Prism pickup to drop a Charge Crystal (Neodymium lodestones). */
  crystalFind: number;
  /** Number of Satellites orbiting the cursor. */
  satellites: number;
  /** Catching a Prism also collects every coin within CHAIN.radius. */
  chainReaction: boolean;
  /** Adds the Void tier to coin rolls. */
  voidCoin: boolean;
  interest: boolean;
  autoBuy: boolean;
  autoPulse: boolean;
  /** The Auto-shift node is owned (the target itself is a setting in meta.autoShift). */
  autoShift: boolean;
  /** Number of Drones roaming the board. */
  drones: number;
  // ---- stage 2 ----
  /** Pull multiplier on rare coins (Gold, Prism, Void) – Predator. */
  rarePull: number;
  /** Extra Gold chance while the combo is at its max – Golden Streak. */
  goldStreak: number;
  /** Gold coin value multiplier (×2 base) – Trophy. */
  goldValue: number;
  /** The field pushes anti-coins away; one pushed off the board pays like a Prism – Polarity. */
  polarity: boolean;
  /** Upgrades cost half during a Burst – Market Day. */
  marketDay: boolean;
  /** Share of an escaped coin's value paid out anyway – Insurance. */
  insurance: number;
  /** A caught Gold coin splits off two basic coins – Mint. */
  mint: boolean;
  /** Field size multiplier of Satellites, Drones and the Twin Magnet – Assembly Line. */
  helperRangeMult: number;
  /** Seconds between Interest payouts – Overtime. */
  interestEvery: number;
  /** Seconds between Auto-buyer purchases – Smelter. */
  autoBuyEvery: number;
  droneSpeedMult: number;
  /** Helper magnet fields grow with Pulse too – Drone Link. */
  droneLink: boolean;
  pulseDuration: number;
  /** A second magnet mirrored through the board centre – Twin Magnet. */
  twinMagnet: boolean;
  // ---- stage 3 ----
  /** Field +50% while the combo is at its max – Perfect Field. */
  perfectField: boolean;
  /** Some pickups pay ×JACKPOT.mult – Jackpot. */
  jackpot: boolean;
  /** Added to the Gold chance only. */
  goldChance: number;
  /** Compound: max bonus and bonus per minute. */
  compoundCap: number;
  compoundRate: number;
  /** Every run starts with all upgrades unlocked at BLUEPRINT_LEVEL – Blueprint. */
  blueprint: boolean;
  // ---- stage 4 ----
  /** Break the Compass: extra levels on every upgrade cap. */
  extraLevels: number;
  compassBroken: boolean;
}

const HEAD_START = [0, 500, 5000, 50000];
export const COMBO_SHIELD_COOLDOWN = 30;
/** Perfect Field: field multiplier at max combo. Jackpot: chance and payout of a jackpot pickup. Blueprint: starting upgrade level. */
export const PERFECT_FIELD = 1.5;
export const JACKPOT = { chance: 0.01, mult: 25 };
export const BLUEPRINT_LEVEL = 5;

/** Lodestone part of the bonuses: value %, extras and element set bonuses. */
function applyLodestones(meta: MetaState, b: Bonuses): void {
  let value = 0;
  for (const def of LODESTONES) {
    const lv = meta.lodestones[def.id] ?? 0;
    if (lv <= 0) continue;
    value += def.valuePerLevel * lv;
    if (!def.extra) continue;
    const x = def.extra.perLevel * lv;
    switch (def.extra.kind) {
      case 'range': b.rangeMult += x; break;
      case 'rareChance': b.rareChance += x; break;
      case 'goalReward': b.goalRewardMult += x; break;
      case 'crystalFind': b.crystalFind += x; break;
    }
  }
  for (const el of ELEMENTS) {
    if (LODESTONES.every(l => l.element !== el || (meta.lodestones[l.id] ?? 0) > 0)) value += GACHA.setBonus;
  }
  b.valueMult *= 1 + value;
}

export function bonuses(meta: MetaState): Bonuses {
  const b: Bonuses = {
    rangeMult: 1, momentum: 0, pulseCooldown: PULSE.cooldown, pulseRangeMult: PULSE.rangeMult, comboWindow: COMBO.window,
    comboMax: COMBO.max, comboShield: false, stunTime: ANTI.stun, rareChance: 0, prismValue: 3, eventRateMult: 1,
    meteorShower: false, goldenFountain: false, valueMult: 1 + PRESTIGE.coreValuePerCore * meta.coresEarned, headStart: 0,
    costMult: 1, unlockMult: 1, compound: false, coreYieldMult: 1, bulkBuy: false, magnetMemory: false, homingPrisms: false,
    goalRewardMult: 1, crystalFind: 0, satellites: 0, chainReaction: false, voidCoin: false, interest: false, autoBuy: false,
    autoPulse: false, autoShift: false, drones: 0,
    rarePull: 1, goldStreak: 0, goldValue: 2, polarity: false, marketDay: false, insurance: 0, mint: false, helperRangeMult: 1,
    interestEvery: INTEREST.every, autoBuyEvery: AUTO.buyEvery, droneSpeedMult: 1, droneLink: false, pulseDuration: PULSE.duration,
    twinMagnet: false, perfectField: false, jackpot: false, goldChance: 0, compoundCap: 0.3, compoundRate: 0.01, blueprint: false,
    extraLevels: 0, compassBroken: false,
  };
  for (const def of NODES) {
    const lv = meta.nodes[def.id] ?? 0;
    if (lv <= 0) continue;
    switch (def.effect) {
      case 'range': b.rangeMult += 0.1 * lv; break;
      case 'momentum': b.momentum += 0.15 * lv; break;
      case 'comboWindow': b.comboWindow += 0.3 * lv; break;
      case 'comboShield': b.comboShield = true; break;
      case 'stun': b.stunTime -= 0.4 * lv; break;
      case 'comboMax': b.comboMax = Math.max(b.comboMax, 2.5); break;
      case 'rareChance': b.rareChance += 0.01 * lv; break;
      case 'prismValue': b.prismValue = 4; break;
      case 'eventRate': b.eventRateMult += 0.2 * lv; break;
      case 'meteorShower': b.meteorShower = true; break;
      case 'goldenFountain': b.goldenFountain = true; break;
      case 'value': b.valueMult *= 1 + 0.15 * lv; break;
      case 'headStart': b.headStart = HEAD_START[Math.min(lv, HEAD_START.length - 1)]!; break;
      case 'discount': b.costMult -= 0.08 * lv; break;
      case 'fastTrack': b.unlockMult = 0.5; break;
      case 'compound': b.compound = true; break;
      case 'coreYield': b.coreYieldMult += 0.2 * lv; break;
      case 'bulkBuy': b.bulkBuy = true; break;
      case 'magnetMemory': b.magnetMemory = true; break;
      case 'homingPrisms': b.homingPrisms = true; break;
      case 'satellites': b.satellites += lv; break;
      case 'chainReaction': b.chainReaction = true; break;
      case 'voidCoin': b.voidCoin = true; break;
      case 'interest': b.interest = true; break;
      case 'autoBuy': b.autoBuy = true; break;
      case 'autoPulse': b.autoPulse = true; break;
      case 'autoShift': b.autoShift = true; break;
      case 'drones': b.drones += lv; break;
      case 'rarePull': b.rarePull += 0.15 * lv; break;
      case 'goldStreak': b.goldStreak += 0.03 * lv; break;
      case 'goldValue': b.goldValue += 0.5 * lv; break;
      case 'polarity': b.polarity = true; break;
      case 'goalReward': b.goalRewardMult += 0.5 * lv; break;
      case 'marketDay': b.marketDay = true; break;
      case 'insurance': b.insurance += 0.1 * lv; break;
      case 'mint': b.mint = true; break;
      case 'helperRange': b.helperRangeMult += 0.15 * lv; break;
      case 'overtime': b.interestEvery = INTEREST.every / 2; break;
      case 'smelter': b.autoBuyEvery = AUTO.buyEvery / 2; break;
      case 'secondShift': b.drones += 1; b.droneSpeedMult += 0.4; break;
      case 'pulseCooldown': b.pulseCooldown *= 1 - 0.2 * lv; break;
      case 'droneLink': b.droneLink = true; break;
      case 'pulseDuration': b.pulseDuration += 0.5 * lv; break;
      case 'twinMagnet': b.twinMagnet = true; break;
      case 'range2': b.rangeMult += 0.05 * lv; break;
      case 'perfectField': b.perfectField = true; break;
      case 'rareChance2': b.rareChance += 0.005 * lv; break;
      case 'jackpot': b.jackpot = true; break;
      case 'goldChance': b.goldChance += 0.01 * lv; break;
      case 'goldenAge': b.goldChance += 0.1; break;
      case 'value2': b.valueMult *= 1 + 0.1 * lv; break;
      case 'compound2': b.compoundCap = 1; b.compoundRate = 0.02; break;
      case 'discount2': b.costMult -= 0.05 * lv; break;
      case 'blueprint': b.blueprint = true; break;
      case 'droneSpeed': b.droneSpeedMult += 0.15 * lv; break;
      case 'swarm': b.drones += 2; break;
      case 'pulseRange': b.pulseRangeMult += 0.5 * lv; break;
      case 'orbit': b.satellites += 2; break;
      case 'comboWindow2': b.comboWindow += 0.3 * lv; break;
      case 'comboMax2': b.comboMax = Math.max(b.comboMax, 3); break;
      case 'breakCompass':
        b.compassBroken = true;
        b.extraLevels = BREAK_COMPASS.extraLevels;
        b.valueMult *= BREAK_COMPASS.valueMult;
        b.drones += BREAK_COMPASS.drones;
        b.satellites += BREAK_COMPASS.satellites;
        break;
      case 'core': break;
    }
  }
  applyLodestones(meta, b);
  return b;
}

/** Compound: +1% coin value per minute of the run, up to +30% (Compound II: +2% per minute, up to +100%). */
export const compoundMult = (st: GameState, b: Bonuses): number =>
  (b.compound ? 1 + Math.min(b.compoundCap, (b.compoundRate * st.t) / 60) : 1);

/** Earned this run needed to shift: grows linearly with every completed shift, and jumps with every tree stage that opens. */
export const shiftGoal = (meta: MetaState): number =>
  PRESTIGE.goal * (1 + PRESTIGE.goalStep * meta.shifts) * (treeComplete(meta.nodes) ? PRESTIGE.endlessGoal : PRESTIGE.stageGoal[openStage(meta.nodes)]);
/** Goal of the run that the next shift starts. */
export const nextShiftGoal = (meta: MetaState): number => shiftGoal({ ...meta, shifts: meta.shifts + 1 });
export const canShift = (st: GameState): boolean => hasEarned(st, shiftGoal(st.meta));
export const treeUnlocked = (st: GameState): boolean => st.meta.shifts > 0 || hasEarned(st, PRESTIGE.treeUnlockAt);

/** Cores a shift would give right now (0 before the goal). */
export function coresFor(st: GameState): number {
  if (!canShift(st)) return 0;
  return Math.floor(PRESTIGE.coreBase * Math.sqrt(earnedRatio(st, shiftGoal(st.meta))) * bonuses(st.meta).coreYieldMult);
}

/** Earned this run needed for one more Core. */
export function nextCoreAt(st: GameState): number {
  const yieldMult = bonuses(st.meta).coreYieldMult;
  const next = Math.max(coresFor(st), Math.floor(PRESTIGE.coreBase * yieldMult)) + 1;
  return Math.ceil(shiftGoal(st.meta) * (next / (PRESTIGE.coreBase * yieldMult)) ** 2);
}

/* ---------- tentative spending on the shift screen ---------- */

export interface Draft {
  nodes: Record<string, number>;
  cores: number;
  /** Cores this shift adds. */
  gained: number;
}

export function startDraft(st: GameState): Draft {
  const gained = coresFor(st);
  return { nodes: { ...st.meta.nodes }, cores: st.meta.cores + gained, gained };
}

export const nodeLevel = (nodes: Record<string, number>, id: string): number => (id === 'core' ? 1 : nodes[id] ?? 0);
export const nodeMaxed = (nodes: Record<string, number>, def: NodeDef): boolean => nodeLevel(nodes, def.id) >= def.max;
/** A stage opens once every node of the previous stage is maxed (stages 0 and 1 are always open). */
export const stageOpen = (nodes: Record<string, number>, stage: Stage): boolean =>
  stage <= 1 || STAGE_NODES[(stage - 1) as Stage].every(n => nodeMaxed(nodes, n));
/** Highest stage open right now (1–4). */
export type OpenStage = 1 | 2 | 3 | 4;
export function openStage(nodes: Record<string, number>): OpenStage {
  let s: OpenStage = 1;
  while (s < 4 && stageOpen(nodes, (s + 1) as Stage)) s = (s + 1) as OpenStage;
  return s;
}
export const nodeVisible = (nodes: Record<string, number>, def: NodeDef): boolean =>
  def.id === 'core' || (stageOpen(nodes, def.stage) && (parentsOf(def).length === 0 || parentsOf(def).some(p => nodeLevel(nodes, p) > 0)));
/** Break the Compass is owned: the tree is complete and locked. */
export const treeComplete = (nodes: Record<string, number>): boolean => nodeLevel(nodes, 'compass') > 0;
export const nodeCost = (nodes: Record<string, number>, def: NodeDef): number => def.cost[nodeLevel(nodes, def.id)] ?? Infinity;

export function canBuyNode(draft: Draft, def: NodeDef): boolean {
  return def.id !== 'core' && nodeVisible(draft.nodes, def) &&
    !nodeMaxed(draft.nodes, def) && draft.cores >= nodeCost(draft.nodes, def);
}

export function buyNode(draft: Draft, def: NodeDef): boolean {
  if (!canBuyNode(draft, def)) return false;
  draft.cores -= nodeCost(draft.nodes, def);
  draft.nodes[def.id] = nodeLevel(draft.nodes, def.id) + 1;
  return true;
}

/* Respec (free, shift screen only): refund single levels or the whole tree back into the draft. */

/** Cores paid for levels [from, to) of a node. */
const levelsCost = (def: NodeDef, from: number, to: number): number => def.cost.slice(from, to).reduce((a, c) => a + c, 0);

/**
 * A node level can be refunded if it's owned – unless it's the last level and some owned node would lose its only owned parent
 * (it would be left floating in the tree). Leaves first, or reset the whole tree.
 */
export function canRefundNode(draft: Draft, def: NodeDef): boolean {
  const lv = nodeLevel(draft.nodes, def.id);
  if (def.id === 'core' || lv <= 0 || treeComplete(draft.nodes)) return false;
  // a later stage stays open only while every node of the earlier ones is maxed
  if (lv === def.max && NODES.some(n => n.stage > def.stage && nodeLevel(draft.nodes, n.id) > 0)) return false;
  if (lv > 1) return true;
  return NODES.every(n => nodeLevel(draft.nodes, n.id) === 0 || !parentsOf(n).includes(def.id) ||
    parentsOf(n).some(p => p !== def.id && nodeLevel(draft.nodes, p) > 0));
}

export function refundNode(draft: Draft, def: NodeDef): boolean {
  if (!canRefundNode(draft, def)) return false;
  const lv = nodeLevel(draft.nodes, def.id);
  draft.cores += def.cost[lv - 1]!;
  if (lv > 1) draft.nodes[def.id] = lv - 1; else delete draft.nodes[def.id];
  return true;
}

/** Refunds every node of the draft (not once the tree is complete). Returns the Cores refunded. */
export function resetDraft(draft: Draft): number {
  if (treeComplete(draft.nodes)) return 0;
  let refunded = 0;
  for (const n of NODES) if (n.id !== 'core') refunded += levelsCost(n, 0, nodeLevel(draft.nodes, n.id));
  draft.cores += refunded;
  draft.nodes = {};
  return refunded;
}

/** Compared to the saved tree: Cores spent on new levels, Cores refunded from removed levels, and nodes that gained levels. */
export function draftSummary(st: GameState, draft: Draft): { spent: number; refunded: number; bought: number } {
  let spent = 0, refunded = 0, bought = 0;
  for (const n of NODES) {
    if (n.id === 'core') continue;
    const was = nodeLevel(st.meta.nodes, n.id), now = nodeLevel(draft.nodes, n.id);
    if (now > was) { spent += levelsCost(n, was, now); bought++; } else refunded += levelsCost(n, now, was);
  }
  return { spent, refunded, bought };
}

/** Applies the draft, keeps the meta progress and starts a fresh run in the same state object. */
export function commitShift(st: GameState, draft: Draft): void {
  const meta: MetaState = {
    cores: draft.cores,
    coresEarned: st.meta.coresEarned + draft.gained,
    shifts: st.meta.shifts + 1,
    nodes: Object.fromEntries(Object.entries(draft.nodes).filter(([id, lv]) => NODE_BY_ID[id] && lv > 0)),
    crystals: st.meta.crystals + CRYSTALS.perShift,
    lodestones: { ...st.meta.lodestones },
    pity: st.meta.pity,
    autoShift: st.meta.autoShift,
    autoBuyOff: st.meta.autoBuyOff,
    life: { ...st.meta.life, caught: { ...st.meta.life.caught } },
  };
  const b = bonuses(meta);
  Object.assign(st, createState(st.rng, meta, b.headStart));
  if (b.blueprint) { // every upgrade unlocked and at BLUEPRINT_LEVEL from the start
    for (const u of UPGRADES) { st.levels[u.id] = Math.min(BLUEPRINT_LEVEL, u.max); st.unlocked[u.id] = true; }
    st.unlockOrder = UPGRADES.map(u => u.id);
  }
}

/* ---------- Auto-shift ---------- */

/** Earned this run at which Auto-shift fires, or null when it's off (or the node isn't owned). */
export function autoShiftAt(st: GameState): number | null {
  if (!bonuses(st.meta).autoShift || st.meta.autoShift <= 0) return null;
  return shiftGoal(st.meta) * st.meta.autoShift;
}

/** Auto-shift is on and its target has been earned this run. */
export function autoShiftDue(st: GameState): boolean {
  const at = autoShiftAt(st);
  return at !== null && canShift(st) && hasEarned(st, at);
}

/** Shifts without buying anything – this run's Cores are banked for the next manual shift. Returns the Cores gained. */
export function commitAutoShift(st: GameState): number {
  const draft = startDraft(st);
  commitShift(st, draft);
  return draft.gained;
}

/** Next Auto-shift setting: off → ×1 → ×2 → ×4 → off. */
export function nextAutoShiftTarget(current: number): number {
  const i = AUTO_SHIFT_TARGETS.indexOf(current);
  return AUTO_SHIFT_TARGETS[(i + 1) % AUTO_SHIFT_TARGETS.length]!;
}
