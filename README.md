# Magnetic Field

A neon incremental browser game about one simple, active mechanic: **your cursor is a magnet**. Coins pop up on the board and drift toward the edges. Pull them in before they escape, spend what you collect on upgrades to the magnet itself, and grow from catching a coin here and there to sweeping the whole board.

## How to play

- **Move the mouse over the board.** Coins inside the magnetic field get pulled in and collected.
- **Catch coins before they leave the board.** Every coin that escapes is lost.
- **Buy upgrades** in the panel on the right, either by clicking or with keys **1–7**. New upgrades unlock as you earn more.
- **Chain pickups** to build a combo multiplier (up to ×2).
- **Press SPACE or right-click** to fire a **Pulse**, which briefly triples your range.
- **Avoid the red anti-coins.** A warning marker shows where they'll appear, and touching one short-circuits your magnet.
- **Watch for events**: a *Coin Burst* triples spawns, and a *Fountain* sprays a ring of coins.
- **Complete mini-goals**, such as catching 10 Gold coins or 3 Prism coins.
- **Earn 1,000,000 coins in a run** to reach Polarity Shift (prestige, coming soon).

### Coins

| Coin | Value | Notes |
|---|---|---|
| Basic (cyan) | ×1 | Most common |
| Gold | ×2 | Twice as fast, resists the pull a little |
| Prism (rainbow) | ×3 | Three times as fast, rare |
| Anti (red) | – | Hazard. Turns your magnet off for 1.5 s |

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

Progress is saved automatically in your browser.

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

## Tech

- TypeScript and Vite, with everything rendered on a single HTML canvas
- Game logic is kept separate from rendering, so the same code runs the game, the tests and the balance bot
- Vitest for tests: formulas, simulation, save/load and a balance check

Game design notes and balance tables are in [docs/DESIGN.md](docs/DESIGN.md).
