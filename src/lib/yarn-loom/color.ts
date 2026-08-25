import { MED_PALETTE, type ColorMode, type Rgb } from "./types";

export function rgbAt(
  color: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): Rgb {
  const i = (y * width + x) * 4;
  return { r: color[i], g: color[i + 1], b: color[i + 2] };
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function saturate(c: Rgb, amount: number): Rgb {
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return {
    r: Math.max(0, Math.min(255, l + (c.r - l) * amount)),
    g: Math.max(0, Math.min(255, l + (c.g - l) * amount)),
    b: Math.max(0, Math.min(255, l + (c.b - l) * amount)),
  };
}

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function nearestPalette(c: Rgb): Rgb {
  let best = MED_PALETTE[0];
  let bestD = Infinity;
  for (const p of MED_PALETTE) {
    const d = dist2(c, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function resolveThreadColor(
  sampled: Rgb,
  mode: ColorMode,
  seat: "hessian" | "linen" = "hessian",
): Rgb {
  let floss = saturate(sampled, 1.08);
  const lum = 0.2126 * floss.r + 0.7152 * floss.g + 0.0722 * floss.b;
  // Pale floss vanishes on both weaves. Seat it toward the cloth, not a tan sticker.
  if (lum > 168) {
    const toward =
      seat === "linen"
        ? { r: 168, g: 160, b: 146 }
        : { r: 196, g: 165, b: 116 };
    floss = mixRgb(darken(floss, seat === "linen" ? 0.14 : 0.18), toward, 0.2);
  }
  if (mode === "sampled") return floss;
  return mixRgb(nearestPalette(floss), floss, 0.28);
}

export function cssRgb(c: Rgb, a = 1): string {
  return `rgba(${c.r | 0}, ${c.g | 0}, ${c.b | 0}, ${a})`;
}

export function darken(c: Rgb, t: number): Rgb {
  return {
    r: c.r * (1 - t),
    g: c.g * (1 - t),
    b: c.b * (1 - t),
  };
}

export function lighten(c: Rgb, t: number): Rgb {
  return {
    r: c.r + (255 - c.r) * t,
    g: c.g + (255 - c.g) * t,
    b: c.b + (255 - c.b) * t,
  };
}
