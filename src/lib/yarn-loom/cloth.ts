import type { CSSProperties } from "react";
import { CLOTH, LINEN, type GroundMode } from "./types";
import { createRng } from "./rng";

export type ClothKind = Exclude<GroundMode, "site">;

function paintHessian(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
): void {
  ctx.fillStyle = CLOTH.base;
  ctx.fillRect(0, 0, width, height);

  const warp = 3.1;
  const weft = 3.4;

  ctx.lineCap = "butt";
  ctx.strokeStyle = CLOTH.warp;
  ctx.lineWidth = 1;
  for (let x = 0; x < width + 4; x += warp) {
    ctx.beginPath();
    const wobble = (rng() - 0.5) * 0.8;
    ctx.moveTo(x + wobble, -2);
    for (let y = 0; y < height; y += 18) {
      ctx.lineTo(x + wobble + Math.sin(y * 0.04 + rng()) * 0.35, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = CLOTH.weft;
  ctx.lineWidth = 1.1;
  for (let y = 0; y < height + 4; y += weft) {
    ctx.beginPath();
    const wobble = (rng() - 0.5) * 0.6;
    ctx.moveTo(-2, y + wobble);
    for (let x = 0; x < width; x += 22) {
      ctx.lineTo(x, y + wobble + Math.sin(x * 0.03) * 0.3);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = CLOTH.slub;
  ctx.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const horizontal = rng() > 0.45;
    ctx.lineWidth = 1.4 + rng() * 2.2;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + rng() * 18, y + (rng() - 0.5) * 2);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2, y + 6 + rng() * 16);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(90, 72, 48, 0.22)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 140; i++) {
    const x = rng() * width;
    const y = rng() * height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 7, y + (rng() - 0.5) * 7);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    width * 0.2,
    width * 0.5,
    height * 0.5,
    width * 0.78,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, CLOTH.shadow);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function wrapStroke(
  ctx: CanvasRenderingContext2D,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const pad = 10;
  const ox = x0 < pad || x1 < pad ? size : x0 > size - pad || x1 > size - pad ? -size : 0;
  const oy = y0 < pad || y1 < pad ? size : y0 > size - pad || y1 > size - pad ? -size : 0;
  if (ox || oy) {
    ctx.beginPath();
    ctx.moveTo(x0 + ox, y0 + oy);
    ctx.lineTo(x1 + ox, y1 + oy);
    ctx.stroke();
  }
}

/** Tileable white linen. Same weave the site background should use. */
export function paintLinenTile(
  ctx: CanvasRenderingContext2D,
  size: number,
  seed = 11,
): void {
  const rng = createRng(seed);
  ctx.fillStyle = LINEN.base;
  ctx.fillRect(0, 0, size, size);

  const warp = 2.15;
  const weft = 2.35;

  ctx.lineCap = "butt";
  ctx.strokeStyle = LINEN.warp;
  ctx.lineWidth = 0.85;
  for (let x = 0; x < size; x += warp) {
    const wobble = Math.sin(x * 0.31) * 0.28;
    ctx.beginPath();
    ctx.moveTo(x + wobble, 0);
    for (let y = 0; y <= size; y += 12) {
      ctx.lineTo(
        x + wobble + Math.sin((y / size) * Math.PI * 4 + x * 0.08) * 0.32,
        y,
      );
    }
    ctx.stroke();
  }

  ctx.strokeStyle = LINEN.weft;
  ctx.lineWidth = 0.95;
  for (let y = 0; y < size; y += weft) {
    const wobble = Math.cos(y * 0.27) * 0.22;
    ctx.beginPath();
    ctx.moveTo(0, y + wobble);
    for (let x = 0; x <= size; x += 14) {
      ctx.lineTo(
        x,
        y + wobble + Math.sin((x / size) * Math.PI * 4 + y * 0.07) * 0.28,
      );
    }
    ctx.stroke();
  }

  ctx.lineCap = "round";
  ctx.strokeStyle = LINEN.slub;
  for (let i = 0; i < 48; i++) {
    const x = rng() * size;
    const y = rng() * size;
    ctx.lineWidth = 0.8 + rng() * 1.4;
    if (rng() > 0.5) {
      wrapStroke(ctx, size, x, y, x + 6 + rng() * 12, y + (rng() - 0.5) * 1.6);
    } else {
      wrapStroke(ctx, size, x, y, x + (rng() - 0.5) * 1.6, y + 5 + rng() * 11);
    }
  }

  ctx.strokeStyle = LINEN.fiber;
  ctx.lineWidth = 0.45;
  for (let i = 0; i < 70; i++) {
    const x = rng() * size;
    const y = rng() * size;
    wrapStroke(
      ctx,
      size,
      x,
      y,
      x + (rng() - 0.5) * 6,
      y + (rng() - 0.5) * 6,
    );
  }
}

function paintLinenPatch(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
): void {
  ctx.fillStyle = LINEN.base;
  ctx.fillRect(0, 0, width, height);

  const warp = 2.15;
  const weft = 2.35;

  ctx.lineCap = "butt";
  ctx.strokeStyle = LINEN.warp;
  ctx.lineWidth = 0.85;
  for (let x = 0; x < width + 4; x += warp) {
    const wobble = (rng() - 0.5) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + wobble, -2);
    for (let y = 0; y < height; y += 16) {
      ctx.lineTo(x + wobble + Math.sin(y * 0.05) * 0.3, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = LINEN.weft;
  ctx.lineWidth = 0.95;
  for (let y = 0; y < height + 4; y += weft) {
    const wobble = (rng() - 0.5) * 0.35;
    ctx.beginPath();
    ctx.moveTo(-2, y + wobble);
    for (let x = 0; x < width; x += 18) {
      ctx.lineTo(x, y + wobble + Math.sin(x * 0.04) * 0.26);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = LINEN.slub;
  ctx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = rng() * width;
    const y = rng() * height;
    ctx.lineWidth = 0.8 + rng() * 1.6;
    ctx.beginPath();
    if (rng() > 0.5) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 + rng() * 14, y + (rng() - 0.5) * 1.8);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 1.8, y + 5 + rng() * 12);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = LINEN.fiber;
  ctx.lineWidth = 0.45;
  for (let i = 0; i < 110; i++) {
    const x = rng() * width;
    const y = rng() * height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 6, y + (rng() - 0.5) * 6);
    ctx.stroke();
  }
}

/** Paint hessian or white linen into a hoop. Site ground skips this. */
export function paintCloth(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed = 11,
  kind: ClothKind = "hessian",
): void {
  const rng = createRng(seed);
  if (kind === "linen") paintLinenPatch(ctx, width, height, rng);
  else paintHessian(ctx, width, height, rng);
}

const LINEN_TILE_SIZE = 192;
let linenUrlCache: string | null = null;

/** Repeating white-linen CSS url. Same tile for hoop and page. */
export function linenPatternUrl(): string {
  if (linenUrlCache) return linenUrlCache;
  if (typeof document === "undefined") return "/textures/linen.svg";
  const canvas = document.createElement("canvas");
  canvas.width = LINEN_TILE_SIZE;
  canvas.height = LINEN_TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "/textures/linen.svg";
  paintLinenTile(ctx, LINEN_TILE_SIZE, 11);
  linenUrlCache = canvas.toDataURL("image/png");
  return linenUrlCache;
}

export function linenBackgroundStyle(): CSSProperties {
  return {
    backgroundColor: LINEN.base,
    backgroundImage: `url("${linenPatternUrl()}")`,
    backgroundRepeat: "repeat",
    backgroundAttachment: "fixed",
    backgroundSize: `${LINEN_TILE_SIZE}px ${LINEN_TILE_SIZE}px`,
  };
}
