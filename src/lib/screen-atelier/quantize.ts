import { rgbAt } from "@/lib/yarn-loom/color";
import type { Analysis } from "@/lib/yarn-loom/types";
import type { Rgb } from "@/lib/yarn-loom/types";

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Mini-batch k-means on a subsample, then assign every pixel.
 * Returns cluster centroids and a per-pixel index map.
 */
export function quantizeAnalysis(
  analysis: Analysis,
  k: number,
  rng: () => number,
): { colors: Rgb[]; index: Uint16Array } {
  const { width: w, height: h, color } = analysis;
  const n = w * h;
  const clusters = Math.max(2, Math.min(24, k | 0));
  const samples: Rgb[] = [];
  const stride = n > 80000 ? 5 : n > 40000 ? 3 : 2;
  for (let i = 0; i < n; i += stride) {
    const x = i % w;
    const y = (i / w) | 0;
    samples.push(rgbAt(color, w, x, y));
  }

  const centers: Rgb[] = [];
  const used = new Set<number>();
  while (centers.length < clusters && used.size < samples.length) {
    const pick = (rng() * samples.length) | 0;
    if (used.has(pick)) continue;
    used.add(pick);
    centers.push({ ...samples[pick] });
  }
  if (centers.length === 0) {
    centers.push({ r: 128, g: 120, b: 108 });
  }

  const assign = new Int16Array(samples.length);
  for (let iter = 0; iter < 7; iter++) {
    for (let i = 0; i < samples.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = dist2(samples[i], centers[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    const acc = centers.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const a = acc[assign[i]];
      a.r += samples[i].r;
      a.g += samples[i].g;
      a.b += samples[i].b;
      a.n++;
    }
    for (let c = 0; c < centers.length; c++) {
      if (acc[c].n === 0) {
        centers[c] = { ...samples[(rng() * samples.length) | 0] };
        continue;
      }
      centers[c] = {
        r: acc[c].r / acc[c].n,
        g: acc[c].g / acc[c].n,
        b: acc[c].b / acc[c].n,
      };
    }
  }

  const index = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i / w) | 0;
    const pix = rgbAt(color, w, x, y);
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < centers.length; c++) {
      const d = dist2(pix, centers[c]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    index[i] = best;
  }

  return { colors: centers, index };
}
