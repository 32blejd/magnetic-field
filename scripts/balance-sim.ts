/* Balance simulator. Usage: npm run sim -- [cursorSpeed=400] [runs=3]
   Quick tuning without editing files: OV='{"value":{"growth":1.6}}' npm run sim */
import { UPGRADES } from '../src/data/upgrades';
import { catchRate } from '../src/game/abilities';
import { costOf } from '../src/game/money';
import { formatTime } from '../src/ui/format';
import { MILESTONES, runBot } from './bot';

if (process.env.OV) {
  const ov = JSON.parse(process.env.OV) as Record<string, Partial<{ base: number; growth: number; max: number }>>;
  for (const u of UPGRADES) Object.assign(u, ov[u.id] ?? {});
}

const speed = Number(process.argv[2] ?? 400);
const runs = Number(process.argv[3] ?? 3);
const results = Array.from({ length: runs }, (_, i) => runBot(i + 1, speed));
const avg = (f: (r: (typeof results)[number]) => number) => results.reduce((a, r) => a + f(r), 0) / results.length;
const LIMIT = 3 * 3600;

console.log(`cursor ${speed} px/s, ${runs} runs`);
console.log(`first upgrade: ${formatTime(avg(r => r.firstBuy ?? LIMIT))}`);
for (const m of MILESTONES) console.log(`${m.toLocaleString('en-US').padStart(9)} earned: ${formatTime(avg(r => r.milestones[m] ?? LIMIT))}`);
console.log(`catch rate: ${(avg(r => catchRate(r.st)) * 100).toFixed(0)}% · best combo: ${Math.round(avg(r => r.st.stats.bestCombo))} · anti hits: ${Math.round(avg(r => r.st.stats.anti))}`);
console.log('levels at goal:', Object.entries(results[0]!.st.levels).map(([k, v]) => `${k} ${v}`).join(', '));
const total = UPGRADES.reduce((a, u) => { let s = 0; for (let l = 0; l < u.max; l++) s += costOf(u, l); return a + s; }, 0);
console.log(`cost to max everything: ${Math.round(total).toLocaleString('en-US')}`);
