import { describe, expect, it } from 'vitest';
import { runBot } from '../scripts/bot';

/* Guards the balance target: an average active player earns 1M in the first run in about 14 minutes.
   If this fails after a tuning change, re-run `npm run sim` and update docs/DESIGN.md. */
describe('balance', () => {
  it('an average bot (400 px/s) earns 1M in the first run in 12–16 minutes (target 14)', () => {
    const run = runBot(1, 400);
    const t = run.milestones[1e6];
    expect(t, 'never reached 1M').toBeDefined();
    expect(t! / 60).toBeGreaterThan(12);
    expect(t! / 60).toBeLessThan(16);
  }, 60_000);
});
