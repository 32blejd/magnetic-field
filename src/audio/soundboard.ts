/* Dev page sounds.html: a button for every sound effect, to tune them by ear. Not part of the game build. */
import { SOUND_IDS, comboPitch, nodeCue, revealCues, type SoundId } from './cues';
import { Synth } from './synth';

const synth = new Synth();
const vol = document.getElementById('vol') as HTMLInputElement;
const combo = document.getElementById('combo') as HTMLInputElement;
const comboVal = document.getElementById('comboVal')!;
synth.setVolume(Number(vol.value));
vol.addEventListener('input', () => synth.setVolume(Number(vol.value)));
combo.addEventListener('input', () => { comboVal.textContent = combo.value; });

const GROUPS: [string, (id: SoundId) => boolean][] = [
  ['COINS – PICKUP (pitch follows the combo slider)', id => id.startsWith('pickup') || id === 'bounty'],
  ['COINS – SPAWN, ANTI-COINS, MISS', id => id.startsWith('spawn') || ['warning', 'antiHit', 'miss'].includes(id)],
  ['PANEL & ACTIONS', id => ['buy', 'buyFail', 'buyMax', 'autoBuy', 'unlock', 'pulse', 'autoPulse'].includes(id)],
  ['EVENTS & REWARDS', id => ['burst', 'fountain', 'meteor', 'goal', 'crystal', 'chain', 'shield', 'interest'].includes(id)],
  ['CORE TREE, SHIFTS, MAGNETRON', id => ['nodeBuy', 'nodeRefund', 'treeReset', 'shiftStart', 'autoShift', 'pull'].includes(id) || id.startsWith('reveal')],
  ['MENUS & ENDING', id => ['uiClick', 'ending'].includes(id)],
];

const root = document.getElementById('groups')!;
for (const [title, match] of GROUPS) {
  const h = document.createElement('h2'); h.textContent = title; root.append(h);
  const grid = document.createElement('div'); grid.className = 'grid'; root.append(grid);
  for (const id of SOUND_IDS.filter(match)) {
    const b = document.createElement('button');
    b.textContent = id;
    b.onclick = () => { synth.unlock(); synth.play(id.startsWith('pickup') ? { id, pitch: comboPitch(Number(combo.value)) } : { id }); };
    grid.append(b);
  }
}
// combinations as the game plays them
const extra = document.createElement('h2'); extra.textContent = 'AS IN THE GAME'; root.append(extra);
const grid = document.createElement('div'); grid.className = 'grid'; root.append(grid);
const combos: [string, () => void][] = [
  ['node buy · stage 1 → 4', () => [1, 2, 3, 4].forEach((s, i) => synth.play({ ...nodeCue(s), delay: i * 0.4 }))],
  ['×10 pull with a Legendary', () => {
    synth.play({ id: 'pull' });
    for (const c of revealCues(['common', 'rare', 'common', 'epic', 'common', 'rare', 'common', 'common', 'legendary', 'rare'], 0.12)) synth.play(c);
  }],
  ['combo 0 → 24 pickups', () => { for (let k = 0; k <= 24; k += 2) synth.play({ id: 'pickupBasic', pitch: comboPitch(k), delay: k * 0.05 }); }],
];
for (const [label, fn] of combos) {
  const b = document.createElement('button'); b.textContent = label; b.onclick = () => { synth.unlock(); fn(); }; grid.append(b);
}
