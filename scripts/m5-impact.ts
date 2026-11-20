/* M5 node impact: plays the same late run (the state after N bot shifts) with and without each M5 node, and an idle run
   (no cursor at all – only Drones and the Auto-buyer play). Usage: npm run sim:m5 -- [shifts=9] [seeds=3] */
import { NODE_BY_ID } from '../src/data/prestige';
import { STEP } from '../src/data/tuning';
import { shiftGoal } from '../src/game/prestige';
import { step } from '../src/game/simulation';
import type { GameState } from '../src/game/types';
import { formatTime } from '../src/ui/format';
import { botShift, runBot } from './bot';

const shifts = Number(process.argv[2] ?? 9);
const seeds = Number(process.argv[3] ?? 3);
const SPEED = 400;
const LIMIT = 3600;

/** The state right after `shifts` bot shifts (fresh run, Core tree as the greedy bot bought it). */
function lateState(seed: number): GameState {
  const st = runBot(seed, SPEED).st;
  for (let k = 0; k < shifts; k++) { botShift(st); if (k < shifts - 1) runBot(seed, SPEED, undefined, LIMIT, st); }
  return st;
}
const bases = Array.from({ length: seeds }, (_, i) => lateState(i + 1));
const clone = (st: GameState): GameState => structuredClone(st);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function withNodes(st: GameState, nodes: Record<string, number>): GameState {
  const c = clone(st);
  for (const [id, lv] of Object.entries(nodes)) c.meta.nodes[id] = Math.min(NODE_BY_ID[id]!.max, lv);
  return c;
}

const variants: [string, Record<string, number>][] = [
  ['none (greedy tree)', {}],
  ['Satellites 1', { Nkey: 1 }], ['Satellites 3', { Nkey: 3 }],
  ['Chain Reaction', { Eb4: 1 }], ['Void Coin', { Ekey: 1 }],
  ['Interest', { Skey: 1 }],
  ['Drones 1', { Wkey: 1 }], ['Drones 3', { Wkey: 3 }],
  ['all M5 nodes', { Nkey: 3, Eb4: 1, Ekey: 1, Skey: 1, Wb2: 1, Wb4: 1, Wkey: 3 }],
];

console.log(`run ${shifts + 1} (goal ${(shiftGoal(bases[0]!.meta) / 1e6).toFixed(2)}M), cursor ${SPEED} px/s, ${seeds} seeds`);
let baseT = 0;
for (const [name, nodes] of variants) {
  const t = avg(bases.map((b, i) => runBot(i + 1, SPEED, undefined, LIMIT, withNodes(b, nodes)).st.t));
  if (!baseT) baseT = t;
  console.log(`${name.padEnd(20)} ${formatTime(t).padStart(6)}  (${((t / baseT - 1) * 100).toFixed(0).padStart(4)}%)`);
}

// idle: nobody touches the mouse; Auto-buyer + Drones do everything
for (const lv of [1, 2, 3]) {
  const rates = bases.map(b => {
    const st = withNodes(b, { Wb2: 1, Wkey: lv });
    for (let k = 0; k < 600 / STEP; k++) step(st, STEP, null);
    return st.totalEarned / 600;
  });
  const active = bases.map((b, i) => { const st = runBot(i + 1, SPEED, undefined, 600, withNodes(b, { Wb2: 1 })); return st.st.totalEarned / st.st.t; });
  console.log(`idle, Drones ${lv} + Auto-buyer: ${Math.round(avg(rates)).toLocaleString('en-US')} /s over 10 min` +
    ` (active bot without drones: ${Math.round(avg(active)).toLocaleString('en-US')} /s)`);
}
