export type GrowthMode = "sew" | "weave" | "bloom" | "colonize";
export type ColorMode = "sampled" | "sunbleached";
export type GroundMode = "hessian" | "linen" | "site";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Stitch {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: Rgb;
  /** 0–1, how much this floss belongs to the subject vs the ground. */
  subject: number;
  passage: number;
  indexInPassage: number;
  /** 0–1, assigned by the timeline. */
  birth: number;
  /** How long this stitch takes to grow, as a fraction of the full playhead. */
  grow: number;
  /** 1 = satin floss, ~0.3 = a stray fiber. */
  weight: number;
}

export interface Passage {
  id: number;
  originX: number;
  originY: number;
  stitchCount: number;
}

export interface Analysis {
  width: number;
  height: number;
  lum: Float32Array;
  mag: Float32Array;
  angle: Float32Array;
  color: Uint8ClampedArray;
}

export interface LoomParams {
  density: number;
  stitchLength: number;
  thickness: number;
  growth: GrowthMode;
  colorMode: ColorMode;
  lightAngle: number;
  durationMs: number;
  seed: number;
  /**
   * hessian — baked tan cloth rectangle (the sticker).
   * linen — baked white linen rectangle.
   * site — no baked cloth; stitches sit on the page weave.
   */
  ground: GroundMode;
  /** 0 = clean hemmed rect, 1 = threads wander onto the surrounding cloth. */
  fray: number;
}

export const DEFAULT_LOOM_PARAMS: LoomParams = {
  density: 1,
  stitchLength: 6.2,
  thickness: 1.18,
  growth: "colonize",
  colorMode: "sampled",
  lightAngle: -0.7,
  durationMs: 8500,
  seed: 7,
  ground: "site",
  fray: 0.38,
};

export const MED_PALETTE: Rgb[] = [
  { r: 196, g: 165, b: 116 }, // ochre
  { r: 196, g: 120, b: 90 }, // terracotta
  { r: 232, g: 220, b: 200 }, // bone
  { r: 138, g: 154, b: 123 }, // sage
  { r: 183, g: 164, b: 184 }, // dusty lavender
  { r: 74, g: 126, b: 199 }, // cornflower
  { r: 90, g: 78, b: 64 }, // umber
  { r: 220, g: 201, b: 168 }, // plaster
];

export const CLOTH = {
  base: "#cbb79a",
  warp: "rgba(90, 72, 48, 0.18)",
  weft: "rgba(255, 244, 220, 0.22)",
  slub: "rgba(70, 56, 38, 0.14)",
  shadow: "rgba(70, 50, 30, 0.16)",
};

/** White linen — matches the public-site fabric, not the hessian hoop. */
export const LINEN = {
  base: "#f3efe6",
  warp: "rgba(142, 134, 120, 0.16)",
  weft: "rgba(255, 252, 246, 0.42)",
  slub: "rgba(150, 140, 124, 0.1)",
  fiber: "rgba(120, 112, 98, 0.12)",
};
