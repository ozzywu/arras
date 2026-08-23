import { createRng } from "./rng";
import { lighten } from "./color";
import type { GroundMode, Stitch } from "./types";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Extra canvas margin so overshooting threads are not clipped. */
export function frayPad(fray: number, ground: GroundMode): number {
  const bleed = ground === "site" ? 40 : 0;
  return Math.round(bleed + fray * 56);
}

function clipToRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  if (
    clip(-dx, x0 - minX) &&
    clip(dx, maxX - x0) &&
    clip(-dy, y0 - minY) &&
    clip(dy, maxY - y0)
  ) {
    return {
      x0: x0 + t0 * dx,
      y0: y0 + t0 * dy,
      x1: x0 + t1 * dx,
      y1: y0 + t1 * dy,
    };
  }
  return null;
}

function nearestEdge(
  x: number,
  y: number,
  w: number,
  h: number,
): { d: number; nx: number; ny: number } {
  const dl = x;
  const dr = w - x;
  const dt = y;
  const db = h - y;
  const d = Math.min(dl, dr, dt, db);
  if (d === dl) return { d, nx: -1, ny: 0 };
  if (d === dr) return { d, nx: 1, ny: 0 };
  if (d === dt) return { d, nx: 0, ny: -1 };
  return { d, nx: 0, ny: 1 };
}

/**
 * Finish the embroidered patch.
 *
 * fray = 0 → every stitch is clipped to the artwork rect (a clean hem).
 * fray = 1 → edge stitches overshoot, yaw off-grain, and spawn stray
 * fibers that sit on the surrounding cloth.
 */
export function applyFray(
  stitches: Stitch[],
  width: number,
  height: number,
  fray: number,
  seed: number,
): Stitch[] {
  const rng = createRng(seed + 91);
  const inset = 0.6;
  const band = 10 + fray * 38;
  const amount = clamp(fray, 0, 1);
  const out: Stitch[] = [];
  const wisps: Stitch[] = [];
  let wispPassage = 900000;

  for (const s of stitches) {
    const clipped = clipToRect(
      s.x0,
      s.y0,
      s.x1,
      s.y1,
      inset,
      inset,
      width - inset,
      height - inset,
    );
    if (!clipped) continue;

    if (amount < 0.004) {
      out.push({
        ...s,
        x0: clipped.x0,
        y0: clipped.y0,
        x1: clipped.x1,
        y1: clipped.y1,
        weight: s.weight ?? 1,
      });
      continue;
    }

    const e0 = nearestEdge(s.x0, s.y0, width, height);
    const e1 = nearestEdge(s.x1, s.y1, width, height);
    const outerFirst = e0.d <= e1.d;
    const edge = outerFirst ? e0 : e1;
    const edgeT = clamp(1 - edge.d / band, 0, 1);

    if (edgeT < 0.04) {
      out.push({ ...s, weight: s.weight ?? 1 });
      continue;
    }

    // High fray unravels some hem stitches entirely.
    if (edgeT > 0.5 && rng() < amount * 0.2) continue;

    let x0 = clipped.x0;
    let y0 = clipped.y0;
    let x1 = clipped.x1;
    let y1 = clipped.y1;
    const nx = edge.nx;
    const ny = edge.ny;
    const reach = amount * edgeT * (5 + rng() * 36);
    const drift = (rng() - 0.5) * reach * 0.55;
    if (outerFirst) {
      x0 += nx * reach + ny * drift;
      y0 += ny * reach + nx * drift;
    } else {
      x1 += nx * reach + ny * drift;
      y1 += ny * reach + nx * drift;
    }

    const innerX = outerFirst ? x1 : x0;
    const innerY = outerFirst ? y1 : y0;
    let ox = outerFirst ? x0 : x1;
    let oy = outerFirst ? y0 : y1;
    const yaw = amount * edgeT * (rng() - 0.5) * 1.45;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const dx = ox - innerX;
    const dy = oy - innerY;
    ox = innerX + dx * cos - dy * sin;
    oy = innerY + dx * sin + dy * cos;
    if (outerFirst) {
      x0 = ox;
      y0 = oy;
    } else {
      x1 = ox;
      y1 = oy;
    }

    out.push({
      ...s,
      x0: clipped.x0 + (x0 - clipped.x0) * amount,
      y0: clipped.y0 + (y0 - clipped.y0) * amount,
      x1: clipped.x1 + (x1 - clipped.x1) * amount,
      y1: clipped.y1 + (y1 - clipped.y1) * amount,
      weight: s.weight ?? 1,
    });

    if (edgeT > 0.28 && rng() < amount * 0.42 && wisps.length < 1400) {
      const baseX = outerFirst ? x0 : x1;
      const baseY = outerFirst ? y0 : y1;
      const len = 3.5 + rng() * (6 + amount * 22);
      const ang =
        Math.atan2(ny, nx) + (rng() - 0.5) * (0.7 + amount * 1.8);
      wisps.push({
        x0: baseX,
        y0: baseY,
        x1: baseX + Math.cos(ang) * len,
        y1: baseY + Math.sin(ang) * len,
        color: lighten(s.color, 0.08 + rng() * 0.12),
        subject: 0.06 + rng() * 0.08,
        passage: wispPassage++,
        indexInPassage: 0,
        birth: 0,
        grow: 0.01,
        weight: 0.26 + rng() * 0.34,
      });
    }
  }

  return out.concat(wisps);
}
