/* A bot that plays the real game logic: dodges nearby anti-coins (and their warnings), chases the nearest good coin,
   fires Pulse when 3+ coins are on the board, and always buys the cheapest affordable upgrade.
   Used by the balance simulator and the balance test. */
import { BOARD, STEP } from '../src/data/tuning';
import { UPGRADES } from '../src/data/upgrades';
import { GACHA } from '../src/data/lodestones';
import { NODES } from '../src/data/prestige';
import { pullMany } from '../src/game/lodestones';
import { triggerPulse } from '../src/game/abilities';
import { buyNode, canBuyNode, commitShift, nodeCost, shiftGoal, startDraft } from '../src/game/prestige';
import { buy, canBuy, isMaxed, nextCost } from '../src/game/shop';
import { step } from '../src/game/simulation';
import { createState } from '../src/game/state';
import type { GameEvent, GameState } from '../src/game/types';

export interface BotRun {
  st: GameState;
  /** Time (s) when each milestone of total earned was first reached. */
  milestones: Record<number, number>;
  firstBuy: number | null;
  maxedAt: number | null;
}

export const MILESTONES = [100, 1e3, 1e4, 1e5, 1e6];

/** Shifts polarity, spends the Cores greedily on the cheapest purchasable nodes (any branch), then spends all crystals in the Magnetron. */
export function botShift(st: GameState): void {
  const draft = startDraft(st);
  for (;;) {
    const options = NODES.filter(n => canBuyNode(draft, n)).sort((a, b) => nodeCost(draft.nodes, a) - nodeCost(draft.nodes, b));
    if (!options.length) break;
    buyNode(draft, options[0]!);
  }
  commitShift(st, draft);
  pullMany(st, Math.floor(st.meta.crystals / GACHA.pullCost));
}

/**
 * Plays one run until `goal` is earned.
 * @param cursorSpeed max cursor speed in logical px/s (×2 for 1080p px/s); ~400 ≈ an attentive, active player
 * @param goal stop once this much has been earned this run (default: this run's shift goal)
 * @param start continue from this state (e.g. a fresh run after Polarity Shift) instead of a new game
 */
export function runBot(seed: number, cursorSpeed: number, goal?: number, limit = 3 * 3600, start?: GameState): BotRun {
  const st = start ?? createState(seed);
  const target = goal ?? shiftGoal(st.meta);
  const cur = { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2 };
  const milestones: Record<number, number> = {};
  const events: GameEvent[] = [];
  let firstBuy: number | null = null, maxedAt: number | null = null;

  while (st.t < limit && st.totalEarned < target) {
    let best = null, bestD = Infinity, threatD = Infinity, tx = 0, ty = 0;
    for (const c of st.coins) {
      const d = Math.hypot(c.x - cur.x, c.y - cur.y);
      if (c.anti) { if (d < threatD) { threatD = d; tx = c.x; ty = c.y; } }
      else if (d < bestD) { bestD = d; best = c; }
    }
    for (const w of st.warnings) {
      const d = Math.hypot(w.x - cur.x, w.y - cur.y);
      if (d < threatD) { threatD = d; tx = w.x; ty = w.y; }
    }
    const move = cursorSpeed * STEP;
    if (threatD < 45 && threatD > 0) {
      cur.x -= ((tx - cur.x) / threatD) * move;
      cur.y -= ((ty - cur.y) / threatD) * move;
    } else if (best && bestD > 0) {
      const v = Math.min(bestD, move);
      cur.x += ((best.x - cur.x) / bestD) * v;
      cur.y += ((best.y - cur.y) / bestD) * v;
    }
    cur.x = Math.min(Math.max(cur.x, BOARD.x), BOARD.x + BOARD.w);
    cur.y = Math.min(Math.max(cur.y, BOARD.y), BOARD.y + BOARD.h);
    if (st.coins.length >= 3) triggerPulse(st);

    events.length = 0;
    step(st, STEP, cur, events);

    for (;;) {
      const options = UPGRADES.filter(u => canBuy(st, u)).sort((a, b) => nextCost(st, a) - nextCost(st, b));
      if (!options.length) break;
      buy(st, options[0]!);
      firstBuy ??= st.t;
    }
    if (maxedAt === null && UPGRADES.every(u => isMaxed(st, u))) maxedAt = st.t;
    for (const m of MILESTONES) if (!(m in milestones) && st.totalEarned >= m) milestones[m] = st.t;
  }
  return { st, milestones, firstBuy, maxedAt };
}
