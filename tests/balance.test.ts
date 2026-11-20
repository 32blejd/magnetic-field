import { describe, expect, it } from 'vitest';
import { runBot } from '../scripts/bot';

/* Guards the balance target: an average active player earns 1M in a run in about 20 minutes.
   If this fails after a tuning change, re-run `npm run sim` and update docs/DESIGN.md. */
describe('balance', () => {
  it('an average bot (400 px/s) earns 1M in 16–24 minutes', () => {
    const run = runBot(1, 400);
    const t = run.milestones[1e6];
    expect(t, 'never reached 1M').toBeDefined();
    expect(t! / 60).toBeGreaterThan(16);
    expect(t! / 60).toBeLessThan(24);
  }, 60_000);
});
