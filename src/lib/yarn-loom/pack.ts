import { growthProgress } from "./timeline";
import type { Stitch } from "./types";

/**
 * Structure-of-arrays stitch buffer. Typed arrays transfer to/from the
 * loom worker without cloning ~10⁵ objects, and birth/complete order
 * lets playback binary-search instead of filtering every frame.
 */
export interface PackedStitches {
  count: number;
  passages: number;
  width: number;
  height: number;
  maxGrow: number;
  /** x0, y0, x1, y1 per stitch. */
  xy: Float32Array;
  /** r, g, b per stitch. */
  rgb: Uint8Array;
  /** birth, grow, weight, subject per stitch. */
  attr: Float32Array;
  passage: Uint32Array;
  indexInPassage: Uint16Array;
  byBirth: Uint32Array;
  byComplete: Uint32Array;
}

export function packStitches(
  stitches: Stitch[],
  width: number,
  height: number,
): PackedStitches {
  const n = stitches.length;
  const xy = new Float32Array(n * 4);
  const rgb = new Uint8Array(n * 3);
  const attr = new Float32Array(n * 4);
  const passage = new Uint32Array(n);
  const indexInPassage = new Uint16Array(n);
  const byBirth = new Uint32Array(n);
  const byComplete = new Uint32Array(n);
  const passages = new Set<number>();
  let maxGrow = 0.02;

  for (let i = 0; i < n; i++) {
    const s = stitches[i];
    const i4 = i * 4;
    xy[i4] = s.x0;
    xy[i4 + 1] = s.y0;
    xy[i4 + 2] = s.x1;
    xy[i4 + 3] = s.y1;
    rgb[i * 3] = s.color.r;
    rgb[i * 3 + 1] = s.color.g;
    rgb[i * 3 + 2] = s.color.b;
    attr[i4] = s.birth;
    attr[i4 + 1] = s.grow;
    attr[i4 + 2] = s.weight;
    attr[i4 + 3] = s.subject;
    passage[i] = s.passage;
    indexInPassage[i] = Math.min(65535, s.indexInPassage);
    byBirth[i] = i;
    byComplete[i] = i;
    passages.add(s.passage);
    if (s.grow > maxGrow) maxGrow = s.grow;
  }

  const birthIdx = Array.from({ length: n }, (_, i) => i);
  birthIdx.sort((a, b) => attr[a * 4] - attr[b * 4]);
  byBirth.set(birthIdx);
  const completeIdx = Array.from({ length: n }, (_, i) => i);
  completeIdx.sort((a, b) => completeAt(attr, a) - completeAt(attr, b));
  byComplete.set(completeIdx);

  return {
    count: n,
    passages: passages.size,
    width,
    height,
    maxGrow,
    xy,
    rgb,
    attr,
    passage,
    indexInPassage,
    byBirth,
    byComplete,
  };
}

function completeAt(attr: Float32Array, i: number): number {
  const i4 = i * 4;
  return attr[i4] + attr[i4 + 1];
}

export function packedBirth(p: PackedStitches, i: number): number {
  return p.attr[i * 4];
}

export function packedGrow(p: PackedStitches, i: number): number {
  return p.attr[i * 4 + 1];
}

export function packedWeight(p: PackedStitches, i: number): number {
  return p.attr[i * 4 + 2];
}

export function packedComplete(p: PackedStitches, i: number): number {
  return completeAt(p.attr, i);
}

export function packedProgress(p: PackedStitches, i: number, t: number): number {
  return growthProgress(p.attr[i * 4], p.attr[i * 4 + 1], t);
}

export function packedTransferables(p: PackedStitches): Transferable[] {
  return [
    p.xy.buffer,
    p.rgb.buffer,
    p.attr.buffer,
    p.passage.buffer,
    p.indexInPassage.buffer,
    p.byBirth.buffer,
    p.byComplete.buffer,
  ];
}

/** First index in `order` whose time is strictly greater than `value`. */
export function upperBound(
  order: Uint32Array,
  count: number,
  value: number,
  timeOf: (index: number) => number,
): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timeOf(order[mid]) <= value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
