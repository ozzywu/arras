import { analyzeImageData } from "./analyze";
import { applyFray } from "./fray";
import { generateStitches } from "./generate";
import { packStitches, type PackedStitches } from "./pack";
import { paintCourtyard } from "./paint-demo";
import { assignBirths } from "./timeline";
import type { Analysis, LoomParams, Stitch } from "./types";

/** Weave-relevant slice of loom params — playback fields stay on the main thread. */
export type WeaveParams = Pick<
  LoomParams,
  "density" | "stitchLength" | "colorMode" | "growth" | "seed" | "ground" | "fray"
>;

/** Params that force a new stitch set. Growth and fray reuse this cache. */
export function generateCacheKey(params: WeaveParams): string {
  const seat = params.ground === "hessian" ? "hessian" : "linen";
  return `${params.density}|${params.stitchLength}|${params.colorMode}|${params.seed}|${seat}`;
}

export function weaveFromAnalysis(
  analysis: Analysis,
  params: WeaveParams,
  generated?: Stitch[],
): { packed: PackedStitches; stitches: Stitch[] } {
  const stitches =
    generated ??
    generateStitches(analysis, {
      density: params.density,
      stitchLength: params.stitchLength,
      colorMode: params.colorMode,
      seed: params.seed,
      seat: params.ground === "hessian" ? "hessian" : "linen",
    });
  const finished = applyFray(
    stitches,
    analysis.width,
    analysis.height,
    params.fray,
    params.seed,
  );
  const born = assignBirths(
    finished,
    params.growth,
    analysis.width,
    analysis.height,
  );
  return {
    packed: packStitches(born, analysis.width, analysis.height),
    stitches,
  };
}

export function weaveFromImageData(
  imageData: ImageData,
  params: WeaveParams,
): PackedStitches {
  return weaveFromAnalysis(analyzeImageData(imageData), params).packed;
}

export function rasterizeBitmap(
  bitmap: ImageBitmap,
  maxW: number,
): { imageData: ImageData; width: number; height: number } {
  const scale = Math.min(1, maxW / Math.max(1, bitmap.width));
  const w = Math.max(32, Math.round(bitmap.width * scale));
  const h = Math.max(32, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2d unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { imageData: ctx.getImageData(0, 0, w, h), width: w, height: h };
}

export function rasterizeCourtyard(
  maxW: number,
): { imageData: ImageData; width: number; height: number } {
  const w = maxW;
  const h = Math.round(maxW * 1.22);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2d unavailable");
  paintCourtyard(ctx, w, h);
  return { imageData: ctx.getImageData(0, 0, w, h), width: w, height: h };
}
