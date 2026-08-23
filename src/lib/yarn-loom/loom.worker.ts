import type { LoomRequest, LoomResponse } from "./loom-protocol";
import { packedTransferables } from "./pack";
import {
  rasterizeBitmap,
  rasterizeCourtyard,
  weaveFromImageData,
} from "./weave";

const worker = self as unknown as Worker;

worker.onmessage = (event: MessageEvent<LoomRequest>) => {
  const req = event.data;
  try {
    const raster =
      req.kind === "courtyard"
        ? rasterizeCourtyard(req.maxW)
        : rasterizeBitmap(req.bitmap, req.maxW);
    if (req.kind === "image") req.bitmap.close();
    const packed = weaveFromImageData(raster.imageData, req.params);
    const response: LoomResponse = { id: req.id, ok: true, packed };
    worker.postMessage(response, packedTransferables(packed));
  } catch (err) {
    const response: LoomResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    worker.postMessage(response);
  }
};
