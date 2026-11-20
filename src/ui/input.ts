import { VIEW } from '../data/tuning';
import type { Vec } from '../game/types';

export interface InputHandlers {
  onMove(p: Vec): void;
  onLeave(): void;
  onClick(p: Vec): void;
  onPulse(): void;
  /** Number key 1–7 → panel row 0–6. */
  onRowKey(row: number): void;
}

/** Wires mouse and keyboard to the handlers; positions are converted to logical view coordinates. */
export function setupInput(canvas: HTMLCanvasElement, h: InputHandlers): void {
  const toView = (e: MouseEvent): Vec => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * VIEW.w) / r.width, y: ((e.clientY - r.top) * VIEW.h) / r.height };
  };
  canvas.addEventListener('mousemove', e => h.onMove(toView(e)));
  canvas.addEventListener('mouseleave', () => h.onLeave());
  canvas.addEventListener('click', e => h.onClick(toView(e)));
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); h.onPulse(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); h.onPulse(); return; }
    const m = /^(?:Digit|Numpad)([1-7])$/.exec(e.code);
    if (m) h.onRowKey(Number(m[1]) - 1);
  });
}
