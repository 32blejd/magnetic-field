/* Debug URL params for testing (combine with &):
   ?reset=1     start a fresh run (clears the save)
   ?earned=N    start as if N coins were earned (unlocks + money)
   ?warm=N      fast-forward N seconds on load
   ?rare=1      boost Gold/Prism chances
   ?anti=1      boost anti-coin chance (needs earned ≥ 25000)
   ?nosave=1    don't load or write the save */
import { TIERS } from './data/tiers';
import { ANTI } from './data/tuning';

export interface DebugOptions {
  reset: boolean;
  noSave: boolean;
  earned: number;
  warm: number;
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
    warm: Number(p.get('warm')) || 0,
  };
}
