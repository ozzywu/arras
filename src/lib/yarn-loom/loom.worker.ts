import type { Analysis, Stitch } from "./types";
import { analyzeImageData } from "./analyze";
import { LOOM_NEED_BITMAP, type LoomRequest, type LoomResponse } from "./loom-protocol";
import { packedTransferables } from "./pack";
import {
  generateCacheKey,
  rasterizeBitmap,
  rasterizeCourtyard,
  weaveFromAnalysis,
} from "./weave";

const worker = self as unknown as Worker;

type Cache = {
  sourceKey: string;
  analysis: Analysis;
  genKey: string;
  stitches: Stitch[];
};

let cache: Cache | null = null;

function analysisFor(req: LoomRequest): Analysis {
  const key = `${req.sourceKey}|${req.maxW}`;
  if (cache?.sourceKey === key) {
    if (req.bitmap) req.bitmap.close();
    return cache.analysis;
  }

  const raster =
    req.kind === "courtyard"
      ? rasterizeCourtyard(req.maxW)
      : req.bitmap
        ? rasterizeBitmap(req.bitmap, req.maxW)
        : null;
  if (!raster) throw new Error(LOOM_NEED_BITMAP);
  if (req.bitmap) req.bitmap.close();

  const analysis = analyzeImageData(raster.imageData);
  cache = { sourceKey: key, analysis, genKey: "", stitches: [] };
  return analysis;
}

worker.onmessage = (event: MessageEvent<LoomRequest>) => {
  const req = event.data;
  try {
    const analysis = analysisFor(req);
    const genKey = generateCacheKey(req.params);
    const reused =
      cache && cache.sourceKey === `${req.sourceKey}|${req.maxW}` && cache.genKey === genKey
        ? cache.stitches
        : undefined;
    const { packed, stitches } = weaveFromAnalysis(analysis, req.params, reused);
    if (cache) {
      cache.genKey = genKey;
      cache.stitches = stitches;
    }
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
