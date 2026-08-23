import { cssRgb, darken, lighten } from "@/lib/yarn-loom/color";
import { paintFrameOverlay } from "./frame";
import { paintGround } from "./ground";
import { markProgress } from "./timeline";
import type { Mark, ScreenParams } from "./types";

export interface ScreenRenderFrame {
  marks: Mark[];
  t: number;
  scaleX: number;
  scaleY: number;
  wetness: number;
}

export function paintPanelGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ScreenParams,
): void {
  paintGround(ctx, width, height, params);
}

export function paintPanelFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ScreenParams,
): void {
  paintFrameOverlay(ctx, width, height, params);
}

function drawWash(
  ctx: CanvasRenderingContext2D,
  m: Mark,
  p: number,
  sx: number,
  sy: number,
  wetness: number,
): void {
  if (p <= 0.001) return;
  const x = m.x0 * sx;
  const y = m.y0 * sy;
  const rot = Math.atan2(m.y1 - m.y0, m.x1 - m.x0);
  const rx = m.width * sx * (0.55 + p * 0.45);
  const ry = m.width * sy * (0.42 + p * 0.32);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = m.opacity * p;
  ctx.fillStyle = cssRgb(m.color);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  if (wetness > 0.08) {
    ctx.globalAlpha = m.opacity * 0.28 * p * wetness;
    ctx.fillStyle = cssRgb(lighten(m.color, 0.12));
    ctx.beginPath();
    ctx.ellipse(rx * 0.15, ry * 0.1, rx * (1.15 + wetness * 0.4), ry * (1.1 + wetness * 0.35), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  m: Mark,
  p: number,
  sx: number,
  sy: number,
  wetness: number,
): void {
  if (p <= 0.001) return;
  const x0 = m.x0 * sx;
  const y0 = m.y0 * sy;
  const x1 = x0 + (m.x1 - m.x0) * sx * p;
  const y1 = y0 + (m.y1 - m.y0) * sy * p;
  const floss = m.width * ((sx + sy) * 0.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = m.opacity;

  if (wetness > 0.55 && m.kind !== "filigree") {
    ctx.strokeStyle = cssRgb(m.color, 0.28);
    ctx.lineWidth = floss * (1.35 + wetness * 0.5);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  ctx.strokeStyle = cssRgb(darken(m.color, 0.08));
  ctx.lineWidth = floss;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.strokeStyle = cssRgb(m.color, 0.8);
  ctx.lineWidth = Math.max(0.35, floss * 0.62);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function renderMarks(
  ctx: CanvasRenderingContext2D,
  frame: ScreenRenderFrame,
): void {
  const { marks, t, scaleX, scaleY, wetness } = frame;
  for (const m of marks) {
    const p = markProgress(m, t);
    if (p <= 0) continue;
    if (m.kind === "wash") drawWash(ctx, m, p, scaleX, scaleY, wetness);
    else drawStroke(ctx, m, p, scaleX, scaleY, wetness);
  }
}

export function drawBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  scaleX: number,
  scaleY: number,
): void {
  const px = x * scaleX;
  const py = y * scaleY;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.fillStyle = "#2a2218";
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-4, 1.6);
  ctx.lineTo(-6.5, 0);
  ctx.lineTo(-4, -1.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d8b56a";
  ctx.fillRect(-10, -0.7, 5, 1.4);
  ctx.restore();
}
