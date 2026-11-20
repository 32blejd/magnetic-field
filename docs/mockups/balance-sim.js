/* Balance simulator: a bot plays the mockup core and greedily buys the cheapest affordable upgrade.
   Usage: node docs/mockups/balance-sim.js [cursorSpeed=400] [seeds=5]
   cursorSpeed is in mockup px/s (×2 for real 1080p px/s). ~400 ≈ an active, attentive player. */
const Core = require('./core.js');
// optional: OV='{"value":{"growth":1.9}}' overrides upgrade fields for quick tuning
if (process.env.OV) { const ov = JSON.parse(process.env.OV); for (const u of Core.UPGRADES) Object.assign(u, ov[u.id] || {}); }
const cursorSpeed = Number(process.argv[2] || 400);
const seeds = Number(process.argv[3] || 5);
const DT = 1 / 60, LIMIT = 3 * 3600, GOAL = 1e6;
const MILESTONES = [100, 1e3, 1e4, 1e5, 1e6];
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function run(seed) {
  const st = Core.createState(seed);
  const B = Core.BOARD, cur = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
  const hit = {}; let firstBuy = null, maxedAt = null;
  while (st.t < LIMIT && st.totalEarned < GOAL) {
    // bot: dodge a nearby anti-coin, otherwise move toward the nearest good coin; pulse when 3+ coins are around
    let best = null, bd = Infinity, threat = null, td = Infinity;
    for (const c of st.coins) {
      const d = Math.hypot(c.x - cur.x, c.y - cur.y);
      if (c.anti) { if (d < td) { td = d; threat = c; } } else if (d < bd) { bd = d; best = c; }
    }
    const step = cursorSpeed * DT;
    if (threat && td < 45 && td > 0) { cur.x -= (threat.x - cur.x) / td * step; cur.y -= (threat.y - cur.y) / td * step; }
    else if (best && bd > 0) { const v = Math.min(bd, step); cur.x += (best.x - cur.x) / bd * v; cur.y += (best.y - cur.y) / bd * v; }
    cur.x = Math.min(Math.max(cur.x, B.x), B.x + B.w); cur.y = Math.min(Math.max(cur.y, B.y), B.y + B.h);
    if (st.coins.length >= 3) Core.triggerPulse(st);
    Core.step(st, DT, cur);
    // greedy shopper: buy cheapest affordable upgrade (but never spend the last stretch to 1M once all are maxed)
    for (;;) {
      const opts = Core.UPGRADES.filter(u => Core.canBuy(st, u)).sort((a, b) => Core.costOf(a, st.levels[a.id]) - Core.costOf(b, st.levels[b.id]));
      if (!opts.length) break;
      Core.buy(st, opts[0]); if (firstBuy === null) firstBuy = st.t;
    }
    if (maxedAt === null && Core.UPGRADES.every(u => Core.isMaxed(st, u))) maxedAt = st.t;
    for (const m of MILESTONES) if (!(m in hit) && st.totalEarned >= m) hit[m] = st.t;
  }
  return { st, hit, firstBuy, maxedAt };
}

const results = [];
for (let s = 1; s <= seeds; s++) results.push(run(s));
const avg = f => results.reduce((a, r) => a + f(r), 0) / results.length;

console.log(`cursor ${cursorSpeed} px/s (mockup), ${seeds} runs`);
console.log(`first upgrade: ${mmss(avg(r => r.firstBuy ?? LIMIT))}`);
for (const m of MILESTONES) console.log(`${String(m.toLocaleString('en-US')).padStart(9)} earned: ${mmss(avg(r => r.hit[m] ?? LIMIT))}`);
console.log(`all maxed: ${results.every(r => r.maxedAt) ? mmss(avg(r => r.maxedAt)) : 'not in time'}`);
console.log(`catch rate: ${(avg(r => Core.catchRate(r.st)) * 100).toFixed(0)}% · best combo: ${Math.round(avg(r => r.st.stats.bestCombo))} · anti hits: ${Math.round(avg(r => r.st.stats.anti))}`);
console.log('levels at 1M:', Object.entries(results[0].st.levels).map(([k, v]) => `${k} ${v}`).join(', '));
const total = Core.UPGRADES.reduce((a, u) => { let s = 0; for (let l = 0; l < u.max; l++) s += Core.costOf(u, l); return a + s; }, 0);
console.log(`cost to max everything: ${Math.round(total).toLocaleString('en-US')}`);
