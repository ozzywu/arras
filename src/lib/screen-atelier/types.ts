import type { Rgb } from "@/lib/yarn-loom/types";

export type ScreenGround = "lacquer" | "gold" | "silk" | "parchment";
export type ScreenFrame = "none" | "oval" | "stepped" | "honeycomb";
export type InkMode = "gongbi" | "xieyi" | "engraved";
export type RevealMode = "wash-first" | "ink-first" | "bloom";
export type MarkKind = "wash" | "contour" | "vein" | "filigree";

export interface Mark {
  kind: MarkKind;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: Rgb;
  width: number;
  opacity: number;
  subject: number;
  birth: number;
  grow: number;
}

export interface ScreenParams {
  /** Thickness and reach of the ink contour. */
  outline: number;
  /** Watercolor bleed vs dry mineral pigment. */
  wetness: number;
  /** Gold-leaf speckle and metallic contour bias on lacquer. */
  goldLeaf: number;
  /** How far sampled color is pulled toward a museum-aged palette. */
  aging: number;
  /** Posterize / cloisonné flattening of forms. */
  flatten: number;
  /** Filigree and repeating motifs on large flat fields. */
  pattern: number;
  /** Hairline crazing on the panel ground. */
  craquelure: number;
  ground: ScreenGround;
  frame: ScreenFrame;
  ink: InkMode;
  reveal: RevealMode;
  durationMs: number;
  seed: number;
}

export const DEFAULT_SCREEN_PARAMS: ScreenParams = {
  outline: 1.15,
  wetness: 0.42,
  goldLeaf: 0.55,
  aging: 0.62,
  flatten: 0.58,
  pattern: 0.28,
  craquelure: 0.4,
  ground: "lacquer",
  frame: "oval",
  ink: "gongbi",
  reveal: "wash-first",
  durationMs: 9000,
  seed: 11,
};

export const SCREEN_INK: Rgb = { r: 28, g: 22, b: 18 };
export const SCREEN_GOLD: Rgb = { r: 204, g: 168, b: 96 };
export const SCREEN_PALE_GOLD: Rgb = { r: 232, g: 210, b: 150 };
export const SCREEN_LACQUER: Rgb = { r: 14, g: 12, b: 10 };
