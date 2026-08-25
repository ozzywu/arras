import type { PackedStitches } from "./pack";
import type { WeaveParams } from "./weave";

export const LOOM_NEED_BITMAP = "LOOM_NEED_BITMAP";

export type LoomRequest = {
  id: number;
  kind: "courtyard" | "image";
  params: WeaveParams;
  maxW: number;
  /** Stable id for the picture so the worker can reuse analysis. */
  sourceKey: string;
  /** Omit on retunes when the worker already has this source. */
  bitmap?: ImageBitmap;
};

export type LoomResponse =
  | { id: number; ok: true; packed: PackedStitches }
  | { id: number; ok: false; error: string };
