import { describe, expect, it } from 'vitest';
import { coinValue, earnedShare, hasEarned } from '../src/game/money';
import { createState } from '../src/game/state';
import { formatDuration, formatNumber, formatShort, formatUpgradeValue } from '../src/ui/format';
import { clientToView } from '../src/ui/input';
import { STATS_TEXT } from '../src/ui/strings';

describe('number formatting', () => {
  it('uses thousands separators and compact forms', () => {
    expect(formatNumber(4821.7)).toBe('4,821');
    expect(formatShort(9999)).toBe('9,999');
    expect(formatShort(12_500)).toBe('12.5k');
    expect(formatShort(4_560_000)).toBe('4.56M');
    expect(formatUpgradeValue('capacity', 48)).toBe('48 coins');
  });

  it('formats long play times for the Stats screen', () => {
    expect(formatDuration(59)).toBe('0 min');
    expect(formatDuration(14 * 60 + 5)).toBe('14 min');
    expect(formatDuration(2 * 3600 + 14 * 60)).toBe('2 h 14 min');
    expect(STATS_TEXT.goalsDone(formatNumber(5), formatNumber(12))).toBe('5 of 12 done');
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

describe('mouse mapping', () => {
  it('maps client pixels to view coordinates, also when the picture is letterboxed', () => {
    expect(clientToView(960, 540, { left: 0, top: 0, width: 1920, height: 1080 })).toEqual({ x: 480, y: 270 });
    // 1920×900 box: the 16:9 picture is 1600 wide, centered with 160 px bars on each side
    expect(clientToView(160, 0, { left: 0, top: 0, width: 1920, height: 900 })).toEqual({ x: 0, y: 0 });
    expect(clientToView(1760, 900, { left: 0, top: 0, width: 1920, height: 900 })).toEqual({ x: 960, y: 540 });
    expect(clientToView(110, 70, { left: 10, top: 20, width: 960, height: 1000 })).toEqual({ x: 100, y: -180 });
  });
});
