import { mixRgb, saturate } from "@/lib/yarn-loom/color";
import type { Rgb } from "@/lib/yarn-loom/types";
import { SCREEN_GOLD, SCREEN_INK, SCREEN_PALE_GOLD } from "./types";
import type { ScreenGround } from "./types";

/** Mineral pigments of a Qing court screen — cinnabar, celadon, indigo, bone. */
export const SCREEN_PALETTE: Rgb[] = [
  { r: 168, g: 42, b: 42 },
  { r: 122, g: 36, b: 40 },
  { r: 196, g: 154, b: 98 },
  { r: 232, g: 210, b: 150 },
  { r: 138, g: 154, b: 118 },
  { r: 62, g: 92, b: 78 },
  { r: 70, g: 98, b: 132 },
  { r: 48, g: 64, b: 96 },
  { r: 196, g: 168, b: 156 },
  { r: 220, g: 208, b: 190 },
  { r: 90, g: 74, b: 58 },
  { r: 42, g: 36, b: 32 },
  { r: 18, g: 16, b: 14 },
];

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function nearestScreen(c: Rgb): Rgb {
  let best = SCREEN_PALETTE[0];
  let bestD = Infinity;
  for (const p of SCREEN_PALETTE) {
    const d = dist2(c, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function muteToScreen(c: Rgb, aging: number): Rgb {
  const pal = nearestScreen(c);
  const desat = saturate(c, 1 - aging * 0.58);
  const aged = mixRgb(desat, pal, aging * 0.64);
  return mixRgb(aged, { r: 196, g: 176, b: 140 }, aging * 0.1);
}

export function groundRgb(ground: ScreenGround): Rgb {
  switch (ground) {
    case "gold":
      return { r: 198, g: 162, b: 92 };
    case "silk":
      return { r: 228, g: 216, b: 194 };
    case "parchment":
      return { r: 232, g: 220, b: 198 };
    default:
      return { r: 16, g: 13, b: 11 };
  }
}

export function contourColor(
  ground: ScreenGround,
  local: Rgb,
  goldLeaf: number,
): Rgb {
  const ink = mixRgb(SCREEN_INK, local, 0.12);
  if (ground === "lacquer") {
    const metal = mixRgb(SCREEN_GOLD, SCREEN_PALE_GOLD, 0.35);
    return mixRgb(ink, metal, 0.28 + goldLeaf * 0.62);
  }
  if (ground === "gold") {
    return mixRgb(ink, { r: 48, g: 36, b: 24 }, 0.35);
  }
  return mixRgb(ink, { r: 36, g: 30, b: 26 }, 0.2);
}

export function lumOf(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}
