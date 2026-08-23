import type { Analysis } from "./types";

function lumAt(data: Uint8ClampedArray, i: number): number {
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

/**
 * Sobel + edge-tangent flow. Weak-gradient pixels inherit a smoothed
 * neighbor direction so streamlines can travel through flat regions.
 */
export function analyzeImageData(image: ImageData): Analysis {
  const { width: w, height: h, data } = image;
  const n = w * h;
  const lum = new Float32Array(n);
  const mag = new Float32Array(n);
  const angle = new Float32Array(n);
  const color = new Uint8ClampedArray(data);

  for (let i = 0; i < n; i++) lum[i] = lumAt(data, i * 4);

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0;
      let gy = 0;
      let k = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const v = lum[(y + j) * w + (x + i)];
          gx += v * gxK[k];
          gy += v * gyK[k];
          k++;
        }
      }
      const idx = y * w + x;
      mag[idx] = Math.hypot(gx, gy);
      let tx = -gy;
      let ty = gx;
      if (tx < 0) {
        tx = -tx;
        ty = -ty;
      }
      angle[idx] = Math.atan2(ty, tx);
    }
  }

  // Smooth tangent field (vector average, magnitude-weighted).
  const smx = new Float32Array(n);
  const smy = new Float32Array(n);
  for (let pass = 0; pass < 4; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let ax = 0;
        let ay = 0;
        let wt = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const idx = (y + j) * w + (x + i);
            const m = mag[idx] + 0.04;
            const a = angle[idx];
            ax += Math.cos(a) * m;
            ay += Math.sin(a) * m;
            wt += m;
          }
        }
        const idx = y * w + x;
        smx[idx] = ax / wt;
        smy[idx] = ay / wt;
      }
    }
    for (let i = 0; i < n; i++) {
      angle[i] = Math.atan2(smy[i], smx[i]);
    }
  }

  return { width: w, height: h, lum, mag, angle, color };
}

export function sampleAngle(a: Analysis, x: number, y: number): number {
  const xi = Math.max(0, Math.min(a.width - 1, x | 0));
  const yi = Math.max(0, Math.min(a.height - 1, y | 0));
  return a.angle[yi * a.width + xi];
}

export function sampleMag(a: Analysis, x: number, y: number): number {
  const xi = Math.max(0, Math.min(a.width - 1, x | 0));
  const yi = Math.max(0, Math.min(a.height - 1, y | 0));
  return a.mag[yi * a.width + xi];
}
