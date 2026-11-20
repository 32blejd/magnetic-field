# Magnetic Field – Design Outline

## One-line pitch

Coins appear on the board, the player steers a cursor magnet that pulls them in and collects them, and spends the coins on upgrades to the magnet mechanic itself.

## Core loop

1. Coins spawn at random spots on the board with a short **spawn animation**, then **drift away in a random direction at a constant speed** until they leave the board through any edge. A coin that leaves the board is lost.
2. The cursor *is* the magnet. Coins within **range** are pulled toward it with a given **strength**.
3. A coin that touches the magnet is collected and adds its **value** (× combo) to the wallet.
4. The player spends coins on upgrades → collects faster / more → buys more upgrades.

The challenge: catch coins before they escape the board, keep the combo going, and dodge anti-coins.

The target feeling: every upgrade is **visible on screen** (bigger field, more coins, more magnets), and by the late game the board turns into a vacuum cleaner sweeping up everything.

### Movement (placeholders, to be tuned)

- **Coin size:** radius 11.88 px (logical units of the 960×540 view, ×2 on 1080p) – enlarged twice (+20%, then +10%) so the game is less precise and easier to read.
- **Drift speed:** a basic coin covers half the board height in **1.95 s** (speed = board height / 2 / 1.95 s).
- **Coin tiers** (rolled on spawn):

  | Tier | Chance | Value | Drift speed | Pull resistance | Look |
  |---|---|---|---|---|---|
  | Basic | 89% | ×1 | ×1 | none (pull ×1) | cyan hexagon |
  | Gold | 10% | ×2 | ×2 | pull ×0.85 | larger amber double hexagon, pulsing, short trail, shockwave on pickup |
  | Prism | 1% | ×3 | ×3 | pull ×0.70 | largest, hue-cycling rainbow, orbiting sparks, trail, big shockwave on pickup |
  | Anti | 0.5% (after 25,000 earned) | – | ×0.2 | pull ×0.60 (a bit heavier than Prism); **not affected by Pulse** | red spiky star with an ×; 1 s warning marker before it appears; vanishes after 5 s; see below |

  Pickup text shows just the amount (e.g. `+2`) in the tier's color; no multiplier tag.
- **Pull speed:** coins inside the range move toward the magnet at `strength × tierPull × (45 + 130 × (1 − distance / range))` px/s (logical units), i.e. faster the closer they are.
- **Spawn animation:** 0.25 s pop-in (scale up with a slight overshoot + a subtle expanding ring at ~70% brightness). The coin drifts from the very first frame, but can't be pulled or collected until the animation ends – so camping the cursor on a spawn point doesn't work.
- **Magnet activity:** the magnet exists only while the cursor is over the board. Moving the cursor to the upgrade panel or prestige bar turns it off (normal cursor there, so the player can click).
- Spawn positions: random, away from the edges, so every coin has a fair chance to be caught.

### Main-loop mechanics

- **Combo** (unlocks at 5,000 earned) – each pickup within **1.5 s** of the previous one adds +10% to a multiplier (×1.0 → ×2.0 max at combo 11). Shown next to the magnet (`×1.4`, `COMBO 5`) with a timer arc around it; turns amber at max. Missing the window or hitting an anti-coin resets it.
- **Progressive unlocks** – the run starts with 3 upgrades, in this panel order: Value [1], Range [2], Spawn rate [3]; then Strength [4] and Capacity [5] follow as they unlock. The panel lists unlocked upgrades in the order they were unlocked, followed by **only the next locked upgrade** (lowest "earn N" threshold) as a dimmed teaser with its hint; everything else stays hidden. A banner announces each unlock:

  | Upgrade / feature | Unlocks at (earned this run) |
  |---|---|
  | Strength | 30 |
  | Capacity | 150 |
  | Rarity | 1,000 |
  | Pulse | 2,000 |
  | Coin speed | 3,000 |
  | Combo | 5,000 |
  | Anti-coins appear | 25,000 (warning banner) |

- **Events** – first at 2:00, then every 2–3 min, 50/50:
  - **Coin Burst** – 6 s of ×3 spawn rate and ×2 capacity; grid and board frame turn amber.
  - **Fountain** – 14 coins burst out of one point in a ring (ignores capacity).
- **Pulse** (active ability) – SPACE or right click: ×3 range for 1 s, 25 s cooldown. Widget in the bottom-left of the board shows ready / cooldown / locked hint.
- **Anti-coins** – touching one short-circuits the magnet: it turns off for **1.5 s** (flickering red, `OFFLINE` countdown) and the combo resets. The board shakes. Every anti-coin is **telegraphed for 1 s** before it appears: a red crosshair at the spawn point with two rings closing in, a growing red glow and a blinking `!` that speeds up. Pulse's extra range doesn't apply to them. They drift very slowly (×0.2), are only weakly pulled, and **disappear on their own after 5 s** (fading and shrinking over the last 0.8 s; still dangerous until gone), so they act as temporary obstacles a careful player steers around.
- **Run stats** – top-left of the board: run time, catch %, missed coins, best combo.
- **Mini-goals** – in-run goals; completing one shows a `GOAL COMPLETE` banner. The tracker in the bottom-right of the board shows the next unfinished goal per category with progress (anti goals appear once anti-coins are unlocked). No rewards yet.

  | Category | Targets |
  |---|---|
  | Coins (any non-anti coin) | 10 · 100 · 1,000 · 10,000 |
  | Anti-coins | 1 |
  | Gold coins | 10 · 50 · 100 |
  | Prism coins | 3 · 7 · 11 · 49 |

## Visual style

**Neon / sci-fi**: dark navy board with a faint cyan grid, glowing cyan hexagon coins, a magenta magnet with a pulsing field ring, cyan-outlined panels, monospace font. Edges glow red as the "escape" line. Implemented in `src/render/`.

## Layout

- Board ≈ 73% of the screen width on the left (≈ 1400 px wide on 1920×1080).
- Below the board only: a **prestige bar** (≈ 100 px tall on 1080p), reserved for Polarity Shift progress.
- Upgrade panel on the right, full height. Exactly 7 rows fit.
- **Keyboard:** keys 1–7 (top row or numpad) buy the upgrade in that panel row, so the player can keep the cursor on the board. Each row shows its key next to the level (`Lv 3/20  [2]`).

## Hosting

Local only for now (`npm run dev` / `npm run preview`).

## Upgrades

### Core (the magnet mechanic) – 7 upgrades, the panel fits exactly 7 rows

What each stat does:

- **Range** – radius of the magnetic field around the cursor. Coins inside it stop drifting and get pulled in.
- **Strength** – multiplier on how fast coins inside the field fly to the magnet. Low strength = coins at the edge of the field crawl in slowly.
- **Value** – coins added to the wallet per collected coin. The main income multiplier.
- **Spawn rate** – new coins per second.
- **Capacity** – max coins on the board at once; spawning pauses at the limit.
- **Coin speed** – slows drifting coins (shown as seconds a basic coin needs to cross half the board height), so more of them can be caught.
- **Rarity** – +0.5 percentage points per level to both Gold and Prism spawn chances (10 levels; the last 3 are much pricier).

| Upgrade | Effect formula (level `l`) | Lv 0 | Max level | At max | Base cost | Cost growth | Unlock |
|---|---|---|---|---|---|---|---|
| Value | `round((1 + k) × 1.15^k)`, `k = 20l/30` | 1 | 30 | 344 | 8 | ×1.58 | start |
| Range | `30 + 5l` px | 30 px | 20 | 130 px | 4 | ×1.71 | start |
| Spawn rate | `1.0 × 1.14^l` /s | 1.00/s | 20 | 13.74/s | 4 | ×1.71 | start |
| Strength | `0.5 × 1.15^(20l/15)` | 0.50× | 15 | 8.18× | 6 | ×2.04 | 30 earned |
| Capacity | `8 + round(40l/15)` coins | 8 | 15 | 48 | 10 | ×2.11 | 150 earned |
| Rarity | `+0.5% × l` to each rare tier | +0% | 10 | Gold 15% · Prism 6% | 50 | ×2.2, plus ×2 per level for Lv 8–10 | 1,000 earned |
| Coin speed | `1.95 / 0.96^(15l/10)` s | 1.95 s | 10 | 3.60 s | 15 | ×2.94 | 3,000 earned |

Caps were changed (Value 20 → 30, Strength/Capacity 20 → 15, Coin speed 15 → 10) while keeping the value at max the same: effects are written in terms of progress `level / max`, and cost growth was rescaled so the total cost of each upgrade stays similar.

Rarity level costs: 50 · 110 · 242 · 532 · 1,171 · 2,577 · 5,669 · **24,944 · 109,752 · 482,908** (levels 8–10 get an extra ×2, ×4, ×8).

At max Strength a basic coin is pulled at ~370 px/s at the edge of the field and ~1,400 px/s near the magnet, so at max Range it flies in within ~0.2 s.

Cost of the next level = `round(base × growth^level × steepExtra)`, where `steepExtra` is 1 except for Rarity's last levels (×2, ×4, ×8, see above). Pixel values are in logical units of the 960×540 view (×2 on 1080p).

Sample costs:

| Upgrade | Lv 0 | Lv 1 | Lv 2 | Lv 5 | Lv 10 | Lv 15 | Lv 20 | Last level |
|---|---|---|---|---|---|---|---|---|
| Value | 8 | 13 | 20 | 79 | 776 | 7,637 | 75,202 | 4,614,722 (Lv 29) |
| Range | 4 | 7 | 12 | 58 | 855 | 12,503 | – | 106,902 (Lv 19) |
| Spawn rate | 4 | 7 | 12 | 58 | 855 | 12,503 | – | 106,902 (Lv 19) |
| Strength | 6 | 12 | 25 | 212 | 7,490 | – | – | 129,710 (Lv 14) |
| Capacity | 10 | 21 | 45 | 418 | 17,491 | – | – | 346,700 (Lv 14) |
| Rarity | 50 | 110 | 242 | 2,577 | – | – | – | 482,908 (Lv 9) |
| Coin speed | 15 | 44 | 130 | 3,295 | – | – | – | 246,160 (Lv 9) |

Total cost to max everything ≈ 15M – far beyond one run; Value's top levels are the long-term sink.

### Balance target

**Earn 1M coins in a run (total earned, not held) in ~20 minutes of active play, buying upgrades as soon as they're affordable.**

Checked with the balance simulator ([scripts/balance-sim.ts](../scripts/balance-sim.ts) + [scripts/bot.ts](../scripts/bot.ts)): a bot plays the real game logic – dodges nearby anti-coins and their warnings, chases the nearest good coin, fires Pulse when 3+ coins are on the board, and always buys the cheapest affordable upgrade.

| Milestone (earned this run) | Slow (250 px/s) | Average (400 px/s) | Fast (600 px/s) |
|---|---|---|---|
| 100 | 0:59 | 0:48 | 0:44 |
| 1,000 | 2:38 | 2:01 | 1:55 |
| 10,000 | 5:41 | 4:28 | 4:00 |
| 100,000 | 10:29 | 8:21 | 7:26 |
| **1,000,000** | **22:41** | **19:20** | **17:22** |
| catch rate | 66% | 75% | 82% |

Player skill matters (~5 min between a fast and a slow player): combo, anti-coins and Pulse all reward active play.

Run: `npm run sim -- [cursorSpeed] [runs]`. Quick tuning without editing files: `OV='{"value":{"growth":1.6}}' npm run sim`. `npm test` includes a guard that the average bot reaches 1M in 16–24 min.

### Extended (unlocked later)

- **Rare coin upgrades** – more tiers beyond Prism.
- **Satellites** – extra small magnets orbiting the cursor (count, orbit radius, their own range). Fits better as a late-game or prestige reward.
- **Pulse upgrades** – shorter cooldown, longer duration.

### Automation

- **Drones** – autonomous magnets roaming the board (count, speed, range).
- **Offline** – on return the player receives part of the drones' output for the time away (e.g. 50%, capped at 8 h).

### Prestige – "Polarity Shift"

Requirement: **earn 1M total in the current run.** Resets currency and upgrades in exchange for **Cores**. Cores give a permanent percentage bonus and unlock new mechanics (e.g. new coin types, field shapes). Lives in the bar under the board. Details to be designed in milestone M5.

## Milestones

| # | Scope | Done when… | Status |
|---|---|---|---|
| **M0** | Skeleton: Vite + TS, canvas, fixed simulation step, layout (board, prestige bar placeholder, panel), tests running | an empty board with a cursor magnet runs smoothly | ✅ |
| **M1** | Core: coin spawn animation, drift, pull, pickup, currency counter | you can play and collect coins | ✅ |
| **M2** | Shop with the 7 core upgrades + progressive unlocks, coin tiers, combo, number formatting, save/load | the "collect → buy" loop works and survives a page refresh | ✅ |
| **M3** | Events, Pulse, anti-coins, run stats, mini-goals | the main loop has variety and rewards skill | ✅ (goal rewards TBD) |
| **M4** | Drones, offline progress | the game progresses without input | |
| **M5** | Prestige | there's a reason to start over | |
| **M6** | Polish: sounds, more particles, save export UI, satellites | the game *feels* good | |

**MVP = M0–M2.** Collecting coins has to be fun on its own before we add more systems. M0–M3 were built by porting a single-file JS prototype to TypeScript (`src/`). The prototype was then removed so the numbers live in one place; it's still in the git history (first commit, `docs/mockups/`).

## Debug URL params (testing)

Work on `npm run dev` / `npm run preview`: `?nosave=1` don't load/write the save · `?reset=1` clear the save · `?warm=N` fast-forward N seconds · `?earned=N` start as if N coins were earned (unlocks + money) · `?rare=1` boost rare coin chances · `?anti=1` boost anti-coin chance to 30% (needs `earned` ≥ 25000). Combine with `&`.

## Out of scope (for now)

- Mobile / touch version (designed for mouse, but don't block touch for later)
- Backend, accounts, leaderboards
- Achievements (maybe in M6)
- Raster art – simple shapes drawn on the canvas to start

## Open questions

- Final drift/pull speeds and spawn positions.
- Prism coins (×3 speed) cross half the board in ~0.6 s – check in playtesting whether they're catchable or just frustrating.
- Combo stays at ×2 for most of the mid/late game for a good player – maybe raise the cap via upgrades or prestige.
- Miss sparks at the board edge may get noisy late game (many misses per second).
