import { resolveThreadColor, rgbAt } from "./color";
import { sampleAngle, sampleMag } from "./analyze";
import { createRng } from "./rng";
import { subjectScore } from "./subject";
import type { Analysis, ColorMode, Stitch } from "./types";

export interface GenerateOptions {
  density: number;
  stitchLength: number;
  colorMode: ColorMode;
  seed: number;
  seat?: "hessian" | "linen";
}

function occupancyIndex(
  x: number,
  y: number,
  occW: number,
  cell: number,
  cap: number,
): number {
  const ix = Math.max(0, Math.min(occW - 1, (x / cell) | 0));
  const iy = Math.max(0, (y / cell) | 0);
  return Math.min(cap - 1, iy * occW + ix);
}

/**
 * Trace edge-tangent streamlines and chop them into discrete satin stitches
 * that seat into the weave. Occupancy still prevents a plastic fill, but high
 * density is allowed to pack like real long-and-short satin.
 */
export function generateStitches(
  analysis: Analysis,
  options: GenerateOptions,
): Stitch[] {
  const { density, stitchLength, colorMode, seed, seat = "hessian" } = options;
  const rng = createRng(seed);
  const { width: w, height: h, mag } = analysis;
  const cell = Math.max(1.05, stitchLength * (0.52 - density * 0.34));
  const occW = Math.ceil(w / cell);
  const occH = Math.ceil(h / cell);
  const occ = new Uint8Array(occW * occH);
  const occCap = occ.length;
  const occLimit = density >= 0.9 ? 5 : density >= 0.75 ? 4 : density >= 0.55 ? 3 : 2;
  const busyReject = density >= 0.9 ? 0.78 : density >= 0.75 ? 0.62 : 0.45;

  const maxMag = mag.reduce((m, v) => (v > m ? v : m), 0.0001);
  const stride = Math.max(1, Math.round(4.4 - density * 3.4));
  const stitches: Stitch[] = [];
  let passage = 0;
  const lenScale = 1.12 - density * 0.32;
  const diveEvery = density >= 0.85 ? 16 + ((rng() * 6) | 0) : 5 + ((rng() * 4) | 0);
  const cap = Math.round(62000 + density * 68000);

  const tryMark = (x0: number, y0: number, x1: number, y1: number): boolean => {
    const steps = Math.max(2, Math.hypot(x1 - x0, y1 - y0) / (cell * 0.5));
    let busy = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return false;
      const i = occupancyIndex(x, y, occW, cell, occCap);
      if (occ[i] >= occLimit) busy++;
    }
    if (busy / (steps + 1) > busyReject) return false;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const i = occupancyIndex(
        x0 + (x1 - x0) * t,
        y0 + (y1 - y0) * t,
        occW,
        cell,
        occCap,
      );
      occ[i] = Math.min(255, occ[i] + 1);
    }
    return true;
  };

  const pushStitch = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    indexInPassage: number,
  ): boolean => {
    if (!tryMark(x0, y0, x1, y1)) return false;
    const mx = ((x0 + x1) / 2) | 0;
    const my = ((y0 + y1) / 2) | 0;
    const sampled = rgbAt(
      analysis.color,
      w,
      Math.max(0, Math.min(w - 1, mx)),
      Math.max(0, Math.min(h - 1, my)),
    );
    stitches.push({
      x0,
      y0,
      x1,
      y1,
      color: resolveThreadColor(sampled, colorMode, seat),
      subject: subjectScore(sampled),
      passage,
      indexInPassage,
      birth: 0,
      grow: 0.012,
      weight: 1,
    });
    return true;
  };

  const traceFrom = (sx: number, sy: number) => {
    const points: { x: number; y: number }[] = [{ x: sx, y: sy }];
    const maxSteps = 60 + Math.round(density * 50);
    for (const dir of [1, -1] as const) {
      let x = sx;
      let y = sy;
      let prevA = sampleAngle(analysis, x, y);
      const local: { x: number; y: number }[] = [];
      for (let step = 0; step < maxSteps; step++) {
        let a = sampleAngle(analysis, x, y);
        let da = a - prevA;
        while (da > Math.PI / 2) {
          a -= Math.PI;
          da = a - prevA;
        }
        while (da < -Math.PI / 2) {
          a += Math.PI;
          da = a - prevA;
        }
        prevA = a;
        const m = sampleMag(analysis, x, y);
        const stepLen = 1.35 + (1 - Math.min(1, m / maxMag)) * 0.5;
        x += Math.cos(a) * stepLen * dir;
        y += Math.sin(a) * stepLen * dir;
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) break;
        if (m < maxMag * 0.02 && step > 12 && density < 0.8) break;
        local.push({ x, y });
      }
      if (dir === 1) points.push(...local);
      else points.unshift(...local.reverse());
    }

    if (points.length < 4) return;

    let acc = 0;
    let last = points[0];
    let indexInPassage = 0;
    let sinceDive = 0;
    const lenJitter = stitchLength * lenScale;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      acc += d;
      const target = lenJitter * (0.78 + rng() * 0.4);
      if (acc >= target) {
        sinceDive++;
        if (sinceDive >= diveEvery) {
          sinceDive = 0;
          last = p;
          acc = 0;
          continue;
        }
        if (pushStitch(last.x, last.y, p.x, p.y, indexInPassage)) {
          indexInPassage++;
        }
        last = p;
        acc = 0;
      }
    }
    if (indexInPassage > 0) passage++;
  };

  for (let y = 3; y < h - 3; y += stride) {
    for (let x = 3; x < w - 3; x += stride) {
      const jitterX = x + (((rng() - 0.5) * stride) | 0);
      const jitterY = y + (((rng() - 0.5) * stride) | 0);
      const xi = Math.max(2, Math.min(w - 3, jitterX));
      const yi = Math.max(2, Math.min(h - 3, jitterY));
      const m = mag[yi * w + xi];
      const c = rgbAt(analysis.color, w, xi, yi);
      const sat =
        (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
      const importance =
        (m / maxMag) * 0.5 +
        sat * 0.28 +
        (1 - analysis.lum[yi * w + xi]) * 0.14 +
        subjectScore(c) * 0.18;
      const threshold = density >= 0.88 ? 0.012 : 0.03 + (1 - density) * 0.1;
      if (importance < threshold) continue;
      if (occ[occupancyIndex(xi, yi, occW, cell, occCap)] >= occLimit) continue;
      traceFrom(xi + 0.5, yi + 0.5);
    }
  }

  const fillStride = Math.max(1, Math.round(cell * (density >= 0.92 ? 1.05 : 1.35)));
  const fillLen = stitchLength * lenScale * 0.82;
  const cells: { x: number; y: number; lum: number }[] = [];
  for (let y = 3; y < h - 3; y += fillStride) {
    for (let x = 3; x < w - 3; x += fillStride) {
      const xi = Math.max(
        3,
        Math.min(w - 4, x + (((rng() - 0.5) * fillStride) | 0)),
      );
      const yi = Math.max(
        3,
        Math.min(h - 4, y + (((rng() - 0.5) * fillStride) | 0)),
      );
      if (occ[occupancyIndex(xi, yi, occW, cell, occCap)] >= Math.max(1, occLimit - 1)) {
        continue;
      }
      cells.push({ x: xi, y: yi, lum: analysis.lum[yi * w + xi] });
    }
  }
  cells.sort((a, b) => b.lum - a.lum);
  for (const c of cells) {
    if (stitches.length >= cap) break;
    const a = sampleAngle(analysis, c.x, c.y) + (rng() - 0.5) * 0.18;
    const x0 = c.x - Math.cos(a) * fillLen * 0.5;
    const y0 = c.y - Math.sin(a) * fillLen * 0.5;
    const x1 = c.x + Math.cos(a) * fillLen * 0.5;
    const y1 = c.y + Math.sin(a) * fillLen * 0.5;
    if (pushStitch(x0, y0, x1, y1, 0)) passage++;
  }

  return stitches;
}
