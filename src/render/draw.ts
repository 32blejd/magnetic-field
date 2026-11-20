/* Small canvas helpers shared by the renderers. */

export type Ctx = CanvasRenderingContext2D;

export function glow(ctx: Ctx, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
export const noGlow = (ctx: Ctx): void => { ctx.shadowBlur = 0; };

export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function easeOutBack(x: number): number {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

export function hexPath(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * Math.PI) / 3;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function starPath(ctx: Ctx, x: number, y: number, outer: number, inner: number, points: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points, r = i % 2 ? inner : outer;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
