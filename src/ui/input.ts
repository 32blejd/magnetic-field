import { VIEW } from '../data/tuning';
import type { Vec } from '../game/types';

export interface InputHandlers {
  onMove(p: Vec): void;
  onLeave(): void;
  onDown(p: Vec): void;
  /** Left button released; `shift` = Shift key held (Bulk Buy). */
  onUp(p: Vec, shift: boolean): void;
  onWheel(p: Vec, deltaY: number): void;
  /** Right click. */
  onRightClick(): void;
  /** `code` is KeyboardEvent.code (e.g. "Space", "Digit3", "KeyT", "Escape"). Return true to prevent the default. */
  onKey(code: string, shift: boolean): boolean;
}

/** Wires mouse and keyboard to the handlers; positions are converted to logical view coordinates. */
export function setupInput(canvas: HTMLCanvasElement, h: InputHandlers): void {
  const toView = (e: MouseEvent): Vec => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * VIEW.w) / r.width, y: ((e.clientY - r.top) * VIEW.h) / r.height };
  };
  canvas.addEventListener('mousemove', e => h.onMove(toView(e)));
  canvas.addEventListener('mouseleave', () => h.onLeave());
  canvas.addEventListener('mousedown', e => { if (e.button === 0) h.onDown(toView(e)); });
  window.addEventListener('mouseup', e => { if (e.button === 0) h.onUp(toView(e), e.shiftKey); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); h.onWheel(toView(e), e.deltaY); }, { passive: false });
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); h.onRightClick(); });
  window.addEventListener('keydown', e => { if (h.onKey(e.code, e.shiftKey)) e.preventDefault(); });
}

/** Number key 1–7 (top row or numpad) → panel row 0–6, or -1. */
export function rowKey(code: string): number {
  const m = /^(?:Digit|Numpad)([1-7])$/.exec(code);
  return m ? Number(m[1]) - 1 : -1;
}
