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
  | Void (Void Coin keystone) | 0.3%, rolled first; Rarity bonuses don't apply | ×10 | ×1.5 | pull ×0.60 | black hole: dark disc, two spinning violet/pink accretion arcs, thin horizon ring, trail, biggest burst on pickup |
  | Anti | 0.5% (after 25,000 earned) | – | ×0.2 | pull ×0.60 (a bit heavier than Prism); **not affected by Pulse or Strength upgrades** | red spiky star with an ×; 1 s warning marker before it appears; vanishes after 5 s; see below |

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
- **Anti-coins** – touching one short-circuits the magnet: it turns off for **1.5 s** (flickering red, `OFFLINE` countdown) and the combo resets. The board shakes. Every anti-coin is **telegraphed for 1 s** before it appears: a red crosshair at the spawn point with two rings closing in, a growing red glow and a blinking `!` that speeds up. Pulse's extra range doesn't apply to them, and they are always pulled with the level-0 Strength (0.50×), so upgrading Strength never drags them in harder. They drift very slowly (×0.2), are only weakly pulled, and **disappear on their own after 5 s** (fading and shrinking over the last 0.8 s; still dangerous until gone), so they act as temporary obstacles a careful player steers around.
- **Run stats** – on the Stats screen (`Tab` or pause menu → STATS), not on the board: run time, earned / goal, income, catch %, coins by tier, missed, best combo, anti-coin hits, events.
- **Mini-goals** – short-term in-run goals that pay an **instant cash boost**: `rewardSeconds × value per coin × spawn rate` ("N seconds of perfect income", from upgrade levels, so events don't inflate it). Completing one shows a `GOAL COMPLETE · +X` banner and a gold `+X` pop next to the wallet. Progress on every goal is on the Stats screen (the board only shows the completion banner). Goals reset with Polarity Shift.

  | Category | Targets (reward in seconds of perfect income) |
  |---|---|
  | Coins (any non-anti coin) | 10 (15 s) · 100 (20 s) · 1,000 (30 s) · 5,000 (45 s) |
  | Anti-coins | 1 (20 s) |
  | Gold coins | 10 (20 s) · 50 (30 s) · 100 (45 s) |
  | Prism coins | 3 (20 s) · 7 (30 s) · 11 (40 s) · 49 (60 s) |

  Example: "Catch 10 coins" at the start pays 15 (1 coin × 1/s × 15 s); "Catch 100 coins" with Value 30 pays 344 × spawn × 20 s.

## Visual style

**Neon / sci-fi**: dark navy board with a faint cyan grid, glowing cyan hexagon coins, a magenta magnet with a pulsing field ring, cyan-outlined panels, monospace font. Edges glow red as the "escape" line. Implemented in `src/render/`.

## Layout

- Board ≈ 73% of the screen width on the left (≈ 1400 px wide on 1920×1080).
- Below the board only: a **prestige bar** (≈ 100 px tall on 1080p), reserved for Polarity Shift progress.
- Upgrade panel on the right, full height. Exactly 7 rows fit.
- **Keyboard:** keys 1–7 (top row or numpad) buy the upgrade in that panel row, so the player can keep the cursor on the board. Each row shows its key next to the level (`Lv 3/20  [2]`).

### Menus (mockup: [mockups/menu.html](mockups/menu.html))

- **Title screen** on every launch, including the very first one: logo over a slow animated magnet field, then `CONTINUE` (only when a save exists; shows `Shift N · X ◆ · run m:ss · saved … ago`, or `First run · m:ss · N coins` before the first shift), `NEW GAME` and `SETTINGS`. `Enter` = Continue (or New Game when there is no save). Nothing is saved while the title is open, so a first launch that never starts a run leaves no save behind.
- **New Game** with a save asks first (`START A NEW GAME?`, what will be erased, `ERASE & START` / `CANCEL` or `Esc`); without a save it starts right away. Settings are not erased.
- **Pause menu**: `⚙` button in the panel header (hint `MENU [Esc]`) or `Esc` during a run. The run is frozen; `RESUME` (`Esc`), `STATS` (`Tab`), `SETTINGS`, `BACK TO MENU` (saves first).
- **Stats** (mockup: [mockups/stats.html](mockups/stats.html)): `Tab` during a run or `STATS` in the pause menu (`Tab`); `Tab` / `Esc` / a click outside the panel close it, back to where it was opened. The run is paused. The board itself has no stats line or goal tracker any more – only a faint `[Tab] stats` hint in its bottom-right corner. Three columns:
  - **This run**: run time, earned / goal, income now, catch rate, coins caught (basic / Gold / Prism / Void), missed, best combo, anti-coin hits, events.
  - **Mini-goals**: all 12 goals by category – ✓ done, ▸ current with a progress bar, later ones greyed, reward in seconds of perfect income (incl. Bulk Order / Nickel bonuses); `N of 12 done`.
  - **Lifetime** (`meta.life`, save v6, kept across shifts): play time, coins earned, coins caught by tier, best combo ever, Polarity Shifts, fastest run to goal, Cores earned, mini-goals done, Lodestone pulls, anti-coins dodged (vanished or pushed off without touching the magnet). Saves older than v6 start these at zero.
- **Settings** (from the title or the pause menu, `Esc` = back): master / music / effects volume sliders (placeholders until there is sound, but saved), Screen shake toggle (anti-coin hits), Fullscreen toggle (also `F11`; follows the browser state, not saved). Stored apart from the game save under `magnetic-field-settings` (no version; unknown or wrong fields fall back to defaults).
- Any debug URL param skips the title screen and starts the run directly.

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
| Value | `round((1 + k) × 1.15^k)`, `k = 20l/30` | 1 | 30 | 344 | 7.2 | ×1.53 | start |
| Range | `30 + 5l` px | 30 px | 20 | 130 px | 4 | ×1.73 | start |
| Spawn rate | `1.0 × 1.14^l` /s | 1.00/s | 20 | 13.74/s | 4 | ×1.73 | start |
| Strength | `0.5 × 1.15^(20l/15)` | 0.50× | 15 | 8.18× | 6 | ×2.07 | 30 earned |
| Capacity | `8 + round(75l/15)` coins (+5 per level) | 8 | 15 | 83 | 10 | ×2.14 | 150 earned |
| Rarity | `+0.5% × l` to each rare tier | +0% | 10 | Gold 15% · Prism 6% | 50 | ×2.2, plus ×2 per level for Lv 8–10 | 1,000 earned |
| Coin speed | `1.95 / 0.96^(15l/10)` s | 1.95 s | 10 | 3.60 s | 15 | ×2.98 | 3,000 earned |

Caps were changed (Value 20 → 30, Strength/Capacity 20 → 15, Coin speed 15 → 10) while keeping the value at max the same: effects are written in terms of progress `level / max`, and cost growth was rescaled so the total cost of each upgrade stays similar.

Rarity level costs: 50 · 110 · 242 · 532 · 1,171 · 2,577 · 5,669 · **24,944 · 109,752 · 482,908** (levels 8–10 get an extra ×2, ×4, ×8).

At max Strength a basic coin is pulled at ~370 px/s at the edge of the field and ~1,400 px/s near the magnet, so at max Range it flies in within ~0.2 s.

Cost of the next level = `round(base × growth^level × steepExtra)`, where `steepExtra` is 1 except for Rarity's last levels (×2, ×4, ×8, see above). Pixel values are in logical units of the 960×540 view (×2 on 1080p).

Sample costs:

| Upgrade | Lv 0 | Lv 1 | Lv 2 | Lv 5 | Lv 10 | Lv 15 | Lv 20 | Last level |
|---|---|---|---|---|---|---|---|---|
| Value | 7 | 11 | 17 | 60 | 506 | 4,243 | 35,576 | 1,634,496 (Lv 29) |
| Range | 4 | 7 | 12 | 62 | 961 | 14,885 | – | 133,332 (Lv 19) |
| Spawn rate | 4 | 7 | 12 | 62 | 961 | 14,885 | – | 133,332 (Lv 19) |
| Strength | 6 | 12 | 26 | 228 | 8,667 | – | – | 159,124 (Lv 14) |
| Capacity | 10 | 21 | 46 | 449 | 20,144 | – | – | 422,467 (Lv 14) |
| Rarity | 50 | 110 | 242 | 2,577 | – | – | – | 482,908 (Lv 9) |
| Coin speed | 15 | 45 | 133 | 3,525 | – | – | – | 277,995 (Lv 9) |

Total cost to max everything ≈ 7.5M – far beyond the first run; Value's top levels are the long-term sink.

### Balance target

**First run: earn 1M coins (total earned, not held) in ~14 minutes of active play, buying upgrades as soon as they're affordable.**

Checked with the balance simulator ([scripts/balance-sim.ts](../scripts/balance-sim.ts) + [scripts/bot.ts](../scripts/bot.ts)): a bot plays the real game logic – dodges nearby anti-coins and their warnings, chases the nearest good coin, fires Pulse when 3+ coins are on the board, and always buys the cheapest affordable upgrade. That is a naive buyer on purpose: a player who saves up for Value (like the Auto-buyer) reaches 1M about 20% sooner (~10–11 min). Since anti-coins ignore Strength upgrades the bot's 45 px dodge avoids them all (0 hits per run, was ~17).

| Milestone (earned this run) | Slow (250 px/s) | Average (400 px/s) | Fast (600 px/s) |
|---|---|---|---|
| 100 | 0:38 | 0:29 | 0:28 |
| 1,000 | 1:43 | 1:19 | 1:06 |
| 10,000 | 3:47 | 2:57 | 2:15 |
| 100,000 | 6:32 | 5:05 | 4:22 |
| **1,000,000** | **15:11** | **13:05** | **11:38** |
| catch rate | 67% | 77% | 84% |

Player skill matters (~5 min between a fast and a slow player): combo, anti-coins and Pulse all reward active play.

Later runs (bot; after each shift it spends Cores on the cheapest purchasable nodes and all crystals in the Magnetron). The goal grows linearly (+1.5M per shift), so each run is a bit faster than the previous one:

| Run | Goal | Cores earned before the run | Slow (250) | Average (400) | Fast (600) |
|---|---|---|---|---|---|
| 1 | 1M | 0 | 15:11 | 13:05 | 11:38 |
| 2 | 2.5M | 10 | 13:13 | 11:42 | 10:55 |
| 3 | 4M | 20 | 10:05 | 8:29 | 8:36 |
| 4 | 5.5M | 30 | 9:11 | 8:05 | 7:53 |
| 5 | 7M | 40 | 7:13 | 6:36 | 6:08 |
| 6 | 8.5M | 50 | 6:15 | 5:44 | 5:43 |
| 7 | 10M | 60 | 4:38 | 4:15 | 4:10 |
| 8 | 11.5M | 70 | 3:56 | 3:47 | 3:24 |
| 9 | 13M | 80 | 3:39 | 3:35 | 2:50 |
| 10 | 14.5M | 90 | 2:52 | 2:31 | 2:08 |
| 12 | 17.5M | 110 | 2:14 | 1:52 | 1:42 |
| 15 | 22M | 140 | 1:27 | 1:23 | 1:13 |

The greedy bot buys the cheapest nodes first, so it reaches M5 nodes very late (only Chain Reaction, from run 13) – the table is mostly the non-M5 tree. Runs drop under 3 min from run 9–10 even without M5 nodes: **late-run balance is the next roadmap item.** An exponential goal (×2–3 per shift) was tried and rejected: in-run income has a ceiling (upgrade caps), so from run 5 the goal took hours. Goal step 1.5 (instead of 1) compensates for Lodestones.

**M5 node impact** (`npm run sim:m5 -- [shifts=9] [seeds=3]`): the same run 10 (goal 14.5M, greedy tree from 9 shifts) played by the average bot with one M5 node added, and an idle run with nobody touching the mouse:

| Added to the run-10 tree | Run time | vs. without |
|---|---|---|
| – | 2:31 | – |
| Satellites 1 / 3 | 2:29 / 2:25 | −1% / −4% |
| Chain Reaction | 2:31 | −0% |
| Void Coin | 2:32 | +1% |
| Interest | 2:27 | −3% (the bot spends everything at once; Interest rewards saving up) |
| Drones 1 / 3 | 2:27 / 2:18 | −3% / −9% |
| all M5 nodes | 2:14 | −11% |

| Idle (no cursor), Auto-buyer + | Income over 10 min |
|---|---|
| Drones 1 | 42k /s |
| Drones 2 | 66k /s |
| Drones 3 | 81k /s |
| *(active average bot, no Drones)* | *97k /s* |

In active play the keystones are a modest boost; their big effect is idle play – 3 Drones earn ~84% of an active player's income (see Open questions).

**Whole game** (bot, total play time from a new game to buying Break the Compass; average of 6 seeds per speed, range in brackets; time spent in the tree and Magnetron screens not counted – a human playing for the first time is probably 20–30% slower). **Target: ~3 h for the average bot.**

| Milestone | Run | Slow (250) | Average (400) | Fast (600) |
|---|---|---|---|---|
| First shift (1M) | 1 | 15 min | 13 min | 11.5 min |
| Stage 1 maxed (246 ◆) → broken compass opens | 22 | 1:37 | 1:28 | 1:22 |
| Stage 2 maxed (+254 ◆) → full rose opens | 40 | 2:10 | 2:00 | 1:55 |
| Stage 3 maxed (+400 ◆) → Break the Compass appears | 69 | 3:00 | 2:49 | 2:43 |
| **Break the Compass bought (100 ◆) – the ending** | 76 | **3:10** (2:58–3:40) | **2:59** (2:47–3:12) | **2:53** (2:41–3:02) |
| Every Lodestone at Lv 3 | 31–61 | ~2:20 | ~2:04 (1:40–2:17) | ~2:00 |

Run lengths of the average bot by stage: stage 1 – 22 runs, 13:17 → 0:41 (avg 3:48) · stage 2 – 18 runs, 5:05 → 0:36 (avg 1:53) · stage 3 – 29 runs, 3:29 → 0:58 (avg 1:41) · stage 4 (saving 100 ◆) – 7 runs, ~1:40 · endless – ~1:35 per run, stable. Every new stage multiplies the run goal (see Prestige), so runs get long again when a stage opens and shrink as its nodes are bought – without it, runs in stages 2–3 dropped to 2–11 seconds.

Cursor speed (skill) matters early – ~15 min between slow and fast at the end of stage 1 – but less later: automation and capped upgrades do most of the work, so the gap at the ending is ~17 min. Crystals come mostly per run (+3 per shift, +1 per mini-goal), so the Lodestone collection depends more on gacha luck than on skill.

Run: `npm run sim -- [cursorSpeed] [runs] [shifts]`. Quick tuning without editing files: `OV='{"value":{"growth":1.5}}' npm run sim`. `npm test` includes a guard that the average bot reaches 1M in the first run in 12–16 min.

### Lodestones – the Magnetron (gacha)

Opens after the first Polarity Shift: `◈ N [G]` button in the panel header (or key `G`). Data: `src/data/lodestones.ts`, logic: `src/game/lodestones.ts`. Everything here is kept forever (meta).

- **Charge Crystals**: +1 per mini-goal, +1 per event, +3 per shift, Prism pickups drop one 5% of the time (+ Neodymium bonus). Earned from the start; visible once the Magnetron opens.
- **Pull** = 10 crystals (×1 or ×10). Odds: Common 45% · Rare 32% · Epic 17% · Legendary 6%. **Pity**: Epic or better guaranteed on the 20th pull without one.
- **Legendary pity**: once every Common, Rare and Epic stone is at Lv 3, every pull is a Legendary that isn't maxed yet (at most 12 pulls to finish the collection). The Magnetron shows `All lower stones maxed: every pull is a Legendary`, and `Collection complete · pulls refund 3 ◈` when everything is maxed. Before this rule the last Legendary levels were a long grind of 3-crystal refunds (100% took ~2.5–3.5 h, 175–270 runs).
- **16 stones** = 4 elements × 4 rarities (Shard / Ingot / Heart / Crown). Duplicates level a stone up to **Lv 3**; duplicates of a maxed stone refund 3 crystals.

| Rarity | Coin value / level | Extra / level (Epic; Legendary ×2) |
|---|---|---|
| Common | +1% | – |
| Rare | +2% | – |
| Epic | +3% | Iron: +2% range · Cobalt: +0.2% Gold & Prism chance · Nickel: +5% mini-goal rewards · Neodymium: +1% crystal chance |
| Legendary | +5% | double the Epic extra |

- **Set bonus**: owning all four stones of an element (any level): +5% coin value. Everything maxed (Lv 3) ≈ +150% coin value. Full collection: see *Whole game* above (~2 h of play, before the ending).
- Screen: machine + pity counter on the left, 4×4 collection on the right (hover for effects), card-flip reveal after a pull. The run is paused while it's open.

### Endgame – "Break the Compass" (look: [mockups/compass-rose.html](mockups/compass-rose.html)) ✅

The Core tree grows from a 4-point compass into an 8- and a 16-point rose, all in the **same tree, bought with Cores** (no second prestige layer). A stage opens once **every node of the previous stage is maxed**; its nodes appear in the tree (`STAGE n/4 · …` above the legend, background letters for the new directions) and the **run goal jumps** (see Prestige). Data: `STAGE_NODES`, `BREAK_COMPASS` in `src/data/prestige.ts`; logic in `src/game/prestige.ts`.

1. **Stage 1 – the compass**: N / E / S / W, 28 nodes, 246 ◆ (table below).
2. **Stage 2 – the broken compass**: four hybrid branches between the cardinals, each `b1 → b2/b3 → keystone` from the Polarity Core, 16 nodes, 254 ◆.
3. **Stage 3 – the full rose**: eight mastery spokes, each `b1 → mastery node`; a spoke's b1 grows from the keystones of its two neighbours (NNE from N and NE…). 16 nodes, 400 ◆.
4. **Break the Compass** – the last upgrade, a gold star above N, **100 ◆**: every upgrade can go **50 levels past its cap**, coin value ×3, +2 Drones, +2 Satellites. Buying it (after the shift confirm) shows the **ending**: a star bursting out of the rose, `THE COMPASS IS BROKEN`, **`THANK YOU FOR PLAYING`**, shifts / Cores earned / Lodestones, a credits line, then `PLAY ON · ENDLESS` (`Enter`).
5. **Endless**: the game goes on – the prestige bar says `POLARITY SHIFT · ENDLESS`, the goal keeps growing with every shift (×300 multiplier, ~1:35 runs that stay stable), the tree is complete and locked (no refunds or reset). Best-time records are not done yet.

Whole tree: **1,000 ◆** (246 + 254 + 400 + 100).

**Levels above the cap** (Break the Compass): each extra level adds a fixed `over` amount to the effect (Value +40 per coin, Range +2 px, Spawn +0.25/s, Strength +0.3×, Capacity +2, Rarity +0.2%, Coin speed +0.1 s) and costs ×1.15 the previous level (`OVERCAP_GROWTH`, `effectAt()` in `src/data/upgrades.ts`, `costOf()` in `src/game/money.ts`). Levels above the cap are kept in the save only while the compass is broken.

**Stage 2 – the broken compass** (hybrid colors are the blend of their two neighbours):

| Node | Effect | Levels | Cost (◆ per level) |
|---|---|---|---|
| **NE · Hunter** (active + coins) | | | |
| Predator | Gold, Prism and Void coins are pulled +15% faster / lv | 3 | 5 · 7 · 9 |
| Golden Streak | while the combo is at its max, Gold chance +3% / lv | 2 | 8 · 10 |
| Trophy | Gold coins worth ×2.5 / ×3 instead of ×2 | 2 | 8 · 10 |
| Polarity (keystone) | the field pushes anti-coins away; an anti-coin pushed off the board pays like a Prism | 1 | 16 |
| **SE · Merchant** (coins + economy) | | | |
| Bulk Order | mini-goal rewards +50% / lv | 3 | 5 · 7 · 9 |
| Market Day | upgrades cost half during Burst events | 1 | 10 |
| Insurance | escaped coins still pay 10% of their value / lv | 2 | 8 · 10 |
| Mint (keystone) | every caught Gold coin splits off two basic coins | 1 | 16 |
| **SW · Foundry** (economy + automation) | | | |
| Assembly Line | Satellite, Drone and Twin Magnet fields +15% / lv | 3 | 5 · 7 · 9 |
| Overtime | Interest pays every 5 s instead of 10 s | 1 | 10 |
| Smelter | Auto-buyer twice as fast (8 levels/s) | 1 | 10 |
| Second Shift (keystone) | +1 Drone, Drones fly 40% faster | 1 | 16 |
| **NW · Machine** (automation + active) | | | |
| Overclock | Pulse cooldown −20% / lv | 2 | 6 · 9 |
| Drone Link | while Pulse is active, helper fields grow with it | 1 | 10 |
| Long Pulse | Pulse lasts +0.5 s / lv | 2 | 8 · 10 |
| Twin Magnet (keystone) | a second magnet mirrored through the board centre (80% field, ignores anti-coins; violet ring) | 1 | 16 |

**Stage 3 – the full rose** (b1 → mastery node):

| Spoke | b1 (levels · cost) | Mastery node (22 ◆) |
|---|---|---|
| NNE (N + NE) | Wide Field: +5% range / lv (3 · 8/10/12) | Perfect Field: field +50% while the combo is at its max |
| ENE (NE + E) | Fortune: +0.5% Gold and Prism chance / lv (3 · 8/10/12) | Jackpot: 1% of pickups pay ×25 |
| ESE (E + SE) | Gilding: +1% Gold chance / lv (3 · 8/10/12) | Golden Age: +10% Gold chance |
| SSE (SE + S) | Dividend II: +10% coin value / lv (3 · 8/10/12) | Compound II: Compound +2% per minute, up to +100% |
| SSW (S + SW) | Discount II: upgrades −5% / lv (3 · 8/10/12) | Blueprint: every run starts with all upgrades unlocked at Lv 5 |
| WSW (SW + W) | Afterburner: Drones +15% speed / lv (3 · 8/10/12) | Swarm: +2 Drones |
| WNW (W + NW) | Shockwave: Pulse range +0.5× / lv (2 · 10/12) | Orbit: +2 Satellites |
| NNW (NW + N) | Hot Streak II: combo window +0.3 s / lv (2 · 10/12) | Combo Limit II: max combo ×3 |

Changed from the first plan: no Shards layer (Cores all the way); the right-click attract/repel flip became the passive Polarity keystone (right click is already Pulse, and anti-coins were nearly harmless); the Collector turret and the Hunting Season bounty coin were replaced by Second Shift and Mint (simpler, no new controls); the central TRUE NORTH node and a separate "The End" upgrade were merged into Break the Compass.

### Prestige – "Polarity Shift" (UI mockup: [mockups/polarity-shift.html](mockups/polarity-shift.html))

Requirement: **earn the run goal = 1M × (1 + 1.5 × shifts) × stage multiplier** – 1M, 2.5M, 4M, 5.5M, … in stage 1. The multiplier is ×1 / ×3.5 / ×7.5 / ×10 while stage 1 / 2 / 3 / 4 is the highest open stage, and ×300 in endless (`PRESTIGE.stageGoal`, `endlessGoal`); the confirm dialog shows the next goal including a stage opened by the draft. Reward: **Cores** = `floor(10 × √(earned this run ÷ goal))` – about 10 at the goal of any run, 14 at 2× the goal, 20 at 4×, so playing on pays off with diminishing returns (e.g. a planned longer grind for extra Cores).

**Flow**

1. **From 100k earned** a `◆ CORE TREE [T]` button appears in the prestige bar: the tree can be **browsed** (read-only preview) mid-run.
2. **At 1M** the bar glows and shows `SHIFT POLARITY [P]` with the Cores you'd get now and the earnings needed for one more (`+1 ◆ at 1.21M`) – a Core hint, not the next run's goal.
3. Shift opens the **Core tree** with this run's Cores added. The player places them; choices are **tentative** (UNDO / NOT YET revert them).
   **Respec is free at every shift:** right-click an owned node to refund one level (only if no owned node would lose its last owned parent – leaves first), or `RESET TREE` to refund the whole tree. Refunds go into the same draft, so UNDO brings the saved tree back and nothing is final until the confirm; the confirm dialog shows `Refunded X ◆ · spent Y ◆ …`.
4. `SHIFT & START RUN` shows a **confirm dialog over the tree**: Cores earned, spent and saved, what resets (coins, upgrade levels, unlocks, mini-goals, run stats) and what's kept (Cores, Core tree, lifetime stats, settings), and the **next run's goal** (`NEXT RUN GOAL: EARN 2.5M`).
5. Confirm → "polarity flip" animation from the Core → a new run starts; its banner repeats the new goal (so does the Auto-shift banner).

The run is paused while the tree or the confirm dialog is open. Keys: `T` tree preview, `P` shift, `Esc` back, `Enter` confirm. After the first shift, "NEW UPGRADE" / feature banners are not repeated (rows still flash); the anti-coin warning still shows.

**Core tree** – nodes revealed next to owned ones; drag to pan, scroll to zoom. Four branches on real compass directions (N red like a compass needle), each b1 → b2/b3 → b4/b5/b6 → keystone. Data: `src/data/prestige.ts`, effects: `src/game/prestige.ts`.

Stage 1: **246 ◆** (~25 shifts at ~10 Cores each; stages 2–4 below). Keystones and the priciest automation levels were cut ~35% (299 → 246) so long-term goals come sooner; the cheap starter nodes kept their costs. Cheapest path to a first keystone: Satellites 1 = 15 ◆, Interest 17, Void 19, Drones 1 = 20 (2 shifts).

| Node | Effect | Levels | Cost (◆ per level) | Status |
|---|---|---|---|---|
| **Polarity Core** (centre) | +2% coin value per Core ever earned | – | – | ✅ |
| **N · Active play** (red) | | | | |
| Charged Field | +10% field range / lv | 3 | 1 · 2 · 3 | ✅ |
| Momentum | moving the cursor fast widens the field: up to +15% range / lv at 500 px/s | 2 | 2 · 4 | ✅ |
| Hot Streak | combo window +0.3 s / lv | 2 | 2 · 4 | ✅ |
| Combo Shield | once every 30 s an anti-coin doesn't reset the combo | 1 | 5 | ✅ |
| Grounding | anti-coin short circuit −0.4 s / lv | 2 | 3 · 5 | ✅ |
| Combo Limit | max combo ×2 → ×2.5 | 1 | 5 | ✅ |
| Satellites (keystone) | mini-magnets orbiting the cursor, +1 / lv | 3 | 7 · 10 · 13 | ✅ |
| **E · Coins & events** (amber) | | | | |
| Lucky Charge | +1% Gold and Prism chance / lv | 3 | 2 · 3 · 4 | ✅ |
| Prism Resonance | Prism worth ×4 (speed stays ×3) | 1 | 6 | ✅ |
| Storm Front | events +20% more often / lv | 2 | 2 · 4 | ✅ |
| Chain Reaction | catching a Prism also collects every coin within 80 px | 1 | 6 | ✅ |
| Meteor Shower | new event: a line of 12 fast coins sweeps in from one edge | 1 | 5 | ✅ |
| Golden Fountain | Fountain events spray Gold only | 1 | 5 | ✅ |
| Void Coin (keystone) | new ×10 coin tier (0.3%) | 1 | 10 | ✅ |
| **S · Economy** (cyan) | | | | |
| Dividend | +15% coin value / lv | 5 | 1 · 2 · 3 · 4 · 5 | ✅ |
| Head Start | start runs with 500 / 5k / 50k coins | 3 | 2 · 4 · 6 | ✅ |
| Discount | upgrades −8% cost / lv | 3 | 2 · 4 · 6 | ✅ |
| Fast Track | upgrades, Combo, Pulse unlock at half the earnings | 1 | 4 | ✅ |
| Compound | +1% value per run minute, max +30% | 1 | 5 | ✅ |
| Core Yield | +20% Cores per shift / lv | 2 | 6 · 7 | ✅ |
| Interest (keystone) | +1% of held coins every 10 s, max 10 s of perfect income | 1 | 9 | ✅ |
| **W · Automation** (green) | | | | |
| Bulk Buy | Shift + key/click buys max levels | 1 | 1 | ✅ |
| Auto-buyer | buys upgrades (Value first when it's the better deal), max 4 levels/s; can be paused | 1 | 6 | ✅ |
| Magnet Memory | field keeps working 1 s after leaving the board | 1 | 3 | ✅ |
| Auto-pulse | Pulse fires when ready and 5+ coins are within Pulse range | 1 | 5 | ✅ |
| Homing Prisms | Prism coins steer toward the magnet from anywhere | 1 | 4 | ✅ |
| Auto-shift | shift automatically at 1× / 2× / 4× the goal; Cores are banked | 1 | 8 | ✅ |
| Drones (keystone) | autonomous magnets, +1 / lv | 3 | 8 · 12 · 16 | ✅ |

### Keystones and automation (M5)

Numbers live in `src/data/tuning.ts` (`SATELLITES`, `DRONES`, `CHAIN`, `INTEREST`, `AUTO`) and `src/data/tiers.ts` (`VOID_TIER`); logic in `src/game/helpers.ts` (Satellites, Drones), `src/game/automation.ts` (Auto-buyer, Auto-pulse), `src/game/prestige.ts` (Auto-shift) and `src/game/simulation.ts` (Void, Chain Reaction, Interest). Without these nodes the simulation is bit-for-bit the same as before M5 (same RNG sequence).

- **Helper magnets** (Satellites, Drones) pull and collect good coins with the main magnet's Strength, using the normal pull formula with their own field radius. They **ignore anti-coins** (no pull, no short circuit) and Pulse. Where fields overlap, the main magnet wins. Their pickups are normal pickups (combo, goals, crystals).
  - Look (mockup variant B): Satellites are small magenta hexes tethered to the magnet by a faint beam, with a soft glowing field; Drones are small green ships pointing where they fly, with a thruster trail and a faint field ring (direction and trail are visual-only, kept in `render/effects.ts`).
  - **Satellites**: evenly spaced on an orbit = the field radius without Pulse, turning at 2.4 rad/s; each has a field of 40% of that radius. They exist only while the main magnet does (gone off the board and during a short circuit; with Magnet Memory they stay at the remembered spot).
  - **Drones**: start on a small ring around the board centre, each flies at 140 px/s toward the nearest good coin no other drone has claimed (and stays put when there is none); field = 45% of the main field radius. They keep working while the cursor is off the board or short-circuited. Positions are transient (not saved).
- **Void Coin**: rolled before the other tiers with its own 0.3% chance (an extra RNG roll only when the keystone is owned).
- **Chain Reaction**: after the coin loop of a step, every good coin past its spawn animation within 80 px of a caught Prism is collected; a Prism caught this way chains again. A `CHAIN` ring and pop show it.
- **Interest**: whenever the run clock passes a multiple of 10 s, gain `min(1% of held coins, 10 s of perfect income)` (perfect income = value per coin × base spawn rate, as for mini-goals). Counts as earned. Cyan `+X` pop next to the wallet (mini-goal pops are amber). The cap keeps a long idle session (Drones + Auto-buyer) from growing exponentially.
- **Auto-buyer**: every step, if its 0.25 s cooldown is over, picks the unlocked, unmaxed upgrade with the lowest `cost × weight` (ties → panel order) and buys it if affordable – otherwise it **saves up** for it instead of buying something else. Weights are in `AUTO.buyWeight`: Value 0.33, others 1. Value is the best upgrade, and cheapest-first buying costs ~20% run speed (bot: 1M in 13:25 cheapest-first vs 10:53 with this rule), which made the node a downgrade for a player who prioritises Value by hand. The row flashes. An `AUTO` toggle next to UPGRADES (click or key `B`) pauses and resumes it: green = running, grey = paused, with a hint on hover. On by default; the setting is kept across shifts and saved (`meta.autoBuyOff`, save v5).
- **Auto-pulse**: fires Pulse when it's ready and 5+ good coins (past the spawn animation) are within the Pulse radius (field × Pulse multiplier) of an active magnet. `AUTO` tag in the Pulse widget.
- **Auto-shift**: toggle in the shift bar (left of the Core tree button; click or key `A`) cycles OFF → ×1 → ×2 → ×4 the run goal (≈ 10 · 14 · 20 Cores). Off by default. When the target is earned, the run restarts on the spot without the tree screen; the Cores are **banked** and spent on the next manual shift (turn AUTO off to shift by hand). The setting is saved (`meta.autoShift`, save v4).

## Milestones

| # | Scope | Done when… | Status |
|---|---|---|---|
| **M0** | Skeleton: Vite + TS, canvas, fixed simulation step, layout (board, prestige bar placeholder, panel), tests running | an empty board with a cursor magnet runs smoothly | ✅ |
| **M1** | Core: coin spawn animation, drift, pull, pickup, currency counter | you can play and collect coins | ✅ |
| **M2** | Shop with the 7 core upgrades + progressive unlocks, coin tiers, combo, number formatting, save/load | the "collect → buy" loop works and survives a page refresh | ✅ |
| **M3** | Events, Pulse, anti-coins, run stats, mini-goals | the main loop has variety and rewards skill | ✅ |
| **M4** | Polarity Shift: Cores, Core tree screen (browse from 100k, spend on shift, confirm), simple nodes (stat bonuses) | there's a reason to start over | ✅ |
| **M5** | Lodestones / Magnetron ✅ · keystones and mechanics from the tree: Satellites, Void Coin, Chain Reaction, Interest, auto-buyer, Auto-pulse, Auto-shift, Drones ✅ | the game partly plays itself | ✅ (look chosen from [mockups/m5-visuals.html](mockups/m5-visuals.html): variant B) |
| **M6** | Polish: title screen, pause menu and settings ✅ · sounds, more particles, save export UI | the game *feels* good | |
| **M7** | Break the Compass: stages 2–3 (32 nodes), Break the Compass (+50 upgrade levels), ending screen, endless ✅ | the game has an ending (~3 h) | ✅ (best-time records in endless still open) |

**MVP = M0–M2.** Collecting coins has to be fun on its own before we add more systems. M0–M3 were built by porting a single-file JS prototype to TypeScript (`src/`). The prototype was then removed so the numbers live in one place; it's still in the git history (first commit, `docs/mockups/`).

## Debug URL params (testing)

Work on `npm run dev` / `npm run preview`: `?nosave=1` don't load/write the save · `?reset=1` clear the save · `?warm=N` fast-forward N seconds · `?speed=N` run the game clock N× faster (1–50) · `?earned=N` start as if N coins were earned (unlocks + money) · `?rare=1` boost rare coin chances (Void too, if its keystone is owned) · `?anti=1` boost anti-coin chance to 30% (needs `earned` ≥ 25000) · `?cores=N` set unspent Cores · `?open=shift` open the Core tree to spend Cores (with `earned=1000000`) · `?open=browse` open the tree preview · `?shifts=N` set completed shifts · `?crystals=N` set Charge Crystals · `?pulls=N` pull N lodestones on load · `?open=gacha` open the Magnetron · `?nodes=Nkey:3,Wb2` own Core tree nodes (id with an optional level; `stage1`/`stage2`/`stage3` = every node up to that stage maxed, so the next one is open; `all` = every node maxed incl. Break the Compass = endless) · `?open=ending` show the ending screen · `?open=stats` open the Stats screen. Combine with `&`. Any of these params skips the title screen.

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
- Drones are very strong for idle play: 3 Drones + Auto-buyer earn ~84% of an active player's income with nobody at the mouse. Fine for "the game plays itself", or tune down (e.g. Drone speed 140 → 100 px/s or field 45% → 35%) so active play stays clearly better? Needs a target.
- Endless mode: Cores have nothing left to buy after the ending – best-time records (per run? time to goal?) or another sink?
- Credits line on the ending screen is generic – add the author's name?
- Keystones give only 0…−8% run time in active play (Satellites 3: −4% for 30 Cores) – consider buffing them in the late-run balance pass.
