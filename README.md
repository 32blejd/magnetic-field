# Magnetic Field

A neon incremental browser game about one simple, active mechanic: **your cursor is a magnet**. Coins pop up on the board and drift toward the edges. Pull them in before they escape, spend what you collect on upgrades to the magnet itself, and grow from catching a coin here and there to a board that plays itself – then break the compass.

## How to play

- **Move the mouse over the board.** Coins inside the magnetic field get pulled in and collected; every coin that leaves the board is lost.
- **Buy upgrades** in the panel on the right, by clicking or with keys **1–7**. New upgrades unlock as you earn more.
- **Chain pickups** to build a combo multiplier.
- **Press SPACE or right-click** to fire a **Pulse**, which briefly triples your range.
- **Avoid the red anti-coins.** A warning marker shows where they'll appear; touching one short-circuits your magnet.
- **Watch for events** (Coin Burst, Fountain, later Meteor Shower) and complete **mini-goals** for instant cash.
- **Earn the run goal (1,000,000 coins at first) to Shift Polarity**: the run restarts and you get **Cores** to spend in the **Core tree** – bonuses, new coin types, helper magnets and automation.
- After the first shift, spend **Charge Crystals** in the **Magnetron** to collect 16 **Lodestones** (permanent coin-value bonuses).
- The Core tree grows from a 4-point compass into an 8- and a 16-point rose. Max it all and buy **Break the Compass** to see the ending – then keep playing in **endless** mode.

### Controls

| Key | Action |
|---|---|
| Mouse | move the magnet (over the board) · click buttons |
| 1–7 | buy the upgrade in that panel row (Shift = buy max, with the Bulk Buy node) |
| Space / right-click | Pulse |
| T | Core tree preview · P – Shift Polarity (when the goal is reached) |
| G | Magnetron |
| A / B | Auto-shift target / pause the Auto-buyer (once their nodes are owned) |
| Tab | Stats (this run, mini-goals, lifetime) |
| Esc | pause menu (resume, stats, settings, back to menu) · back / close |
| F11 | fullscreen |

### Coins

| Coin | Value | Notes |
|---|---|---|
| Basic (cyan) | ×1 | Most common |
| Gold | ×2 | Twice as fast, resists the pull a little |
| Prism (rainbow) | ×3 | Three times as fast, rare |
| Void (black hole) | ×10 | Very rare, needs a Core tree keystone |
| Anti (red) | – | Hazard: turns your magnet off for 1.5 s |

### Upgrades

| Upgrade | What it does |
|---|---|
| Value | Coins earned per pickup |
| Range | Radius of the magnetic field |
| Spawn rate | New coins per second |
| Strength | How fast coins fly into the magnet |
| Capacity | Max coins on the board at once |
| Rarity | Chance of Gold and Prism coins |
| Coin speed | Slows coins down |

Progress is saved automatically in your browser (every 30 s and when you leave). The whole game takes roughly 3–4 hours.

## Running locally

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm run dev        # start the dev server, then open the printed URL
```

Other commands:

```bash
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
npm test           # run the tests
npm run sim        # balance simulator: a bot plays a run and reports milestone times
```

With `npm run dev`, `/sounds.html` plays every sound effect (they are synthesized in code, no audio files).

## Tech

- TypeScript and Vite, with everything rendered on a single HTML canvas; sound effects synthesized with the Web Audio API
- Game logic is kept separate from rendering, so the same code runs the game, the tests and the balance bot
- Vitest for tests: formulas, simulation, Core tree, save/load and migrations, sound cues and a balance check

Game design notes and balance tables are in [docs/DESIGN.md](docs/DESIGN.md).
