import { darken, lighten, resolveThreadColor, rgbAt } from "./color";
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

function foldPi(a: number): number {
  let t = a % Math.PI;
  if (t < 0) t += Math.PI;
  return t;
}

/** Snap an unwrapped heading onto an undirected grain (0..π). */
function snapUndirected(a: number, targetFolded: number): number {
  let best = targetFolded;
  let bestD = Infinity;
  for (let k = -2; k <= 2; k++) {
    const cand = targetFolded + k * Math.PI;
    const d = Math.abs(cand - a);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  return best;
}

function quantizeFolded(a: number, bins: number): number {
  const step = Math.PI / bins;
  return foldPi(Math.round(foldPi(a) / step) * step);
}

/**
 * Quiet fields lie as tapestry weft; stronger edges lock to a satin grain
 * so neighboring stitches share a direction instead of crawling like insects.
 */
function layAngle(a: number, mag: number, maxMag: number): number {
  const magN = mag / maxMag;
  if (magN < 0.12) {
    return a + (snapUndirected(a, 0) - a) * 0.86;
  }
  const grain = snapUndirected(a, quantizeFolded(a, 8));
  const mix = magN > 0.45 ? 0.58 : 0.76;
  return a + (grain - a) * mix;
}

/**
 * Long-and-short satin along edges, gobelin/weft in the fields.
 * Occupancy still stops a plastic flood, but stitches nest like real floss.
 */
export function generateStitches(
  analysis: Analysis,
  options: GenerateOptions,
): Stitch[] {
  const { density, stitchLength, colorMode, seed, seat = "hessian" } = options;
  const rng = createRng(seed);
  const { width: w, height: h, mag } = analysis;
  const cell = Math.max(0.92, stitchLength * (0.46 - density * 0.3));
  const occW = Math.ceil(w / cell);
  const occ = new Uint8Array(occW * Math.ceil(h / cell));
  const occCap = occ.length;
  const occLimit = density >= 0.9 ? 6 : density >= 0.75 ? 5 : density >= 0.55 ? 3 : 2;
  const busyReject = density >= 0.9 ? 0.9 : density >= 0.75 ? 0.72 : 0.5;

  const maxMag = analysis.maxMag > 0 ? analysis.maxMag : 0.0001;
  const stride = Math.max(1, Math.round(4.4 - density * 3.4));
  const stitches: Stitch[] = [];
  let passage = 0;
  const lenScale = 1.18 - density * 0.14;
  const diveEvery =
    density >= 0.85 ? 48 + ((rng() * 16) | 0) : 8 + ((rng() * 6) | 0);
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
    weight: number,
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
    const thread = resolveThreadColor(sampled, colorMode, seat);
    const heather = (rng() - 0.5) * 0.07;
    stitches.push({
      x0,
      y0,
      x1,
      y1,
      color:
        heather >= 0 ? lighten(thread, heather) : darken(thread, -heather),
      subject: subjectScore(sampled),
      passage,
      indexInPassage,
      birth: 0,
      grow: 0.012,
      weight,
    });
    return true;
  };

  const traceFrom = (sx: number, sy: number) => {
    const points: { x: number; y: number }[] = [{ x: sx, y: sy }];
    const maxSteps = 60 + Math.round(density * 50);
    for (const dir of [1, -1] as const) {
      let x = sx;
      let y = sy;
      let prevA = layAngle(
        sampleAngle(analysis, x, y),
        sampleMag(analysis, x, y),
        maxMag,
      );
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
        const m = sampleMag(analysis, x, y);
        a = layAngle(a, m, maxMag);
        prevA = a;
        const stepLen = 1.2 + (1 - Math.min(1, m / maxMag)) * 0.35;
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
      const target = lenJitter * (0.92 + rng() * 0.28);
      if (acc >= target) {
        sinceDive++;
        if (sinceDive >= diveEvery) {
          sinceDive = 0;
          last = p;
          acc = 0;
          continue;
        }
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        const ox = dx * 0.07;
        const oy = dy * 0.07;
        if (
          pushStitch(
            last.x - ox,
            last.y - oy,
            p.x + ox,
            p.y + oy,
            indexInPassage,
            0.9 + rng() * 0.16,
          )
        ) {
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

  const rowPitch = Math.max(0.88, cell * 0.78);
  const fillLen = stitchLength * lenScale * 0.7;
  const colPitch = Math.max(1, fillLen * 0.68);
  for (let y = 3, row = 0; y < h - 3; y += rowPitch, row++) {
    if (stitches.length >= cap) break;
    const stagger = (row % 2) * fillLen * 0.42;
    for (let x = 3 + stagger; x < w - 3; x += colPitch) {
      if (stitches.length >= cap) break;
      const xi = Math.max(
        3,
        Math.min(w - 4, x + (rng() - 0.5) * colPitch * 0.18),
      );
      const yi = Math.max(
        3,
        Math.min(h - 4, y + (rng() - 0.5) * rowPitch * 0.2),
      );
      if (occ[occupancyIndex(xi, yi, occW, cell, occCap)] >= occLimit) {
        continue;
      }
      let a = sampleAngle(analysis, xi, yi);
      a = layAngle(a, sampleMag(analysis, xi, yi), maxMag);
      a += (rng() - 0.5) * 0.05;
      const half = fillLen * (0.88 + rng() * 0.2) * 0.5;
      const x0 = xi - Math.cos(a) * half;
      const y0 = yi - Math.sin(a) * half;
      const x1 = xi + Math.cos(a) * half;
      const y1 = yi + Math.sin(a) * half;
      if (pushStitch(x0, y0, x1, y1, 0, 0.82 + rng() * 0.16)) passage++;
    }
  }

  return stitches;
}
