import type { UpgradeId } from '../data/upgrades';

/** Whole number with thousands separators. Every number shown in the UI goes through here or formatShort. */
export const formatNumber = (n: number): string => Math.floor(n).toLocaleString('en-US');

/** Compact form for tight spots: 12.3k, 4.56M. */
export function formatShort(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  return formatNumber(n);
}

export const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function formatUpgradeValue(id: UpgradeId, v: number): string {
  switch (id) {
    case 'value': return `${formatNumber(v)} / coin`;
    case 'range': return `${Math.round(v)} px`;
    case 'spawn': return `${v.toFixed(2)} /s`;
    case 'strength': return `${v.toFixed(2)}×`;
    case 'capacity': return `${formatNumber(v)} coins`;
    case 'rarity': return `+${(v * 100).toFixed(1)}%`;
    case 'speed': return `${v.toFixed(2)} s`;
  }
}
