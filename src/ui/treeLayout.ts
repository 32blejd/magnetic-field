/* Core tree screen: node positions (compass layout), camera, view state and button rects. */
import { NODES, type Branch, type NodeDef } from '../data/prestige';
import { VIEW } from '../data/tuning';
import type { Draft } from '../game/prestige';
import type { Vec } from '../game/types';
import type { Rect } from './layout';

/** Unit vectors per branch: [along the branch, sideways]. N is up, like a real compass. */
export const AXES: Readonly<Record<Branch, [Vec, Vec]>> = {
  N: [{ x: 0, y: -1 }, { x: 1, y: 0 }],
  E: [{ x: 1, y: 0 }, { x: 0, y: 1 }],
  S: [{ x: 0, y: 1 }, { x: -1, y: 0 }],
  W: [{ x: -1, y: 0 }, { x: 0, y: -1 }],
};
/** [distance from the centre, sideways offset] of each slot. */
const SLOT_POS: Record<string, [number, number]> = {
  b1: [115, 0], b2: [205, -65], b3: [205, 65], b4: [300, -115], b5: [300, 0], b6: [300, 115], key: [415, 0],
};
/** The view is wide, so N/S branches are a bit shorter than E/W. */
export const VERTICAL_SQUEEZE = 0.72;

export function branchPoint(b: Branch, dist: number): Vec {
  const [u] = AXES[b], s = u.y ? VERTICAL_SQUEEZE : 1;
  return { x: u.x * dist * s, y: u.y * dist * s };
}

const POS: Record<string, Vec> = Object.fromEntries(NODES.map(n => {
  if (n.branch === 'core') return [n.id, { x: 0, y: 0 }];
  const [u, v] = AXES[n.branch], [d0, side] = SLOT_POS[n.slot]!, d = u.y ? d0 * VERTICAL_SQUEEZE : d0;
  return [n.id, { x: u.x * d + v.x * side, y: u.y * d + v.y * side }];
}));
export const nodePos = (def: NodeDef): Vec => POS[def.id]!;
export const nodeRadius = (def: NodeDef): number => (def.slot === 'key' || def.id === 'core' ? 25 : 17);

export type TreeMode = 'browse' | 'shift';

export interface TreeView {
  mode: TreeMode;
  cam: { x: number; y: number; z: number };
  /** Tentative purchases (shift mode only). */
  draft: Draft | null;
  hover: NodeDef | null;
  drag: { start: Vec; cam: { x: number; y: number }; moved: boolean } | null;
  flashes: { id: string; life: number }[];
}

export const newTreeView = (mode: TreeMode, draft: Draft | null): TreeView => ({
  mode, cam: { x: 0, y: 0, z: 0.8 }, draft, hover: null, drag: null, flashes: [],
});

export const TOP_BAR_H = 44;
export const toScreen = (view: TreeView, p: Vec): Vec =>
  ({ x: VIEW.w / 2 + (p.x - view.cam.x) * view.cam.z, y: VIEW.h / 2 + (p.y - view.cam.y) * view.cam.z });
export const toWorld = (view: TreeView, p: Vec): Vec =>
  ({ x: (p.x - VIEW.w / 2) / view.cam.z + view.cam.x, y: (p.y - VIEW.h / 2) / view.cam.z + view.cam.y });

export function zoomAt(view: TreeView, p: Vec, factor: number): void {
  const before = toWorld(view, p);
  view.cam.z = Math.min(1.8, Math.max(0.45, view.cam.z * factor));
  const after = toWorld(view, p);
  view.cam.x += before.x - after.x;
  view.cam.y += before.y - after.y;
}

/* bottom-right buttons */
const BTN = (x: number, w: number): Rect => ({ x: VIEW.w - x, y: VIEW.h - 50, w, h: 34 });
export const TREE_BUTTONS = {
  primary: BTN(216, 200), // SHIFT & START RUN / BACK TO RUN
  undo: BTN(316, 92),
  reset: BTN(436, 112),
  notYet: BTN(556, 112),
} as const;

/* confirm dialog */
export const CONFIRM: Rect = { x: 250, y: 100, w: 460, h: 330 };
export const CONFIRM_OK: Rect = { x: CONFIRM.x + 30, y: CONFIRM.y + CONFIRM.h - 58, w: 190, h: 34 };
export const CONFIRM_BACK: Rect = { x: CONFIRM.x + CONFIRM.w - 220, y: CONFIRM.y + CONFIRM.h - 58, w: 190, h: 34 };
