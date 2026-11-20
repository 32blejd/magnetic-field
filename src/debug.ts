/* Debug URL params for testing (combine with &):
   ?reset=1     start a fresh run (clears the save)
   ?earned=N    start as if N coins were earned (unlocks + money; 1000000 = Polarity Shift ready)
   ?cores=N     set unspent Cores (Core tree testing)
   ?crystals=N  set Charge Crystals · ?shifts=N set completed shifts (?shifts=1 opens the Magnetron) · ?pulls=N pull N lodestones on load
   ?warm=N      fast-forward N seconds on load
   ?rare=1      boost Gold/Prism chances
   ?anti=1      boost anti-coin chance (needs earned ≥ 25000)
   ?open=shift  open the Core tree on load (shift = spend Cores, needs the goal earned; browse = preview; gacha = Magnetron)
   ?nosave=1    don't load or write the save */
import { TIERS } from './data/tiers';
import { ANTI } from './data/tuning';

export interface DebugOptions {
  reset: boolean;
  noSave: boolean;
  earned: number;
  cores: number;
  crystals: number;
  shifts: number;
  pulls: number;
  warm: number;
  open: 'shift' | 'browse' | 'gacha' | null;
}

export function readDebugOptions(search: string): DebugOptions {
  const p = new URLSearchParams(search);
  if (p.get('rare')) {
    TIERS[0]!.chance = 0.3;
    TIERS[1]!.chance = 0.35;
  }
  if (p.get('anti')) ANTI.chance = 0.3;
  return {
    reset: p.has('reset'),
    noSave: p.has('nosave'),
    earned: Number(p.get('earned')) || 0,
    cores: Number(p.get('cores')) || 0,
    crystals: Number(p.get('crystals')) || 0,
    shifts: Number(p.get('shifts')) || 0,
    pulls: Number(p.get('pulls')) || 0,
    warm: Number(p.get('warm')) || 0,
    open: (['shift', 'browse', 'gacha'] as const).find(o => o === p.get('open')) ?? null,
  };
}
