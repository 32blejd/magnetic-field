import { BOARD } from '../data/tuning';
import { UPGRADE_BY_ID, UPGRADES, type UpgradeDef } from '../data/upgrades';
import type { GameState, Vec } from '../game/types';

export interface Rect { x: number; y: number; w: number; h: number }

export const inRect = (p: Vec, r: Rect): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Prestige bar – under the board only. */
export const PRESTIGE_BAR: Rect = { x: 16, y: 472, w: 700, h: 52 };
/** Right-hand button of the prestige bar: Core tree preview, or Shift Polarity once 1M is earned. */
export const PRESTIGE_BUTTON: Rect = { x: PRESTIGE_BAR.x + PRESTIGE_BAR.w - 186, y: PRESTIGE_BAR.y + 12, w: 170, h: 28 };
/** Upgrade panel – right side, full height. */
export const PANEL: Rect = { x: 732, y: 16, w: 212, h: 508 };
/** Magnetron button – panel header, right of the UPGRADES label (after the first shift). */
export const MAGNETRON_BUTTON: Rect = { x: PANEL.x + PANEL.w - 96, y: PANEL.y + 71, w: 84, h: 22 };
/** Pulse widget – bottom-left corner of the board. */
export const PULSE_WIDGET: Rect = { x: BOARD.x + 12, y: BOARD.y + BOARD.h - 34, w: 150, h: 22 };
/** Goal tracker – bottom-right corner of the board (anchored at its bottom-right). */
export const GOALS_ANCHOR: Vec = { x: BOARD.x + BOARD.w - 12, y: BOARD.y + BOARD.h - 12 };

/** Seven rows fit exactly. */
export const rowRect = (i: number): Rect => ({ x: PANEL.x + 10, y: PANEL.y + 96 + i * 58, w: PANEL.w - 20, h: 54 });
export function buttonRect(i: number): Rect {
  const r = rowRect(i), w = 62, h = 26;
  return { x: r.x + r.w - 10 - w, y: r.y + (r.h - h) / 2, w, h };
}

export interface PanelRow { def: UpgradeDef; locked: boolean }

/** Unlocked upgrades in unlock order, then only the next locked one (lowest unlock threshold) as a teaser. */
export function visibleRows(st: GameState): PanelRow[] {
  const rows: PanelRow[] = st.unlockOrder.map(id => ({ def: UPGRADE_BY_ID[id], locked: false }));
  const next = UPGRADES.filter(u => !st.unlocked[u.id]).sort((a, b) => a.unlockAt - b.unlockAt)[0]; // same order with Fast Track
  if (next) rows.push({ def: next, locked: true });
  return rows;
}

export const rowAt = (st: GameState, p: Vec): number => visibleRows(st).findIndex((_, i) => inRect(p, rowRect(i)));
