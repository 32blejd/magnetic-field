import { describe, expect, it } from 'vitest';
import { coinValue, earnedShare, hasEarned } from '../src/game/money';
import { createState } from '../src/game/state';
import { formatNumber, formatShort, formatUpgradeValue } from '../src/ui/format';
import { S } from '../src/ui/strings';

describe('number formatting', () => {
  it('uses thousands separators and compact forms', () => {
    expect(formatNumber(4821.7)).toBe('4,821');
    expect(formatShort(9999)).toBe('9,999');
    expect(formatShort(12_500)).toBe('12.5k');
    expect(formatShort(4_560_000)).toBe('4.56M');
    expect(formatUpgradeValue('capacity', 48)).toBe('48 coins');
  });

  it('formats large counters in the HUD line', () => {
    expect(S.hudLine('3:12', 74, formatNumber(4821), formatNumber(1500)))
      .toBe('RUN 3:12   CATCH 74%   MISSED 4,821   BEST COMBO 1,500');
  });
});

describe('currency helpers', () => {
  it('compute coin value, thresholds and goal share', () => {
    const st = createState();
    st.totalEarned = 250_000;
    expect(coinValue(10, 3, 1.5)).toBe(45);
    expect(hasEarned(st, 250_000)).toBe(true);
    expect(hasEarned(st, 250_001)).toBe(false);
    expect(earnedShare(st, 1_000_000)).toBe(0.25);
    st.totalEarned = 2_000_000;
    expect(earnedShare(st, 1_000_000)).toBe(1);
  });
});
