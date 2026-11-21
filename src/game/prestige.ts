/* Polarity Shift: Cores, Core tree bonuses, tentative spending (draft) and the run reset. */
import { CRYSTALS, ELEMENTS, GACHA, LODESTONES } from '../data/lodestones';
import { AUTO_SHIFT_TARGETS, NODE_BY_ID, NODES, PRESTIGE, parentsOf, type NodeDef } from '../data/prestige';
import { ANTI, COMBO, PULSE } from '../data/tuning';
import { hasEarned } from './money';
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
}

const HEAD_START = [0, 500, 5000, 50000];
export const COMBO_SHIELD_COOLDOWN = 30;

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
      case 'comboMax': b.comboMax = 2.5; break;
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
      case 'satellites': b.satellites = lv; break;
      case 'chainReaction': b.chainReaction = true; break;
      case 'voidCoin': b.voidCoin = true; break;
      case 'interest': b.interest = true; break;
      case 'autoBuy': b.autoBuy = true; break;
      case 'autoPulse': b.autoPulse = true; break;
      case 'autoShift': b.autoShift = true; break;
      case 'drones': b.drones = lv; break;
      case 'core': break;
    }
  }
  applyLodestones(meta, b);
  return b;
}

/** Compound: +1% coin value per minute of the run, up to +30%. */
export const compoundMult = (st: GameState, b: Bonuses): number => (b.compound ? 1 + Math.min(0.3, (0.01 * st.t) / 60) : 1);

/** Earned this run needed to shift: grows linearly with every completed shift. */
export const shiftGoal = (meta: MetaState): number => PRESTIGE.goal * (1 + PRESTIGE.goalStep * meta.shifts);
/** Goal of the run that the next shift starts. */
export const nextShiftGoal = (meta: MetaState): number => shiftGoal({ ...meta, shifts: meta.shifts + 1 });
export const canShift = (st: GameState): boolean => hasEarned(st, shiftGoal(st.meta));
export const treeUnlocked = (st: GameState): boolean => st.meta.shifts > 0 || hasEarned(st, PRESTIGE.treeUnlockAt);

/** Cores a shift would give right now (0 before the goal). */
export function coresFor(st: GameState): number {
  if (!canShift(st)) return 0;
  return Math.floor(PRESTIGE.coreBase * Math.sqrt(st.totalEarned / shiftGoal(st.meta)) * bonuses(st.meta).coreYieldMult);
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
export const nodeVisible = (nodes: Record<string, number>, def: NodeDef): boolean =>
  def.id === 'core' || parentsOf(def).some(p => nodeLevel(nodes, p) > 0);
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

/** Cores spent and nodes bought in this draft compared to the saved tree. */
export function draftSummary(st: GameState, draft: Draft): { spent: number; bought: number } {
  const spent = st.meta.cores + draft.gained - draft.cores;
  const bought = NODES.filter(n => nodeLevel(draft.nodes, n.id) > nodeLevel(st.meta.nodes, n.id)).length;
  return { spent, bought };
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
  };
  Object.assign(st, createState(st.rng, meta, bonuses(meta).headStart));
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
