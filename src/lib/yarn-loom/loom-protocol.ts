import type { PackedStitches } from "./pack";
import type { WeaveParams } from "./weave";

export type LoomRequest =
  | {
      id: number;
      kind: "courtyard";
      params: WeaveParams;
      maxW: number;
    }
  | {
      id: number;
      kind: "image";
      params: WeaveParams;
      maxW: number;
      bitmap: ImageBitmap;
    };

export type LoomResponse =
  | { id: number; ok: true; packed: PackedStitches }
  | { id: number; ok: false; error: string };
