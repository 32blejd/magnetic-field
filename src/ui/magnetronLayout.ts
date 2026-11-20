/* Magnetron (gacha) screen layout and view state. */
import { ELEMENTS, RARITIES, type Element, type Rarity } from '../data/lodestones';
import { VIEW } from '../data/tuning';
import type { PullResult } from '../game/lodestones';
import type { Rect } from './layout';

export interface MagnetronView {
  /** Results of the last pull, shown in a reveal dialog until dismissed. */
  results: PullResult[] | null;
  /** Seconds since the reveal started (cards flip in one by one). */
  revealT: number;
  hover: { element: Element; rarity: Rarity } | null;
}
export const newMagnetronView = (): MagnetronView => ({ results: null, revealT: 0, hover: null });

export const MAG_TOP_BAR_H = 44;
export const MACHINE = { cx: 200, cy: 210, r: 110 };
export const PULL1: Rect = { x: 40, y: 350, w: 150, h: 36 };
export const PULL10: Rect = { x: 210, y: 350, w: 150, h: 36 };
export const MAG_BACK: Rect = { x: VIEW.w - 216, y: VIEW.h - 50, w: 200, h: 34 };

/** Collection grid: rows = elements, columns = rarities. */
export const GRID = { x: 520, y: 92, cellW: 100, cellH: 78, gap: 8, labelX: 420 };
export function cellRect(element: Element, rarity: Rarity): Rect {
  const r = ELEMENTS.indexOf(element), c = RARITIES.indexOf(rarity);
  return { x: GRID.x + c * (GRID.cellW + GRID.gap), y: GRID.y + r * (GRID.cellH + GRID.gap), w: GRID.cellW, h: GRID.cellH };
}

/** Reveal dialog: up to 10 cards in two rows of five. */
export const REVEAL: Rect = { x: 130, y: 110, w: 700, h: 320 };
export function revealCard(i: number, count: number): Rect {
  const w = 120, h = 120, gap = 14;
  if (count === 1) return { x: REVEAL.x + (REVEAL.w - 160) / 2, y: REVEAL.y + 80, w: 160, h: 170 };
  const row = Math.floor(i / 5), col = i % 5, total = 5 * w + 4 * gap;
  return { x: REVEAL.x + (REVEAL.w - total) / 2 + col * (w + gap), y: REVEAL.y + 60 + row * (h + gap), w, h };
}
/** Seconds between card flips. */
export const REVEAL_STEP = 0.12;
