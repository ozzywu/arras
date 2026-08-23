import { cssRgb, darken, lighten } from "./color";
import { stitchProgress } from "./timeline";
import type { Stitch } from "./types";

export interface RenderFrame {
  stitches: Stitch[];
  t: number;
  thickness: number;
  lightAngle: number;
  scaleX: number;
  scaleY: number;
  originX?: number;
  originY?: number;
}

export interface Needle {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

function drawStitch(
  ctx: CanvasRenderingContext2D,
  s: Stitch,
  p: number,
  thickness: number,
  lightAngle: number,
  sx: number,
  sy: number,
  ox: number,
  oy: number,
): void {
  if (p <= 0.001) return;
  const weight = s.weight ?? 1;
  const floss = thickness * weight;
  const x0 = (s.x0 + ox) * sx;
  const y0 = (s.y0 + oy) * sy;
  const x1 = x0 + (s.x1 - s.x0) * sx * p;
  const y1 = y0 + (s.y1 - s.y0) * sy * p;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const lx = Math.cos(lightAngle);
  const ly = Math.sin(lightAngle);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const facing = nx * lx + ny * ly;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(40, 28, 16, 0.32)";
  ctx.lineWidth = floss + 0.7 * weight;
  ctx.beginPath();
  ctx.moveTo(x0 + lx * 0.55, y0 + ly * 0.7);
  ctx.lineTo(x1 + lx * 0.55, y1 + ly * 0.7);
  ctx.stroke();

  ctx.strokeStyle = cssRgb(darken(s.color, 0.18));
  ctx.lineWidth = floss;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.strokeStyle = cssRgb(s.color);
  ctx.lineWidth = Math.max(0.45, floss * 0.72);
  ctx.beginPath();
  ctx.moveTo(x0 - nx * 0.25, y0 - ny * 0.25);
  ctx.lineTo(x1 - nx * 0.25, y1 - ny * 0.25);
  ctx.stroke();

  if (facing > 0.05 && weight > 0.45) {
    ctx.strokeStyle = cssRgb(lighten(s.color, 0.45), 0.55 + facing * 0.3);
    ctx.lineWidth = Math.max(0.35, floss * 0.28);
    ctx.beginPath();
    ctx.moveTo(x0 - nx * 0.45, y0 - ny * 0.45);
    ctx.lineTo(x1 - nx * 0.45, y1 - ny * 0.45);
    ctx.stroke();
  }
}

export function collectNeedles(stitches: Stitch[], t: number, limit = 3): Needle[] {
  const growing: { s: Stitch; p: number }[] = [];
  for (const s of stitches) {
    const p = stitchProgress(s, t);
    if (p > 0.02 && p < 0.98) growing.push({ s, p });
  }
  growing.sort((a, b) => b.p - a.p);
  return growing.slice(0, limit).map(({ s, p }) => {
    const x = s.x0 + (s.x1 - s.x0) * p;
    const y = s.y0 + (s.y1 - s.y0) * p;
    return { x, y, dx: s.x1 - s.x0, dy: s.y1 - s.y0 };
  });
}

export function renderStitches(
  ctx: CanvasRenderingContext2D,
  frame: RenderFrame,
): Needle[] {
  const { stitches, t, thickness, lightAngle, scaleX, scaleY } = frame;
  const ox = frame.originX ?? 0;
  const oy = frame.originY ?? 0;
  for (const s of stitches) {
    const p = stitchProgress(s, t);
    if (p <= 0) continue;
    drawStitch(ctx, s, p, thickness, lightAngle, scaleX, scaleY, ox, oy);
  }
  return collectNeedles(stitches, t);
}

export function drawNeedle(
  ctx: CanvasRenderingContext2D,
  needle: Needle,
  scaleX: number,
  scaleY: number,
  originX = 0,
  originY = 0,
): void {
  const x = (needle.x + originX) * scaleX;
  const y = (needle.y + originY) * scaleY;
  const ang = Math.atan2(needle.dy, needle.dx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = "#c5cdd6";
  ctx.strokeStyle = "rgba(40,40,50,0.45)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-3.5, 1.4);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-3.5, -1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(1.5, -0.4, 2.2, 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMotes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
): void {
  ctx.fillStyle = "rgba(255, 248, 230, 0.35)";
  for (let i = 0; i < 18; i++) {
    const px = (((i * 97 + t * 40) % 100) / 100) * width;
    const py = (((i * 53 + Math.sin(t * 2 + i) * 8) % 100) / 100) * height;
    ctx.beginPath();
    ctx.arc(px, py, 0.7 + (i % 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
