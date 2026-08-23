import { paintGround } from "./ground";
import type { ScreenFrame, ScreenParams } from "./types";

const TAU = Math.PI * 2;

function aperturePath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: ScreenFrame,
): void {
  if (frame === "oval") {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const rx = width * 0.42;
    const ry = height * 0.4;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    return;
  }

  const m = frame === "stepped" ? Math.min(width, height) * 0.07 : 8;
  ctx.rect(m, m, width - m * 2, height - m * 2);
}

export function paintFrameOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ScreenParams,
): void {
  if (params.frame === "none") return;

  if (params.frame === "honeycomb") {
    paintHoneycombStrip(ctx, width, height);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  aperturePath(ctx, width, height, params.frame);
  ctx.clip("evenodd");
  paintGround(ctx, width, height, params);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  aperturePath(ctx, width, height, params.frame);
  if (params.frame === "oval") {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const rx = width * 0.42;
    const ry = height * 0.4;
    ctx.strokeStyle = "rgba(214, 176, 96, 0.88)";
    ctx.lineWidth = Math.max(2.4, Math.min(width, height) * 0.013);
    ctx.stroke();
    ctx.beginPath();
    const scallops = 72;
    for (let i = 0; i <= scallops; i++) {
      const t = (i / scallops) * TAU;
      const pulse = 1 + Math.sin(t * 10) * 0.012;
      const x = cx + Math.cos(t) * rx * pulse;
      const y = cy + Math.sin(t) * ry * pulse;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(236, 210, 140, 0.45)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(40, 28, 16, 0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  } else {
    paintSteppedBand(ctx, width, height);
  }
  ctx.restore();
}

function paintSteppedBand(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const m = Math.min(width, height) * 0.07;
  ctx.strokeStyle = "rgba(214, 176, 96, 0.7)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(m, m, width - m * 2, height - m * 2);
  ctx.strokeStyle = "rgba(70, 98, 140, 0.8)";
  ctx.lineWidth = 3.2;
  ctx.strokeRect(m + 5, m + 5, width - (m + 5) * 2, height - (m + 5) * 2);

  const step = 10;
  ctx.strokeStyle = "rgba(232, 228, 220, 0.72)";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  let x = m + 10;
  let y = m + 10;
  const right = width - m - 10;
  const bottom = height - m - 10;
  ctx.moveTo(x, y);
  while (x < right) {
    x = Math.min(right, x + step);
    ctx.lineTo(x, y);
    y += 4;
    ctx.lineTo(x, y);
    x = Math.min(right, x + step);
    ctx.lineTo(x, y);
    y -= 4;
    ctx.lineTo(x, y);
  }
  while (y < bottom) {
    y = Math.min(bottom, y + step);
    ctx.lineTo(x, y);
    x -= 4;
    ctx.lineTo(x, y);
    y = Math.min(bottom, y + step);
    ctx.lineTo(x, y);
    x += 4;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(168, 56, 52, 0.35)";
  const ice = 7;
  for (let ix = m + 12; ix < width - m - 12; ix += ice) {
    for (let iy = m + 8; iy < m + 18; iy += ice) {
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ix + ice * 0.6, iy + 2);
      ctx.lineTo(ix + ice * 0.2, iy + ice * 0.7);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function paintHoneycombStrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const band = Math.max(28, width * 0.11);
  ctx.fillStyle = "rgba(16, 13, 11, 0.72)";
  ctx.fillRect(0, 0, band, height);
  const r = 9;
  const dx = r * 1.75;
  const dy = r * 1.52;
  for (let row = 0, y = 10; y < height - 6; row++, y += dy) {
    const ox = row % 2 === 0 ? 8 : 8 + dx * 0.5;
    for (let x = ox; x < band - 6; x += dx) {
      hex(ctx, x, y, r, "rgba(214, 176, 96, 0.55)");
      ctx.fillStyle = "rgba(236, 228, 210, 0.82)";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const px = x + Math.cos(a) * 3.1;
        const py = y + Math.sin(a) * 3.1;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(168, 42, 42, 0.85)";
      ctx.beginPath();
      ctx.arc(x, y, 1.15, 0, TAU);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(214, 176, 96, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(band, 0);
  ctx.lineTo(band, height);
  ctx.stroke();
}

function hex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stroke: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}
