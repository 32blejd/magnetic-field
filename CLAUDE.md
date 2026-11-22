# Magnetic Field

An incremental game built around a single active mechanic: the player steers a magnet with the cursor across a board and pulls in coins. Upgrades modify the parameters of that mechanic (range, strength, value, spawn rate…); a prestige layer (Polarity Shift → Cores → Core tree), a gacha (Magnetron → Lodestones) and automation build on top, up to an ending (Break the Compass) and endless mode.

Full game outline, numbers, balance and milestones: [docs/DESIGN.md](docs/DESIGN.md). Before adding a new mechanic, check that it is in scope for the current milestone, and keep DESIGN.md in sync with any tuning change.

## Stack

- TypeScript (strict) + Vite
- Everything is drawn on one 2D `<canvas>` (board, HUD, panel) in a 960×540 logical view, scaled to the window
- Tests: Vitest. Balance simulator: `tsx`
- Numbers: plain `number` for now. Gameplay arithmetic and comparisons on currency go through `src/game/money.ts` (`costOf`, `discounted`, `canAfford`, `earn`, `spend`, `coinValue`, `hasEarned`, `earnedRatio`, `earnedShare`, `goalReward`, `interestOn`, `insurancePayout`) and `src/game/shop.ts` (upgrade costs with the Discount node, `buy`, `buyMax`); other code only stores, saves or formats the values. A switch to `break_eternity.js` would touch those two files, the save format, `ui/format.ts` and the income readout in `render/effects.ts`

## Commands

```
npm run dev        # dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the build
npm test           # tests (Vitest, via scripts/vitest.mjs – see below)
npm run typecheck  # tsc only
npm run sim -- [cursorSpeed=400] [runs=3] [shifts=0]   # balance simulator (bot plays the real logic)
npm run sim:m5 -- [shifts=9] [seeds=3]       # impact of each M5 node on a late run + idle income with Drones
```

Sound board (every sound effect, to tune by ear): `npm run dev`, then open `/sounds.html` (dev only, not built).

Deploy: every push to `main` runs `.github/workflows/deploy.yml` (tests, build, GitHub Pages) → https://32blejd.github.io/magnetic-field/. Keep `base: './'` in `vite.config.ts` so the build works under that subpath.

`npm test` goes through `scripts/vitest.mjs`, which upper-cases the drive letter of the working directory first. On Windows a `c:\…` cwd (e.g. a VS Code terminal) makes Vitest load itself twice and every test fails with "Cannot read properties of undefined (reading 'config')". Don't call `vitest` directly.

Debug URL params (dev or preview): `?nosave=1`, `?reset=1`, `?earned=N`, `?cores=N`, `?shifts=N`, `?crystals=N`, `?pulls=N`, `?open=shift|browse|gacha|ending|stats`, `?warm=N`, `?speed=N`, `?rare=1`, `?anti=1`, `?nodes=Nkey:3,Wb2|stage1..3|all` – see `src/debug.ts`. Any of them skips the title screen (without params the game opens on the title screen).

## Structure

```
src/
  data/      # tuning constants, upgrades, coin tiers, goals, Core tree (prestige.ts), Lodestones – pure data, no logic
  game/      # state, simulation step, derived stats, money, shop, abilities, goals, prestige (Core tree, shifts), lodestones,
             # helpers (Satellites, Drones, Twin Magnet), automation – pure logic
  save/      # save/load, versioning, migrations; settings.ts (player settings, own key)
  render/    # canvas drawing (board, HUD, panel, prestige bar, Core tree, Magnetron, menus, Stats, ending) and visual-only effects
  audio/     # sound effects: cues.ts (events → sounds, pure) and synth.ts (Web Audio recipes); soundboard.ts for sounds.html
  ui/        # layout rects, input, number formatting, all UI strings, tutorial tip rules (tips.ts)
  debug.ts   # debug URL params
  main.ts    # wires everything together, game loop
scripts/     # bot + balance simulator (balance-sim.ts, m5-impact.ts), Vitest launcher
tests/       # Vitest tests (formulas, simulation, goals, Core tree and endgame, Lodestones, M5, save, stats, menus, sound cues, ui helpers, balance)
docs/        # DESIGN.md – game design, numbers, balance tables; docs/mockups/ – standalone UI mockups (look & flow only, not the source of any numbers)
```

## Architecture rules

- **Logic does not depend on rendering.** `game/` and `data/` import nothing from `render/` or `ui/`. The simulation runs in tests and in the bot without a browser.
- **Fixed simulation step.** `step(state, STEP, magnet, events)` runs at 1/60 s with an accumulator; rendering via `requestAnimationFrame` only draws. Never tie logic to frame rate.
- **Events out, not callbacks.** `step` pushes `GameEvent`s (pickup, miss, unlock, goal…); `render/effects.ts` turns them into particles, banners etc., `audio/cues.ts` into sounds. Visual and audio state never feeds back into the game.
- **Single source of truth.** `GameState` holds primary data; magnet parameters are derived by `getStats(state)` – never store them.
- **Data-driven upgrades.** A new upgrade = an entry in `src/data/upgrades.ts` + its text in `ui/strings.ts` + its format in `ui/format.ts`. Effects are written in terms of `level / max` so caps can change without changing the value at max; levels above the cap (Break the Compass) add the entry's `over` per level – read effects with `effectAt()`, caps with `levelCap()`.
- **Upgrade cost:** `round(base × growth^level × steepExtra)` in `game/money.ts`, levels above the cap ×`OVERCAP_GROWTH` per level, covered by tests.
- **Deterministic RNG.** All game randomness goes through `rand(state)` (state-held seed). `Math.random` is only allowed for visual and audio effects and for picking the seed of a new run (`main.ts`).
- **Transient objects** (coins, warnings, drones, timers, effects) are not saved.

## Saving

- `localStorage`, key `magnetic-field-save`, JSON with a `version` field (`save/save.ts`), currently version 6 (v2 added the Polarity Shift `meta`: Cores, shifts, Core tree; v3 added the Magnetron: Charge Crystals, Lodestones, pity counter; v4 added the Auto-shift target `meta.autoShift` and Void coins in the run stats; v5 added the Auto-buyer pause `meta.autoBuyOff`; v6 added lifetime stats `meta.life` and `stats.events` for the Stats screen).
- Loading is tolerant: only currency and levels are required, missing fields fall back to defaults, wrong types reject the save. A save that can't be read (corrupted or from a newer version) is copied to `magnetic-field-save-unreadable` before the game starts fresh, so autosave never destroys it; the player sees a banner.
- Every change to the saved shape = bump `CURRENT_VERSION` + a migration step in `save/migrations.ts` + a test. Never break old saves.
- Autosave every 30 s and on `visibilitychange`/`beforeunload`, only while a run is open (never from the title screen), and when leaving to the menu. Export/import as base64 text exists in `save/save.ts` (no UI yet).
- Settings (volumes, screen shake, tutorial tips and which tips were seen) live under their own key `magnetic-field-settings` (`save/settings.ts`, no version, tolerant parsing) – changing them needs no save bump, and New Game doesn't erase them.

## Conventions

- Everything in English: code, comments, docs and UI text. All player-facing strings live in `src/ui/strings.ts`.
- Small pure functions in `game/`; side effects (DOM, localStorage, time) only in `main.ts`/`ui/input.ts`, and the AudioContext only in `audio/synth.ts`.
- Counts and amounts shown to the player always go through `formatNumber`/`formatShort` before reaching a string in `ui/strings.ts`; seconds, percentages and multipliers use fixed precision (`toFixed`/`Math.round`).
- After logic or tuning changes run `npm test` (includes a balance guard: average bot reaches 1M in the first run in 12–16 min, target 14) and, for tuning, `npm run sim` at 250/400/600 and update DESIGN.md. After UI changes check the game in `npm run dev`.
