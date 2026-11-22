/* Rects of the title screen, New Game confirm, pause menu and settings (mockup: docs/mockups/menu.html). */
import type { VolumeId } from '../save/settings';
import { PANEL, type Rect } from './layout';

export type TitleAction = 'continue' | 'new' | 'settings';

/** Title buttons, left-aligned under the logo. CONTINUE (taller, with a summary line) only when there is a run to continue. */
export function titleButtons(hasRun: boolean): { action: TitleAction; rect: Rect }[] {
  const out: { action: TitleAction; rect: Rect }[] = [];
  let y = 262;
  if (hasRun) { out.push({ action: 'continue', rect: { x: 560, y, w: 300, h: 50 } }); y += 62; }
  out.push({ action: 'new', rect: { x: 560, y, w: 300, h: 40 } }); y += 52;
  out.push({ action: 'settings', rect: { x: 560, y, w: 300, h: 40 } });
  return out;
}

/** "Start a new game?" dialog over the title screen. */
export const NEWGAME_BOX: Rect = { x: 270, y: 140, w: 420, h: 230 };
export const NEWGAME_ERASE: Rect = { x: NEWGAME_BOX.x + 30, y: NEWGAME_BOX.y + NEWGAME_BOX.h - 64, w: 170, h: 38 };
export const NEWGAME_CANCEL: Rect = { x: NEWGAME_BOX.x + NEWGAME_BOX.w - 200, y: NEWGAME_ERASE.y, w: 170, h: 38 };

/** ⚙ button – top-right corner of the upgrade panel header. */
export const GEAR_BUTTON: Rect = { x: PANEL.x + PANEL.w - 34, y: PANEL.y + 10, w: 24, h: 24 };

export type PauseAction = 'resume' | 'stats' | 'settings' | 'menu';
export const PAUSE_BOX: Rect = { x: 330, y: 96, w: 300, h: 344 };
export const PAUSE_BUTTONS: { action: PauseAction; rect: Rect }[] = (['resume', 'stats', 'settings', 'menu'] as const).map((action, i) => ({
  action, rect: { x: PAUSE_BOX.x + 30, y: PAUSE_BOX.y + 86 + i * 54, w: PAUSE_BOX.w - 60, h: 42 },
}));

/** Stats screen. */
export const STATS_BOX: Rect = { x: 70, y: 40, w: 820, h: 460 };

/** Ending screen button. */
export const ENDING_BUTTON: Rect = { x: 960 / 2 - 140, y: 440, w: 280, h: 44 };

export const SETTINGS_BOX: Rect = { x: 230, y: 50, w: 500, h: 440 };
const SX = SETTINGS_BOX.x + 40;
/** Left edge of the setting labels. */
export const SETTINGS_LABEL_X = SX;
/** Slider rows: center line y and the track. */
export const SLIDERS: { id: VolumeId; y: number; track: Rect }[] = (['master', 'music', 'effects'] as const).map((id, i) => {
  const y = SETTINGS_BOX.y + 110 + i * 35;
  return { id, y, track: { x: SX + 170, y: y - 3, w: 200, h: 6 } };
});
/** Clickable area of a slider: the track plus room for the knob. */
export const sliderHit = (track: Rect): Rect => ({ x: track.x - 10, y: track.y - 9, w: track.w + 20, h: track.h + 18 });
/** Slider value 0–1 from a pointer x. */
export const sliderValue = (track: Rect, x: number): number => Math.min(1, Math.max(0, (x - track.x) / track.w));

export type ToggleId = 'screenShake' | 'fullscreen' | 'tips';
/** Toggle rows: center line y, the switch and the clickable row (label + switch + ON/OFF). */
export const TOGGLES: { id: ToggleId; y: number; knob: Rect; hit: Rect }[] = (['screenShake', 'fullscreen', 'tips'] as const).map((id, i) => {
  const y = SETTINGS_BOX.y + 256 + i * 35;
  return { id, y, knob: { x: SX + 170, y: y - 10, w: 44, h: 20 }, hit: { x: SX - 6, y: y - 13, w: 290, h: 26 } };
});
export const SETTINGS_BACK: Rect = { x: SETTINGS_BOX.x + SETTINGS_BOX.w / 2 - 110, y: SETTINGS_BOX.y + SETTINGS_BOX.h - 62, w: 220, h: 38 };
