# Magnetic Field

An incremental game built around a single active mechanic: the player steers a magnet with the cursor across a board and pulls in coins. Upgrades modify the parameters of that mechanic (range, strength, value, spawn rate…); automation and prestige come later.

Full game outline, numbers, balance and milestones: [docs/DESIGN.md](docs/DESIGN.md). Before adding a new mechanic, check that it is in scope for the current milestone, and keep DESIGN.md in sync with any tuning change.

## Stack

- TypeScript (strict) + Vite
- Everything is drawn on one 2D `<canvas>` (board, HUD, panel) in a 960×540 logical view, scaled to the window
- Tests: Vitest. Balance simulator: `tsx`
- Numbers: plain `number` for now. All currency operations live in `src/game/money.ts`, so a possible switch to `break_eternity.js` touches one place only

## Commands

```
npm run dev        # dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the build
npm test           # tests (Vitest, via scripts/vitest.mjs – see below)
npm run typecheck  # tsc only
npm run sim -- [cursorSpeed=400] [runs=3]   # balance simulator (bot plays the real logic)
```

`npm test` goes through `scripts/vitest.mjs`, which upper-cases the drive letter of the working directory first. On Windows a `c:\…` cwd (e.g. a VS Code terminal) makes Vitest load itself twice and every test fails with "Cannot read properties of undefined (reading 'config')". Don't call `vitest` directly.

Debug URL params (dev or preview): `?nosave=1`, `?reset=1`, `?earned=N`, `?warm=N`, `?rare=1`, `?anti=1` – see `src/debug.ts`.

## Structure

```
src/
  data/      # tuning constants, upgrades, coin tiers, goals – pure data, no logic
  game/      # state, simulation step, derived stats, money, abilities, goals – pure logic
  save/      # save/load, versioning, migrations
  render/    # canvas drawing (board, HUD, panel, prestige bar) and visual-only effects
  ui/        # layout rects, input, number formatting, all UI strings
  debug.ts   # debug URL params
  main.ts    # wires everything together, game loop
scripts/     # bot + balance simulator, Vitest launcher
tests/       # Vitest tests (formulas, simulation, goals, save, balance)
docs/        # DESIGN.md; docs/mockups/ = the old single-file JS prototype (reference only)
```

## Architecture rules

- **Logic does not depend on rendering.** `game/` and `data/` import nothing from `render/` or `ui/`. The simulation runs in tests and in the bot without a browser.
- **Fixed simulation step.** `step(state, STEP, magnet, events)` runs at 1/60 s with an accumulator; rendering via `requestAnimationFrame` only draws. Never tie logic to frame rate.
- **Events out, not callbacks.** `step` pushes `GameEvent`s (pickup, miss, unlock, goal…); `render/effects.ts` turns them into particles, banners etc. Visual-only state never feeds back into the game.
- **Single source of truth.** `GameState` holds primary data; magnet parameters are derived by `getStats(state)` – never store them.
- **Data-driven upgrades.** A new upgrade = an entry in `src/data/upgrades.ts` + its text in `ui/strings.ts` + its format in `ui/format.ts`. Effects are written in terms of `level / max` so caps can change without changing the value at max.
- **Upgrade cost:** `round(base × growth^level × steepExtra)` in `game/money.ts`, covered by tests.
- **Deterministic RNG.** All game randomness goes through `rand(state)` (state-held seed). `Math.random` is only allowed for visual effects.
- **Transient objects** (coins, warnings, timers, effects) are not saved.

## Saving

- `localStorage`, key `magnetic-field-save`, JSON with a `version` field (`save/save.ts`).
- Every change to the saved shape = bump `CURRENT_VERSION` + a migration step in `save/migrations.ts` + a test. Never break old saves.
- Autosave every 30 s and on `visibilitychange`/`beforeunload`. Export/import as base64 text exists in `save/save.ts` (no UI yet).

## Conventions

- Everything in English: code, comments, docs and UI text. All player-facing strings live in `src/ui/strings.ts`.
- Small pure functions in `game/`; side effects (DOM, localStorage, time) only in `main.ts`/`ui/input.ts`.
- Numbers shown in the UI always go through `formatNumber`/`formatShort`, never raw `toString()`.
- After logic or tuning changes run `npm test` (includes a balance guard: average bot reaches 1M in 16–24 min) and, for tuning, `npm run sim` at 250/400/600 and update DESIGN.md. After UI changes check the game in `npm run dev`.
