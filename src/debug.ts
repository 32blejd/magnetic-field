/* Debug URL params for testing (combine with &):
   ?reset=1     start a fresh run (clears the save)
   ?earned=N    start as if N coins were earned (unlocks + money; 1000000 = Polarity Shift ready)
   ?cores=N     set unspent Cores (Core tree testing)
   ?crystals=N  set Charge Crystals · ?shifts=N set completed shifts (?shifts=1 opens the Magnetron) · ?pulls=N pull N lodestones on load
   ?warm=N      fast-forward N seconds on load
   ?speed=N     run the game clock N× faster (1–50, e.g. 4 = a whole first run in ~3.5 min)
   ?rare=1      boost Gold/Prism chances (and Void, if its keystone is owned)
   ?anti=1      boost anti-coin chance (needs earned ≥ 25000)
   ?open=shift  open the Core tree on load (shift = spend Cores, needs the goal earned; browse = preview; gacha = Magnetron;
                ending = the ending screen)
   ?nodes=…     own Core tree nodes: comma-separated ids with an optional level (Nkey:3,Wb2), "stage1"/"stage2"/"stage3" for every
                node up to that stage maxed (opens the next one), or "all" for every node maxed (incl. Break the Compass = endless)
   ?nosave=1    don't load or write the save
   Any of these params skips the title screen and starts the run right away. */
import { NODES, NODE_BY_ID } from './data/prestige';
import { TIERS, VOID_TIER } from './data/tiers';
import { ANTI } from './data/tuning';

/** Params listed above; any of them in the URL skips the title screen. */
export const DEBUG_PARAMS = ['reset', 'nosave', 'earned', 'cores', 'crystals', 'shifts', 'pulls', 'warm', 'speed', 'rare', 'anti', 'open', 'nodes'] as const;

export interface DebugOptions {
  /** A debug param is present: start the run directly, without the title screen. */
  skipTitle: boolean;
  reset: boolean;
  noSave: boolean;
  earned: number;
  cores: number;
  crystals: number;
  shifts: number;
  pulls: number;
  warm: number;
  /** Game clock multiplier (1 = normal). */
  speed: number;
  open: 'shift' | 'browse' | 'gacha' | 'ending' | null;
  /** Node levels to set, or null. */
  nodes: Record<string, number> | null;
}

/** "all" → every node at max; "stage2" → every node of stages 1–2 at max; otherwise "Nkey:3,Wb2" → { Nkey: 3, Wb2: 1 }
    (unknown ids skipped, levels clamped). */
export function parseNodes(value: string | null): Record<string, number> | null {
  if (!value) return null;
  const out: Record<string, number> = {};
  const upTo = value === 'all' ? 4 : /^stage[1-3]$/.test(value) ? Number(value.slice(5)) : 0;
  if (upTo) {
    for (const n of NODES) if (n.id !== 'core' && n.stage <= upTo) out[n.id] = n.max;
    return out;
  }
  for (const part of value.split(',')) {
    const [id = '', lv] = part.split(':');
    const def = NODE_BY_ID[id.trim()];
    if (!def || def.id === 'core') continue;
    out[def.id] = Math.max(1, Math.min(def.max, Math.floor(Number(lv ?? 1)) || 1));
  }
  return out;
}

export function readDebugOptions(search: string): DebugOptions {
  const p = new URLSearchParams(search);
  if (p.get('rare')) {
    TIERS[0]!.chance = 0.3;
    TIERS[1]!.chance = 0.35;
    VOID_TIER.chance = 0.15;
  }
  if (p.get('anti')) ANTI.chance = 0.3;
  return {
    skipTitle: DEBUG_PARAMS.some(k => p.has(k)),
    reset: p.has('reset'),
    noSave: p.has('nosave'),
    earned: Number(p.get('earned')) || 0,
    cores: Number(p.get('cores')) || 0,
    crystals: Number(p.get('crystals')) || 0,
    shifts: Number(p.get('shifts')) || 0,
    pulls: Number(p.get('pulls')) || 0,
    warm: Number(p.get('warm')) || 0,
    speed: Math.min(50, Math.max(1, Number(p.get('speed')) || 1)),
    open: (['shift', 'browse', 'gacha', 'ending'] as const).find(o => o === p.get('open')) ?? null,
    nodes: parseNodes(p.get('nodes')),
  };
}
