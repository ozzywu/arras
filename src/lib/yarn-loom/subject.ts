import type { Rgb } from "./types";

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * How much a colour wants to be the subject of the picture.
 * Dark ink, saturated chroma, and cornflower blue lead; bone / hessian / pale
 * plaster recede. Used to order colonize — not to fade pixels.
 */
export function subjectScore(c: Rgb): number {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const sat = max < 1e-4 ? 0 : chroma / max;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const linen = clamp01((1 - sat * 2.4) * lum);
  const ink = (1 - lum) * (0.75 + sat * 0.25);
  const blueLead = clamp01(b - r * 0.55 - g * 0.28);
  const warmChroma = chroma * (0.4 + Math.abs(r - g) * 0.5);
  return clamp01(ink * 0.4 + sat * 0.28 + blueLead * 0.24 + warmChroma * 0.12 + (1 - linen) * 0.12);
}

export function hashNoise(x: number, y: number, salt = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
