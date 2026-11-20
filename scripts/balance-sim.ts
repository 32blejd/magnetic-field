/* Balance simulator. Usage: npm run sim -- [cursorSpeed=400] [runs=3] [shifts=0]
   shifts > 0: after the first run the bot shifts polarity (spending Cores on the cheapest nodes) and plays more runs.
   Quick tuning without editing files: OV='{"value":{"growth":1.6}}' npm run sim */
import { PRESTIGE } from '../src/data/prestige';
import { UPGRADES } from '../src/data/upgrades';
import { catchRate } from '../src/game/abilities';
import { costOf } from '../src/game/money';
import { formatTime } from '../src/ui/format';
import { shiftGoal } from '../src/game/prestige';
import { MILESTONES, botShift, runBot } from './bot';

if (process.env.OV) {
  const ov = JSON.parse(process.env.OV) as Record<string, Partial<{ base: number; growth: number; max: number }>>;
  for (const u of UPGRADES) Object.assign(u, ov[u.id] ?? {});
}

if (process.env.GOAL_STEP) PRESTIGE.goalStep = Number(process.env.GOAL_STEP);

const speed = Number(process.argv[2] ?? 400);
const runs = Number(process.argv[3] ?? 3);
const shifts = Number(process.argv[4] ?? 0);
const results = Array.from({ length: runs }, (_, i) => runBot(i + 1, speed));
const avg = <T>(xs: T[], f: (r: T) => number) => xs.reduce((a, r) => a + f(r), 0) / xs.length;
const LIMIT = 3 * 3600;

console.log(`cursor ${speed} px/s, ${runs} runs`);
console.log(`first upgrade: ${formatTime(avg(results, r => r.firstBuy ?? LIMIT))}`);
for (const m of MILESTONES) console.log(`${m.toLocaleString('en-US').padStart(9)} earned: ${formatTime(avg(results, r => r.milestones[m] ?? LIMIT))}`);
console.log(`catch rate: ${(avg(results, r => catchRate(r.st)) * 100).toFixed(0)}% · best combo: ${Math.round(avg(results, r => r.st.stats.bestCombo))} · anti hits: ${Math.round(avg(results, r => r.st.stats.anti))}`);
console.log('levels at goal:', Object.entries(results[0]!.st.levels).map(([k, v]) => `${k} ${v}`).join(', '));
const total = UPGRADES.reduce((a, u) => { let s = 0; for (let l = 0; l < u.max; l++) s += costOf(u, l); return a + s; }, 0);
console.log(`cost to max everything: ${Math.round(total).toLocaleString('en-US')}`);

for (let k = 1; k <= shifts; k++) { // later runs with the Core tree
  const next = results.map((r, i) => {
    botShift(r.st);
    const nodes = Object.entries(r.st.meta.nodes).map(([id, lv]) => `${id}:${lv}`).join(' ');
    return { run: runBot(i + 1, speed, undefined, LIMIT, r.st), nodes, cores: r.st.meta.coresEarned, goal: shiftGoal(r.st.meta) };
  });
  const goal = next[0]!.goal;
  console.log(`run ${k + 1}: goal ${(goal / 1e6).toFixed(2)}M reached in ${formatTime(avg(next, n => n.run.st.t))}` +
    ` · ${Math.round(avg(next, n => n.cores))} Cores earned so far · tree (seed 1): ${next[0]!.nodes}`);
  next.forEach((n, i) => { results[i] = n.run; });
}
