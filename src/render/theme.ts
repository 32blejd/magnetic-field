import type { TierId } from '../data/tiers';

export const FONT = 'Consolas, "Courier New", monospace';

export const COLORS = {
  bg: '#04050c',
  board: '#070a1a',
  panel: '#080c1e',
  cyan: '#00f0ff',
  magenta: '#ff2bd6',
  pink: '#ff6be3',
  red: '#ff3355',
  amber: '#ffc21a',
  text: '#e6fbff',
  sub: '#5f9bb3',
} as const;

/** Tier color; Prism cycles through hues over time. */
export function tierColor(tier: TierId, t: number, phase = 0): string {
  switch (tier) {
    case 'gold': return COLORS.amber;
    case 'prism': return `hsl(${(t * 220 + phase * 60) % 360}, 100%, 62%)`;
    case 'anti': return COLORS.red;
    case 'basic': return COLORS.cyan;
  }
}
