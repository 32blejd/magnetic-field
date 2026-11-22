/* Core tree screen: node positions (compass layout), camera, view state and button rects. */
import { NODES, type Branch, type Cardinal, type NodeDef } from '../data/prestige';
import { VIEW } from '../data/tuning';
import type { Draft } from '../game/prestige';
import type { Vec } from '../game/types';
import type { Rect } from './layout';

/** Compass index of every branch (0 = N, clockwise in 22.5° steps). */
const DIR_INDEX: Readonly<Record<Branch, number>> = {
  N: 0, NNE: 1, NE: 2, ENE: 3, E: 4, ESE: 5, SE: 6, SSE: 7, S: 8, SSW: 9, SW: 10, WSW: 11, W: 12, WNW: 13, NW: 14, NNW: 15,
};
/** Unit vectors of a branch: [along the branch, sideways]. N is up, like a real compass. */
function axes(b: Branch): [Vec, Vec] {
  const a = (DIR_INDEX[b] * Math.PI) / 8 - Math.PI / 2, round = (x: number) => Math.round(x * 1e9) / 1e9;
  return [{ x: round(Math.cos(a)), y: round(Math.sin(a)) }, { x: round(-Math.sin(a)), y: round(Math.cos(a)) }];
}
export const AXES: Readonly<Record<Cardinal, [Vec, Vec]>> = { N: axes('N'), E: axes('E'), S: axes('S'), W: axes('W') };
/** [distance from the centre, sideways offset] of each slot. Hybrids (stage 2) sit between the cardinal branches,
    spokes (stage 3) past the keystones of their two neighbours, Break the Compass above N. */
const CARDINAL_POS: Record<string, [number, number]> = {
  b1: [115, 0], b2: [205, -65], b3: [205, 65], b4: [300, -115], b5: [300, 0], b6: [300, 115], key: [415, 0],
};
const HYBRID_POS: Record<string, [number, number]> = { b1: [150, 0], b2: [240, -30], b3: [240, 30], key: [335, 0] };
const SPOKE_POS: Record<string, [number, number]> = { b1: [470, 0], key: [560, 0] };
const FINAL_DIST = 650;
/** The view is wide, so the vertical part of every distance is squeezed. */
export const VERTICAL_SQUEEZE = 0.72;

function place(b: Branch, dist: number, side: number): Vec {
  const [u, v] = axes(b);
  return { x: u.x * dist + v.x * side, y: u.y * dist * VERTICAL_SQUEEZE + v.y * side };
}
export const branchPoint = (b: Branch, dist: number): Vec => place(b, dist, 0);

const POS: Record<string, Vec> = Object.fromEntries(NODES.map(n => {
  if (n.branch === 'core') return [n.id, { x: 0, y: 0 }];
  if (n.branch === 'final') return [n.id, branchPoint('N', FINAL_DIST)];
  const table = n.stage === 1 ? CARDINAL_POS : n.stage === 2 ? HYBRID_POS : SPOKE_POS;
  const [d, side] = table[n.slot]!;
  return [n.id, place(n.branch, d, side)];
}));
export const nodePos = (def: NodeDef): Vec => POS[def.id]!;
export const nodeRadius = (def: NodeDef): number => (def.slot === 'final' ? 32 : def.slot === 'key' || def.id === 'core' ? 25 : 17);

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

/** Starting zoom and vertical centre per open stage, so the whole open part of the rose fits on screen. */
const START_CAM: Record<1 | 2 | 3 | 4, { y: number; z: number }> = { 1: { y: 0, z: 0.8 }, 2: { y: 0, z: 0.7 }, 3: { y: 0, z: 0.5 }, 4: { y: -90, z: 0.46 } };

export const newTreeView = (mode: TreeMode, draft: Draft | null, stage: 1 | 2 | 3 | 4 = 1): TreeView => ({
  mode, cam: { x: 0, y: START_CAM[stage].y, z: START_CAM[stage].z }, draft, hover: null, drag: null, flashes: [],
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
