import { describe, expect, it } from 'vitest';
import { UPGRADE_BY_ID, UPGRADES } from '../src/data/upgrades';
import { costOf } from '../src/game/money';

const atMax = (id: keyof typeof UPGRADE_BY_ID) => UPGRADE_BY_ID[id].fx(UPGRADE_BY_ID[id].max);

describe('upgrade effects', () => {
  it('keep their designed values at max level', () => {
    expect(atMax('value')).toBe(344);
    expect(atMax('range')).toBe(130);
    expect(atMax('spawn')).toBeCloseTo(13.74, 2);
    expect(atMax('strength')).toBeCloseTo(8.18, 2);
    expect(atMax('capacity')).toBe(48);
    expect(atMax('rarity')).toBeCloseTo(0.05);
    expect(atMax('speed')).toBeCloseTo(3.6, 1);
  });

  it('improve with every level', () => {
    for (const u of UPGRADES) {
      for (let l = 1; l <= u.max; l++) expect(u.fx(l), `${u.id} level ${l}`).toBeGreaterThan(u.fx(l - 1));
    }
  });

  it('have the agreed caps and panel order', () => {
    expect(UPGRADES.map(u => [u.id, u.max])).toEqual([
      ['value', 30], ['range', 20], ['spawn', 20], ['strength', 15], ['capacity', 15], ['rarity', 10], ['speed', 10],
    ]);
  });
});

describe('upgrade costs', () => {
  it('start at the base cost and always grow', () => {
    for (const u of UPGRADES) {
      expect(costOf(u, 0)).toBe(u.base);
      for (let l = 1; l < u.max; l++) expect(costOf(u, l)).toBeGreaterThan(costOf(u, l - 1));
    }
  });

  it('get much steeper for the last Rarity levels', () => {
    const r = UPGRADE_BY_ID.rarity;
    expect([7, 8, 9].map(l => costOf(r, l))).toEqual([24944, 109752, 482908]);
  });
});
