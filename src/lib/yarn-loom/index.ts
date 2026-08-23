import { analyzeImageData } from "./analyze";
import { applyFray } from "./fray";
import { generateStitches } from "./generate";
import { paintCourtyard } from "./paint-demo";
import { assignBirths } from "./timeline";
import type { Analysis, LoomParams, Stitch } from "./types";

export function analysisCanvas(
  width: number,
  height: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

export function paintSourceFromImage(
  image: CanvasImageSource,
  maxW = 400,
): { canvas: HTMLCanvasElement; analysis: Analysis } {
  const iw =
    "naturalWidth" in image && typeof image.naturalWidth === "number"
      ? image.naturalWidth || (image as HTMLImageElement).width
      : (image as HTMLCanvasElement).width;
  const ih =
    "naturalHeight" in image && typeof image.naturalHeight === "number"
      ? image.naturalHeight || (image as HTMLImageElement).height
      : (image as HTMLCanvasElement).height;
  const scale = Math.min(1, maxW / Math.max(1, iw));
  const w = Math.max(32, Math.round(iw * scale));
  const h = Math.max(32, Math.round(ih * scale));
  const canvas = analysisCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, w, h);
  return { canvas, analysis: analyzeImageData(ctx.getImageData(0, 0, w, h)) };
}

export function paintDemoSource(maxW = 420): {
  canvas: HTMLCanvasElement;
  analysis: Analysis;
} {
  const w = maxW;
  const h = Math.round(maxW * 1.22);
  const canvas = analysisCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  paintCourtyard(ctx, w, h);
  return { canvas, analysis: analyzeImageData(ctx.getImageData(0, 0, w, h)) };
}

export function buildEmbroidery(
  analysis: Analysis,
  params: LoomParams,
): Stitch[] {
  const stitches = generateStitches(analysis, {
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
  return assignBirths(
    finished,
    params.growth,
    analysis.width,
    analysis.height,
  );
}

export { paintCloth, linenPatternUrl, linenBackgroundStyle } from "./cloth";
export { frayPad, applyFray } from "./fray";
export type { GroundMode, LoomParams, Stitch } from "./types";
export { playheadEase } from "./timeline";
export {
  renderStitches,
  drawNeedle,
  drawMotes,
  drawPackedStitch,
  collectPackedNeedles,
  completeBound,
  birthWindow,
} from "./render";
export type { Needle } from "./render";
export { packStitches, packedProgress } from "./pack";
export type { PackedStitches } from "./pack";
export { weaveFromImageData } from "./weave";
export type { WeaveParams } from "./weave";
export { LoomClient } from "./loom-client";
