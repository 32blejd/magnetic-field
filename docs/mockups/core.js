/* Shared game core for the neon mockup (browser) and the balance simulator (Node).
   Pure logic, no rendering. Units are mockup units (960×540 = half of 1920×1080). */
(function (root) {
  const W = 960, H = 540;
  const BOARD = { x: 16, y: 16, w: 700, h: 446 };
  const MAG_R = 10, COIN_R = 11.88, SPAWN_T = 0.25;

  /* ---------- tunables ---------- */
  const COMBO = { unlockAt: 5000, window: 1.5, step: 0.1, max: 2 }; // +10% per chained pickup, up to ×2
  const PULSE = { unlockAt: 2000, duration: 1, rangeMult: 3, cooldown: 25 };
  // pull 0.6 = a bit heavier than Prism (0.7); drifts at 0.2× and vanishes after 5 s (last 0.8 s fading);
  // telegraphed by a warning marker for `warn` seconds before it appears; Pulse doesn't extend the range for anti-coins.
  const ANTI = { unlockAt: 25000, chance: 0.005, stun: 1.5, pull: 0.6, speed: 0.2, life: 5, fade: 0.8, warn: 1.0 };
  const EVENTS = { first: 120, every: [120, 180],
                   burst: { duration: 6, spawnMult: 3, capMult: 2 },
                   fountain: { count: 14, banner: 2 } };

  /* Each upgrade: effect fx(level), cost = round(base * growth^level), capped at max level.
     Optional steep: { from, mult } – buying level from+1 and above costs an extra mult^(level - from + 1).
     unlock: null = available from the start, { earned: n } = after earning n this run, { gold: 1 } = after catching a Gold coin. */
  // Array order = panel order: Value, Range, Spawn rate (start), then Strength, Capacity, Rarity, Coin speed as they unlock.
  // Effects are written as a function of progress p = level / max, so the value at max stays fixed when a cap changes.
  const UPGRADES = [
    { id: 'value', name: 'Value', max: 30, base: 8, growth: 1.58, unlock: null,
      desc: 'Coins added to your wallet per coin collected.',
      fx: l => { const k = 20 * l / 30; return Math.round((1 + k) * 1.15 ** k); }, fmt: v => `${v} / coin` }, // 1 → 343
    { id: 'range', name: 'Range', max: 20, base: 4, growth: 1.71, unlock: null,
      desc: 'Radius of the magnetic field. Coins inside it get pulled toward the magnet.',
      fx: l => 30 + 5 * l, fmt: v => `${Math.round(v)} px` }, // 30 → 130
    { id: 'spawn', name: 'Spawn rate', max: 20, base: 4, growth: 1.71, unlock: null,
      desc: 'How many new coins appear on the board per second.',
      fx: l => 1.0 * 1.14 ** l, fmt: v => `${v.toFixed(2)} /s` }, // 1.00 → 13.74
    { id: 'strength', name: 'Strength', max: 15, base: 6, growth: 2.04, unlock: { earned: 30 },
      desc: 'How fast coins inside the field fly to the magnet. Higher = fewer coins slip away.',
      fx: l => 0.5 * 1.15 ** (20 * l / 15), fmt: v => `${v.toFixed(2)}×` }, // 0.50 → 8.18
    { id: 'capacity', name: 'Capacity', max: 15, base: 10, growth: 2.11, unlock: { earned: 150 },
      desc: 'Maximum number of coins on the board at once. New coins stop spawning at the limit.',
      fx: l => 8 + Math.round(40 * l / 15), fmt: v => `${v} coins` }, // 8 → 48
    { id: 'rarity', name: 'Rarity', max: 10, base: 50, growth: 2.2, steep: { from: 7, mult: 2 }, unlock: { earned: 1000 },
      desc: 'Raises the chance of rare coins: +0.5% for both Gold (×2) and Prism (×3) per level.',
      fx: l => 0.005 * l, fmt: v => `+${(v * 100).toFixed(1)}%` }, // added to each rare tier's chance; +0% → +5%
    { id: 'speed', name: 'Coin speed', max: 10, base: 15, growth: 2.94, unlock: { earned: 3000 },
      desc: 'Slows down drifting coins, giving you more time before they escape the board.',
      fx: l => (5 / 3 / 0.9 / 0.95) / 0.96 ** (15 * l / 10), fmt: v => `${v.toFixed(2)} s` }, // seconds for a basic coin to cross half the board height; 1.95 → 3.59
  ];
  const unlockHint = u => !u.unlock ? '' : u.unlock.earned ? `Earn ${u.unlock.earned.toLocaleString('en-US')} to unlock` : 'Catch a Gold coin to unlock';

  /* Coin tiers, rolled on spawn (rarest first). mult applies to both value and drift speed;
     pull scales how fast the magnet pulls the coin in (rare coins resist a bit). */
  const TIERS = [
    { id: 'prism', mult: 3, chance: 0.01, pull: 0.70 },
    { id: 'gold',  mult: 2, chance: 0.10, pull: 0.85 },
    { id: 'basic', mult: 1, chance: 1,    pull: 1 },
  ];
  const ANTI_TIER = { id: 'anti', mult: 1, pull: ANTI.pull };
  function rollTier(r, bonus = 0) {
    let x = r();
    for (const t of TIERS) {
      const ch = t.mult > 1 ? t.chance + bonus : t.chance;
      if (x < ch) return t; x -= ch;
    }
    return TIERS[TIERS.length - 1];
  }

  function rng(seed) {
    return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function createState(seed = 7) {
    const levels = {}, unlocked = {};
    for (const u of UPGRADES) { levels[u.id] = 0; unlocked[u.id] = !u.unlock; }
    return {
      r: rng(seed), t: 0, money: 0, totalEarned: 0, levels, unlocked, coins: [], spawnT: 0,
      combo: 0, comboT: 0, pulseT: 0, pulseCd: 0, stunT: 0, warns: [],
      event: null, nextEvent: EVENTS.first,
      stats: { caught: { basic: 0, gold: 0, prism: 0 }, missed: 0, anti: 0, bestCombo: 0 },
    };
  }

  function stats(st) {
    const o = {}; for (const u of UPGRADES) o[u.id] = u.fx(st.levels[u.id]);
    o.baseRange = o.range; // range without Pulse (used for anti-coins)
    if (st.pulseT > 0) o.range *= PULSE.rangeMult;
    if (st.event && st.event.type === 'burst') { o.spawn *= EVENTS.burst.spawnMult; o.capacity *= EVENTS.burst.capMult; }
    o.drift = (BOARD.h / 2) / o.speed; // px/s
    return o;
  }

  const costOf = (u, lv) => {
    const extra = u.steep && lv >= u.steep.from ? u.steep.mult ** (lv - u.steep.from + 1) : 1;
    return Math.round(u.base * u.growth ** lv * extra);
  };
  const isMaxed = (st, u) => st.levels[u.id] >= u.max;
  const canBuy = (st, u) => st.unlocked[u.id] && !isMaxed(st, u) && st.money >= costOf(u, st.levels[u.id]);
  function buy(st, u) {
    if (!canBuy(st, u)) return false;
    st.money -= costOf(u, st.levels[u.id]); st.levels[u.id]++; return true;
  }
  const comboMult = combo => Math.min(COMBO.max, 1 + COMBO.step * Math.max(0, combo - 1));
  const pulseUnlocked = st => st.totalEarned >= PULSE.unlockAt;
  const comboUnlocked = st => st.totalEarned >= COMBO.unlockAt;
  function triggerPulse(st) {
    if (!pulseUnlocked(st) || st.pulseCd > 0) return false;
    st.pulseT = PULSE.duration; st.pulseCd = PULSE.cooldown; return true;
  }
  const catchRate = st => {
    const c = st.stats.caught, n = c.basic + c.gold + c.prism;
    return n + st.stats.missed ? n / (n + st.stats.missed) : 0;
  };

  /* allowAnti: regular spawns may roll an anti-coin; it is first queued as a warning marker (st.warns)
     and appears ANTI.warn seconds later at the same spot. forceAnti spawns the anti-coin itself. */
  function spawnCoin(st, S, x, y, angle, allowAnti = false, forceAnti = false) {
    const B = BOARD, r = st.r;
    x = x ?? B.x + B.w * (0.15 + r() * 0.7); y = y ?? B.y + B.h * (0.15 + r() * 0.7);
    const a = angle ?? r() * Math.PI * 2;
    if (!forceAnti && allowAnti && st.totalEarned >= ANTI.unlockAt && r() < ANTI.chance) {
      st.warns.push({ x, y, a, t: ANTI.warn }); return;
    }
    const anti = forceAnti, tier = anti ? ANTI_TIER : rollTier(r, S.rarity);
    st.coins.push({ x, y, dx: Math.cos(a), dy: Math.sin(a), age: 0, ph: r() * 6,
                    tier: tier.id, mult: tier.mult, spd: anti ? ANTI.speed : tier.mult, pull: tier.pull, anti });
  }

  /* Advance the simulation. magnet = {x,y} or null (cursor off the board).
     cb (optional): { onPickup(coin, value), onAnti(coin), onMiss(coin), onEvent(type, x, y), onUnlock(upgrade) } */
  function step(st, dt, magnet, cb = {}) {
    const B = BOARD;
    st.t += dt; st.spawnT -= dt;

    // timers
    if (st.comboT > 0 && (st.comboT -= dt) <= 0) st.combo = 0;
    if (st.pulseT > 0) st.pulseT -= dt;
    if (st.pulseCd > 0) st.pulseCd -= dt;
    if (st.stunT > 0) st.stunT -= dt;
    if (st.event && (st.event.t -= dt) <= 0) st.event = null;

    // unlocks
    for (const u of UPGRADES) {
      if (st.unlocked[u.id]) continue;
      const ok = u.unlock.earned ? st.totalEarned >= u.unlock.earned : st.stats.caught.gold >= u.unlock.gold;
      if (ok) { st.unlocked[u.id] = true; cb.onUnlock && cb.onUnlock(u); }
    }

    const S = stats(st);

    // events
    if ((st.nextEvent -= dt) <= 0) {
      const ev = EVENTS, r = st.r;
      st.nextEvent = ev.every[0] + r() * (ev.every[1] - ev.every[0]);
      if (r() < 0.5) {
        st.event = { type: 'burst', t: ev.burst.duration, total: ev.burst.duration };
        cb.onEvent && cb.onEvent('burst');
      } else {
        const x = B.x + B.w * (0.3 + r() * 0.4), y = B.y + B.h * (0.3 + r() * 0.4), n = ev.fountain.count, a0 = r() * 6.28;
        for (let k = 0; k < n; k++) spawnCoin(st, S, x, y, a0 + k * Math.PI * 2 / n); // ignores capacity
        st.event = { type: 'fountain', t: ev.fountain.banner, total: ev.fountain.banner };
        cb.onEvent && cb.onEvent('fountain', x, y);
      }
    }

    // regular spawning (may queue an anti-coin warning instead)
    if (st.spawnT <= 0 && st.coins.length < S.capacity) { st.spawnT = 1 / S.spawn; spawnCoin(st, S, undefined, undefined, undefined, true); }

    // anti-coin warnings turn into anti-coins when their timer runs out
    for (let i = st.warns.length - 1; i >= 0; i--) {
      const w = st.warns[i];
      if ((w.t -= dt) <= 0) { st.warns.splice(i, 1); spawnCoin(st, S, w.x, w.y, w.a, false, true); }
    }

    const m = st.stunT > 0 ? null : magnet, touch = MAG_R + COIN_R * 0.6;
    for (let i = st.coins.length - 1; i >= 0; i--) {
      const c = st.coins[i]; c.age += dt;
      const sp = S.drift * c.spd;
      if (c.anti && c.age >= ANTI.life) { st.coins.splice(i, 1); continue; } // anti-coins expire on their own
      if (c.age < SPAWN_T) { // still appearing: already drifting, but can't be pulled or collected yet
        c.x += c.dx * sp * dt; c.y += c.dy * sp * dt;
      } else {
        let d = m ? Math.hypot(m.x - c.x, m.y - c.y) : Infinity;
        if (d > touch) { // move only if not already touching (also avoids 0/0 when d = 0)
          const R = c.anti ? S.baseRange : S.range; // Pulse doesn't pull anti-coins
          if (d < R) {
            const v = S.strength * c.pull * (45 + 130 * (1 - d / R)) * dt;
            c.x += (m.x - c.x) / d * Math.min(v, d); c.y += (m.y - c.y) / d * Math.min(v, d);
          } else { c.x += c.dx * sp * dt; c.y += c.dy * sp * dt; }
          d = m ? Math.hypot(m.x - c.x, m.y - c.y) : Infinity;
        }
        if (d <= touch) {
          st.coins.splice(i, 1);
          if (c.anti) { // short-circuit: magnet off, combo lost
            st.stunT = ANTI.stun; st.combo = 0; st.comboT = 0; st.stats.anti++;
            cb.onAnti && cb.onAnti(c);
          } else {
            if (comboUnlocked(st)) { st.combo++; st.comboT = COMBO.window; st.stats.bestCombo = Math.max(st.stats.bestCombo, st.combo); }
            const v = S.value * c.mult * comboMult(st.combo);
            st.money += v; st.totalEarned += v; st.stats.caught[c.tier]++;
            cb.onPickup && cb.onPickup(c, v);
          }
          continue;
        }
      }
      if (c.x < B.x - COIN_R || c.x > B.x + B.w + COIN_R || c.y < B.y - COIN_R || c.y > B.y + B.h + COIN_R) {
        st.coins.splice(i, 1);
        if (!c.anti) { st.stats.missed++; cb.onMiss && cb.onMiss(c); }
      }
    }
  }

  const Core = { W, H, BOARD, MAG_R, COIN_R, SPAWN_T, COMBO, PULSE, ANTI, EVENTS, UPGRADES, TIERS,
                 createState, stats, costOf, isMaxed, canBuy, buy, step, comboMult, triggerPulse, pulseUnlocked,
                 comboUnlocked, catchRate, unlockHint };
  root.Core = Core;
  if (typeof module !== 'undefined') module.exports = Core;
})(typeof window !== 'undefined' ? window : globalThis);
