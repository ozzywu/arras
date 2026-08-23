import { sampleAngle, sampleMag } from "@/lib/yarn-loom/analyze";
import { mixRgb, rgbAt, saturate } from "@/lib/yarn-loom/color";
import { createRng } from "@/lib/yarn-loom/rng";
import { subjectScore } from "@/lib/yarn-loom/subject";
import type { Analysis, Rgb } from "@/lib/yarn-loom/types";
import {
  contourColor,
  groundRgb,
  lumOf,
  muteToScreen,
} from "./palette";
import { quantizeAnalysis } from "./quantize";
import { assignMarkBirths } from "./timeline";
import type { Mark, ScreenParams } from "./types";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function blurField(src: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let acc = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          acc += src[(y + j) * w + (x + i)];
        }
      }
      out[y * w + x] = acc / 9;
    }
  }
  return out;
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

function readResolved(
  analysis: Analysis,
  subject: Float32Array,
  quantColors: Rgb[],
  quantIndex: Uint16Array,
  params: ScreenParams,
  x: number,
  y: number,
): { color: Rgb; subject: number; sampled: Rgb } {
  const w = analysis.width;
  const h = analysis.height;
  const xi = clamp(x | 0, 0, w - 1);
  const yi = clamp(y | 0, 0, h - 1);
  const i = yi * w + xi;
  const sampled = rgbAt(analysis.color, w, xi, yi);
  const sub = subject[i];
  const clustered = quantColors[quantIndex[i]] ?? sampled;
  const muted = muteToScreen(mixRgb(sampled, clustered, 0.45 + params.flatten * 0.4), params.aging);
  const ground = groundRgb(params.ground);
  const keep = clamp(sub * 1.15 - params.flatten * 0.12, 0, 1);
  let color = mixRgb(ground, muted, keep);
  if (params.goldLeaf > 0.05 && lumOf(sampled) > 188) {
    color = mixRgb(color, { r: 226, g: 198, b: 120 }, params.goldLeaf * 0.35 * keep);
  }
  return { color, subject: sub, sampled };
}

function pushWash(
  marks: Mark[],
  x: number,
  y: number,
  color: Rgb,
  subject: number,
  radius: number,
  angle: number,
  wetness: number,
): void {
  const rx = radius * (1 + wetness * 0.35);
  marks.push({
    kind: "wash",
    x0: x,
    y0: y,
    x1: x + Math.cos(angle) * rx,
    y1: y + Math.sin(angle) * rx,
    color,
    width: rx,
    opacity: 0.42 + (1 - wetness) * 0.4,
    subject,
    birth: 0,
    grow: 0.02,
  });
}

function tryMarkOcc(
  occ: Uint8Array,
  occW: number,
  cell: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  h: number,
  limit: number,
): boolean {
  const steps = Math.max(2, Math.hypot(x1 - x0, y1 - y0) / Math.max(0.6, cell * 0.5));
  let busy = 0;
  const cap = occ.length;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return false;
    if (occ[occupancyIndex(x, y, occW, cell, cap)] >= limit) busy++;
  }
  if (busy / (steps + 1) > 0.55) return false;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const i = occupancyIndex(
      x0 + (x1 - x0) * t,
      y0 + (y1 - y0) * t,
      occW,
      cell,
      cap,
    );
    occ[i] = Math.min(255, occ[i] + 1);
  }
  return true;
}

/**
 * Build wash dabs, ink contours, interior veins, and filigree from an analysis.
 */
export function buildPanel(analysis: Analysis, params: ScreenParams): Mark[] {
  const rng = createRng(params.seed);
  const { width: w, height: h, mag, lum } = analysis;
  const n = w * h;

  const rawSubject = new Float32Array(n);
  let pale = 0;
  let dark = 0;
  let chromaAcc = 0;
  let lumAcc = 0;
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i / w) | 0;
    const sampled = rgbAt(analysis.color, w, x, y);
    rawSubject[i] = subjectScore(sampled);
    const mx = Math.max(sampled.r, sampled.g, sampled.b);
    const mn = Math.min(sampled.r, sampled.g, sampled.b);
    chromaAcc += (mx - mn) / 255;
    lumAcc += lum[i];
    if (lum[i] > 0.86) pale++;
    if (lum[i] < 0.1) dark++;
  }
  const subject = blurField(rawSubject, w, h);
  const paleRatio = pale / n;
  const darkRatio = dark / n;
  const chromaMean = chromaAcc / n;
  const meanLum = lumAcc / n;
  const darkBg = meanLum < 0.24 && darkRatio > 0.32;
  const lineart =
    (paleRatio > 0.5 && chromaMean < 0.14) ||
    (darkBg && chromaMean < 0.2);

  const k = Math.round(18 - params.flatten * 12);
  const { colors: quantColors, index: quantIndex } = quantizeAnalysis(
    analysis,
    k,
    rng,
  );

  let maxMag = 0.0001;
  for (let i = 0; i < n; i++) if (mag[i] > maxMag) maxMag = mag[i];

  const marks: Mark[] = [];

  const washCell = 3.4 + params.flatten * 5.2 + params.wetness * 1.4;
  const washStride = Math.max(2, Math.round(washCell * 0.82));
  const inkBias = params.ink === "xieyi" ? 1.35 : params.ink === "engraved" ? 0.82 : 1;
  if (!lineart || !darkBg) {
    for (let y = 3; y < h - 3; y += washStride) {
      for (let x = 3; x < w - 3; x += washStride) {
        const jx = clamp(x + ((rng() - 0.5) * washStride) | 0, 2, w - 3);
        const jy = clamp(y + ((rng() - 0.5) * washStride) | 0, 2, h - 3);
        const resolved = readResolved(
          analysis,
          subject,
          quantColors,
          quantIndex,
          params,
          jx,
          jy,
        );
        if (resolved.subject < 0.16 + params.flatten * 0.1 && params.ground !== "gold") {
          if (rng() > 0.08) continue;
        }
        if (lineart && resolved.subject < 0.28 && rng() > 0.12) continue;
        const ang = sampleAngle(analysis, jx, jy) + (rng() - 0.5) * 0.4;
        const radius = washCell * (0.55 + rng() * 0.55) * inkBias;
        const washColor = saturate(resolved.color, 0.92 - params.aging * 0.15);
        pushWash(
          marks,
          jx + 0.5,
          jy + 0.5,
          washColor,
          resolved.subject,
          radius,
          ang,
          params.wetness,
        );
      }
    }
  }

  const occCell = Math.max(1.15, 2.4 - params.outline * 0.45);
  const occW = Math.ceil(w / occCell);
  const occH = Math.ceil(h / occCell);
  const occ = new Uint8Array(occW * occH);
  const occLimit = params.ink === "engraved" ? 3 : 2;

  const magGate =
    maxMag *
    (params.ink === "xieyi"
      ? 0.16
      : params.ink === "engraved"
        ? 0.07
        : 0.1) *
    (1.15 - params.outline * 0.22);
  const contourStride = Math.max(1, Math.round(3.2 - params.outline * 0.8));
  const contourLen =
    (params.ink === "engraved" ? 7.2 : 9.4) * (0.85 + params.outline * 0.12);

  const inkW =
    (params.ink === "engraved" ? 1.55 : params.ink === "xieyi" ? 0.95 : 1.12) *
    params.outline;

  const traceKind = (
    sx: number,
    sy: number,
    kind: Mark["kind"],
    minMag: number,
    maxSteps: number,
    segLen: number,
    width: number,
    opacity: number,
  ) => {
    const points: { x: number; y: number }[] = [{ x: sx, y: sy }];
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
        if (m < minMag && step > 6) break;
        const stepLen = 1.2 + (1 - Math.min(1, m / maxMag)) * 0.45;
        x += Math.cos(a) * stepLen * dir;
        y += Math.sin(a) * stepLen * dir;
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) break;
        local.push({ x, y });
      }
      if (dir === 1) points.push(...local);
      else points.unshift(...local.reverse());
    }
    if (points.length < 4) return;

    let acc = 0;
    let last = points[0];
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      acc += Math.hypot(p.x - last.x, p.y - last.y);
      const target = segLen * (0.75 + rng() * 0.4);
      if (acc < target) continue;
      if (tryMarkOcc(occ, occW, occCell, last.x, last.y, p.x, p.y, w, h, occLimit)) {
        const mx = ((last.x + p.x) / 2) | 0;
        const my = ((last.y + p.y) / 2) | 0;
        const resolved = readResolved(
          analysis,
          subject,
          quantColors,
          quantIndex,
          params,
          mx,
          my,
        );
        const color =
          kind === "contour"
            ? contourColor(params.ground, resolved.sampled, params.goldLeaf)
            : mixRgb(
                contourColor(params.ground, resolved.sampled, params.goldLeaf * 0.6),
                resolved.color,
                0.28,
              );
        marks.push({
          kind,
          x0: last.x,
          y0: last.y,
          x1: p.x,
          y1: p.y,
          color,
          width: width * (0.75 + rng() * 0.5),
          opacity,
          subject: resolved.subject,
          birth: 0,
          grow: 0.012,
        });
      }
      last = p;
      acc = 0;
    }
  };

  for (let y = 3; y < h - 3; y += contourStride) {
    for (let x = 3; x < w - 3; x += contourStride) {
      const jx = clamp(x + ((rng() - 0.5) * contourStride) | 0, 2, w - 3);
      const jy = clamp(y + ((rng() - 0.5) * contourStride) | 0, 2, h - 3);
      const m = mag[jy * w + jx];
      if (m < magGate) continue;
      if (occ[occupancyIndex(jx, jy, occW, occCell, occ.length)] >= occLimit) {
        continue;
      }
      const importance = m / maxMag + subject[jy * w + jx] * 0.25;
      if (importance < 0.12 && rng() > 0.35) continue;
      traceKind(
        jx + 0.5,
        jy + 0.5,
        "contour",
        magGate * 0.55,
        36 + Math.round(params.outline * 18),
        contourLen,
        inkW,
        params.ink === "xieyi" ? 0.72 : 0.9,
      );
    }
  }

  const veinStride = Math.max(2, Math.round(4.6 - params.flatten * 1.4));
  const veinGate = maxMag * (0.035 + (1 - params.flatten) * 0.03);
  if (params.ink !== "xieyi" || params.wetness < 0.7) {
    for (let y = 4; y < h - 4; y += veinStride) {
      for (let x = 4; x < w - 4; x += veinStride) {
        const jx = clamp(x + ((rng() - 0.5) * veinStride) | 0, 3, w - 4);
        const jy = clamp(y + ((rng() - 0.5) * veinStride) | 0, 3, h - 4);
        const m = mag[jy * w + jx];
        if (m < veinGate || m > magGate * 1.4) continue;
        if (subject[jy * w + jx] < 0.18 && !lineart) continue;
        if (occ[occupancyIndex(jx, jy, occW, occCell, occ.length)] >= occLimit) {
          continue;
        }
        traceKind(
          jx + 0.5,
          jy + 0.5,
          "vein",
          veinGate * 0.7,
          18,
          5.4,
          inkW * 0.42,
          0.45 + params.flatten * 0.2,
        );
      }
    }
  }

  if (params.pattern > 0.03 && !lineart) {
    const gap = Math.round(18 - params.pattern * 8);
    for (let y = gap; y < h - gap; y += gap) {
      for (let x = gap; x < w - gap; x += gap) {
        const i = y * w + x;
        if (subject[i] < 0.42) continue;
        if (mag[i] > maxMag * 0.14) continue;
        if (rng() > params.pattern * 0.85) continue;
        const resolved = readResolved(
          analysis,
          subject,
          quantColors,
          quantIndex,
          params,
          x,
          y,
        );
        const motif = rng();
        const scale = 3.6 + params.pattern * 3.2;
        const ang = rng() * Math.PI * 2;
        const ink = contourColor(params.ground, resolved.color, params.goldLeaf);
        const segs =
          motif < 0.34
            ? cloudComma(x, y, scale, ang)
            : motif < 0.67
              ? hexFlower(x, y, scale * 0.85)
              : scroll(x, y, scale, ang);
        for (const s of segs) {
          marks.push({
            kind: "filigree",
            x0: s.x0,
            y0: s.y0,
            x1: s.x1,
            y1: s.y1,
            color: ink,
            width: 0.55 + params.outline * 0.2,
            opacity: 0.55,
            subject: resolved.subject,
            birth: 0,
            grow: 0.012,
          });
        }
      }
    }
  }

  const cap = 42000;
  const trimmed = marks.length > cap ? marks.slice(0, cap) : marks;
  return assignMarkBirths(trimmed, params.reveal, w, h);
}

function cloudComma(
  x: number,
  y: number,
  s: number,
  ang: number,
): { x0: number; y0: number; x1: number; y1: number }[] {
  const segs: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let px = x;
  let py = y;
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    const a = ang + t * 2.4;
    const nx = x + Math.cos(a) * s * (0.4 + t);
    const ny = y + Math.sin(a) * s * (0.4 + t * 0.7);
    segs.push({ x0: px, y0: py, x1: nx, y1: ny });
    px = nx;
    py = ny;
  }
  return segs;
}

function hexFlower(
  x: number,
  y: number,
  s: number,
): { x0: number; y0: number; x1: number; y1: number }[] {
  const segs: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
    segs.push({
      x0: x + Math.cos(a0) * s,
      y0: y + Math.sin(a0) * s,
      x1: x + Math.cos(a1) * s,
      y1: y + Math.sin(a1) * s,
    });
  }
  return segs;
}

function scroll(
  x: number,
  y: number,
  s: number,
  ang: number,
): { x0: number; y0: number; x1: number; y1: number }[] {
  const segs: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let px = x - Math.cos(ang) * s;
  let py = y - Math.sin(ang) * s;
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const a = ang + Math.sin(t * Math.PI) * 1.6;
    const nx = x + Math.cos(a) * s * (t * 1.2);
    const ny = y + Math.sin(a) * s * (t * 0.9);
    segs.push({ x0: px, y0: py, x1: nx, y1: ny });
    px = nx;
    py = ny;
  }
  return segs;
}
