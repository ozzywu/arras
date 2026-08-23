import { hashNoise } from "./subject";
import type { GrowthMode, Stitch } from "./types";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Assign birth times. Sew is tip-driven along each passage; weave splits
 * warp/weft; bloom radiates from center; colonize fans from a few origins.
 */
export function assignBirths(
  stitches: Stitch[],
  mode: GrowthMode,
  width: number,
  height: number,
): Stitch[] {
  if (stitches.length === 0) return stitches;

  const passages = new Map<number, Stitch[]>();
  for (const s of stitches) {
    const list = passages.get(s.passage);
    if (list) list.push(s);
    else passages.set(s.passage, [s]);
  }

  const ids = [...passages.keys()].sort((a, b) => a - b);

  if (mode === "sew") {
    const ranked = ids
      .map((id) => {
        const list = passages.get(id)!;
        const first = list[0];
        return { id, list, key: first.y0 * 1.15 + first.x0 * 0.4 };
      })
      .sort((a, b) => a.key - b.key);

    const n = ranked.length;
    ranked.forEach((p, pi) => {
      const start = (pi / Math.max(1, n)) * 0.62;
      const span = 0.22 + (p.list.length / 80) * 0.18;
      p.list.forEach((s, i) => {
        const along = p.list.length <= 1 ? 0 : i / (p.list.length - 1);
        const eased = 1 - Math.pow(1 - along, 1.35);
        s.birth = clamp01(start + eased * span);
        s.grow = 0.01 + (1 - along) * 0.008;
      });
    });
  } else if (mode === "weave") {
    for (const s of stitches) {
      const ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
      const warp = Math.abs(Math.cos(ang)) > 0.55;
      const along = warp
        ? s.y0 / height
        : 0.42 + (s.x0 / width) * 0.55;
      s.birth = clamp01(along);
      s.grow = 0.014;
    }
  } else if (mode === "bloom") {
    const cx = width * 0.52;
    const cy = height * 0.48;
    let maxD = 1;
    for (const s of stitches) {
      const d = Math.hypot((s.x0 + s.x1) / 2 - cx, (s.y0 + s.y1) / 2 - cy);
      if (d > maxD) maxD = d;
    }
    for (const s of stitches) {
      const mx = (s.x0 + s.x1) / 2;
      const my = (s.y0 + s.y1) / 2;
      const d = Math.hypot(mx - cx, my - cy) / maxD;
      const ang = (Math.atan2(my - cy, mx - cx) + Math.PI) / (Math.PI * 2);
      s.birth = clamp01(d * 0.82 + (ang % 0.17) * 0.5);
      s.grow = 0.016;
    }
  } else {
    // Palette-led colonize: ink / chroma / cornflower first, bone last.
    // A few high-subject origins still give it a spreading, handmade frontier.
    const ranked = [...stitches].sort((a, b) => b.subject - a.subject);
    const origins: { x: number; y: number }[] = [];
    const minSep = Math.max(28, Math.min(width, height) * 0.12);
    for (const s of ranked) {
      if (origins.length >= 8) break;
      if (s.subject < 0.42 && origins.length >= 3) break;
      const x = (s.x0 + s.x1) / 2;
      const y = (s.y0 + s.y1) / 2;
      if (origins.some((o) => Math.hypot(x - o.x, y - o.y) < minSep)) continue;
      origins.push({ x, y });
    }
    if (origins.length === 0) {
      origins.push({ x: width * 0.45, y: height * 0.42 });
    }

    let maxD = 1;
    for (const s of stitches) {
      const mx = (s.x0 + s.x1) / 2;
      const my = (s.y0 + s.y1) / 2;
      let best = Infinity;
      for (const o of origins) {
        const d = Math.hypot(mx - o.x, my - o.y);
        if (d < best) best = d;
      }
      if (best > maxD) maxD = best;
    }

    for (const s of stitches) {
      const mx = (s.x0 + s.x1) / 2;
      const my = (s.y0 + s.y1) / 2;
      let dist = Infinity;
      for (const o of origins) {
        const d = Math.hypot(mx - o.x, my - o.y);
        if (d < dist) dist = d;
      }
      const colorGate = 1 - s.subject;
      const distGate = dist / maxD;
      const noise = hashNoise(mx, my, s.passage) * 0.12;
      const paleBreak = (1 - s.subject) * 0.08 * hashNoise(my, mx, 9);
      s.birth = clamp01(colorGate * 0.66 + distGate * 0.22 + noise + paleBreak);
      s.grow = 0.008 + (1 - s.subject) * 0.01;
    }
  }

  return stitches;
}

export function stitchProgress(stitch: Stitch, t: number): number {
  if (t <= stitch.birth) return 0;
  const local = (t - stitch.birth) / Math.max(0.004, stitch.grow);
  return easeOutCubic(clamp01(local));
}

export function playheadEase(t: number): number {
  // Fast burst out of origin, luxurious deceleration as passages close.
  return 1 - Math.pow(1 - clamp01(t), 2.35);
}
