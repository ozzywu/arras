"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  birthWindow,
  buildEmbroidery,
  collectPackedNeedles,
  completeBound,
  drawMotes,
  drawNeedle,
  drawPackedStitch,
  frayPad,
  imageUrlOf,
  LoomClient,
  loomParamsOf,
  packStitches,
  packedProgress,
  paintCloth,
  paintDemoSource,
  paintSourceFromImage,
  playheadEase,
  type ArrasRecipe,
  type PackedStitches,
  type WeaveParams,
} from "@/lib/yarn-loom";
import { LINEN, type LoomParams } from "@/lib/yarn-loom/types";
import { Badge } from "@/components/ui/badge";

/** Desktop hoop width. Floss is tuned here; phones scale thickness to match. */
export const HOOP_MAX_WIDTH = 620;

export type YarnHoopHandle = {
  capturePng: () => Promise<Blob | null>;
};

export type HoopStats = {
  busy: boolean;
  stitchCount: number;
  passages: number;
  width: number;
  height: number;
};

type YarnHoopProps = {
  recipe: ArrasRecipe;
  /** Overrides `recipe.src` — used for blob uploads. */
  src?: string | null;
  t: number;
  className?: string;
  /** Fill the parent instead of capping at HOOP_MAX_WIDTH (embed iframe). */
  fillParent?: boolean;
  interactive?: boolean;
  dropOver?: boolean;
  onDropOver?: (over: boolean) => void;
  onFiles?: (files: FileList | null) => void;
  onStats?: (stats: HoopStats) => void;
  onReady?: () => void;
};

function weaveParamsOf(params: LoomParams): WeaveParams {
  return {
    density: params.density,
    stitchLength: params.stitchLength,
    colorMode: params.colorMode,
    growth: params.growth,
    seed: params.seed,
    ground: params.ground,
    fray: params.fray,
  };
}

async function weaveOnMain(
  recipe: ArrasRecipe,
  imageUrl: string | null,
): Promise<PackedStitches> {
  const params = loomParamsOf(recipe);
  const painted =
    recipe.source === "courtyard" || !imageUrl
      ? paintDemoSource()
      : paintSourceFromImage(await loadImage(imageUrl));
  return packStitches(
    buildEmbroidery(painted.analysis, params),
    painted.canvas.width,
    painted.canvas.height,
  );
}

export const YarnHoop = forwardRef<YarnHoopHandle, YarnHoopProps>(
  function YarnHoop(
    {
      recipe,
      src,
      t,
      className,
      fillParent = false,
      interactive = false,
      dropOver = false,
      onDropOver,
      onFiles,
      onStats,
      onReady,
    },
    ref,
  ) {
    const hoopRef = useRef<HTMLDivElement>(null);
    const clothRef = useRef<HTMLCanvasElement>(null);
    const stitchRef = useRef<HTMLCanvasElement>(null);
    const liveRef = useRef<HTMLCanvasElement>(null);
    const loomRef = useRef<LoomClient | null>(null);
    const lastCompleteRef = useRef(0);
    const lastEasedRef = useRef(0);
    const statsRef = useRef(onStats);
    const readyRef = useRef(onReady);

    useEffect(() => {
      statsRef.current = onStats;
    }, [onStats]);
    useEffect(() => {
      readyRef.current = onReady;
    }, [onReady]);

    const params = loomParamsOf(recipe);
    const imageUrl = src === undefined ? imageUrlOf(recipe) : src;
    const [packed, setPacked] = useState<PackedStitches | null>(null);
    const [analysisSize, setAnalysisSize] = useState({ w: 340, h: 415 });
    const [busy, setBusy] = useState(true);

    const pad = frayPad(params.fray, params.ground);
    const siteGround = params.ground === "site";

    const genKey = [
      recipe.source,
      imageUrl ?? "",
      params.density,
      params.stitchLength,
      params.colorMode,
      params.growth,
      params.seed,
      params.fray,
      params.ground,
    ].join("|");
    const [debouncedGenKey, setDebouncedGenKey] = useState(genKey);

    useEffect(() => {
      const id = window.setTimeout(() => setDebouncedGenKey(genKey), 90);
      return () => window.clearTimeout(id);
    }, [genKey]);

    useEffect(() => {
      const loom = new LoomClient();
      loomRef.current = loom;
      return () => {
        loom.terminate();
        loomRef.current = null;
      };
    }, []);

    const applyPacked = (next: PackedStitches) => {
      setAnalysisSize({ w: next.width, h: next.height });
      setPacked(next);
      setBusy(false);
      statsRef.current?.({
        busy: false,
        stitchCount: next.count,
        passages: next.passages,
        width: next.width,
        height: next.height,
      });
      readyRef.current?.();
    };

    useEffect(() => {
      let cancelled = false;
      const run = async () => {
        setBusy(true);
        statsRef.current?.({
          busy: true,
          stitchCount: packed?.count ?? 0,
          passages: packed?.passages ?? 0,
          width: analysisSize.w,
          height: analysisSize.h,
        });
        const weave = weaveParamsOf(params);
        try {
          const loom = loomRef.current;
          let next: PackedStitches;
          if (loom) {
            if (recipe.source === "courtyard" || !imageUrl) {
              next = await loom.weaveCourtyard(weave);
            } else {
              const img = await loadImage(imageUrl);
              if (cancelled) return;
              const bitmap = await createImageBitmap(img);
              if (cancelled) {
                bitmap.close();
                return;
              }
              next = await loom.weaveBitmap(bitmap, weave);
            }
          } else {
            next = await weaveOnMain(recipe, imageUrl);
          }
          if (cancelled) return;
          applyPacked(next);
        } catch {
          if (cancelled) return;
          try {
            const next = await weaveOnMain(recipe, imageUrl);
            if (cancelled) return;
            applyPacked(next);
          } catch {
            if (!cancelled) {
              setBusy(false);
              statsRef.current?.({
                busy: false,
                stitchCount: packed?.count ?? 0,
                passages: packed?.passages ?? 0,
                width: analysisSize.w,
                height: analysisSize.h,
              });
            }
          }
        }
      };
      void run();
      return () => {
        cancelled = true;
      };
      // Thickness, light, and duration are playback-only and must not re-thread.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedGenKey]);

    const size = useHoopSize(
      hoopRef,
      (analysisSize.w + pad * 2) / (analysisSize.h + pad * 2),
    );

    useEffect(() => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      for (const canvas of [
        clothRef.current,
        stitchRef.current,
        liveRef.current,
      ]) {
        if (!canvas || size.w === 0) continue;
        canvas.width = Math.round(size.w * dpr);
        canvas.height = Math.round(size.h * dpr);
        const ctx = canvas.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      lastEasedRef.current = -1;
      if (clothRef.current && size.w > 0) {
        const ctx = clothRef.current.getContext("2d")!;
        ctx.clearRect(0, 0, size.w, size.h);
        if (params.ground !== "site") {
          paintCloth(ctx, size.w, size.h, params.seed, params.ground);
        }
      }
    }, [size.h, size.w, params.seed, params.ground]);

    useEffect(() => {
      lastEasedRef.current = -1;
      lastCompleteRef.current = 0;
    }, [params.lightAngle, params.thickness, packed, pad]);

    useEffect(() => {
      const canvas = stitchRef.current;
      const live = liveRef.current;
      if (!canvas || !live || size.w === 0 || !packed) return;
      const ctx = canvas.getContext("2d")!;
      const liveCtx = live.getContext("2d")!;
      const eased = playheadEase(t);
      const totalW = analysisSize.w + pad * 2;
      const totalH = analysisSize.h + pad * 2;
      const sx = size.w / totalW;
      const sy = size.h / totalH;
      const visualScale = size.w / HOOP_MAX_WIDTH;
      const last = lastEasedRef.current;
      const completeEnd = completeBound(packed, eased);
      const scrubbedBack = eased < last - 0.0005;
      const restyle = last < 0;

      const strokeDone = (from: number, to: number) => {
        for (let k = from; k < to; k++) {
          drawPackedStitch(
            ctx,
            packed,
            packed.byComplete[k],
            1,
            params.thickness,
            params.lightAngle,
            sx,
            sy,
            pad,
            pad,
            visualScale,
          );
        }
      };

      if (scrubbedBack || restyle) {
        ctx.clearRect(0, 0, size.w, size.h);
        strokeDone(0, completeEnd);
        lastCompleteRef.current = completeEnd;
      } else if (completeEnd > lastCompleteRef.current) {
        strokeDone(lastCompleteRef.current, completeEnd);
        lastCompleteRef.current = completeEnd;
      }

      liveCtx.clearRect(0, 0, size.w, size.h);
      const growing = birthWindow(packed, eased);
      for (let k = growing.start; k < growing.end; k++) {
        const i = packed.byBirth[k];
        const p = packedProgress(packed, i, eased);
        if (p <= 0 || p >= 1) continue;
        drawPackedStitch(
          liveCtx,
          packed,
          i,
          p,
          params.thickness,
          params.lightAngle,
          sx,
          sy,
          pad,
          pad,
          visualScale,
        );
      }
      if (eased < 0.98) {
        const needles = collectPackedNeedles(packed, eased);
        for (const n of needles) {
          drawNeedle(liveCtx, n, sx, sy, pad, pad, visualScale);
        }
      }
      drawMotes(liveCtx, size.w, size.h, eased);
      lastEasedRef.current = eased;
    }, [
      analysisSize.h,
      analysisSize.w,
      packed,
      params.lightAngle,
      params.thickness,
      size.h,
      size.w,
      t,
      pad,
    ]);

    useImperativeHandle(ref, () => ({
      capturePng: () =>
        captureCanvases(
          [clothRef.current, stitchRef.current, liveRef.current],
          params.ground === "site" ? LINEN.base : null,
        ),
    }));

    return (
      <div
        ref={hoopRef}
        className={`relative mx-auto${siteGround ? " bg-linen" : ""}${className ? ` ${className}` : ""}`}
        style={{
          width: "100%",
          maxWidth: fillParent ? "100%" : HOOP_MAX_WIDTH,
          aspectRatio: `${analysisSize.w + pad * 2} / ${analysisSize.h + pad * 2}`,
          overflow: params.fray > 0.04 || siteGround ? "visible" : "hidden",
          ...(siteGround
            ? { boxShadow: "none", borderRadius: 0 }
            : {
                background:
                  params.ground === "linen" ? LINEN.base : "#cbb79a",
                boxShadow:
                  "0 18px 50px rgba(70,40,20,0.18), inset 0 0 0 1px rgba(90,60,30,0.18)",
                borderRadius: params.fray > 0.25 ? 0 : 4,
              }),
        }}
        onDragOver={
          interactive
            ? (e) => {
                e.preventDefault();
                onDropOver?.(true);
              }
            : undefined
        }
        onDragLeave={interactive ? () => onDropOver?.(false) : undefined}
        onDrop={
          interactive
            ? (e) => {
                e.preventDefault();
                onDropOver?.(false);
                onFiles?.(e.dataTransfer.files);
              }
            : undefined
        }
      >
        <div className="absolute inset-0 origin-center">
          <canvas ref={clothRef} className="absolute inset-0 h-full w-full" />
          <canvas ref={stitchRef} className="absolute inset-0 h-full w-full" />
          <canvas ref={liveRef} className="absolute inset-0 h-full w-full" />
        </div>

        {(busy || dropOver) && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: dropOver
                ? siteGround
                  ? "rgba(243,239,230,0.55)"
                  : "rgba(203,183,154,0.55)"
                : "transparent",
            }}
          >
            <Badge
              variant="secondary"
              className="h-auto rounded-md px-3 py-1.5 font-heading text-sm font-normal tracking-wide text-foreground"
            >
              {dropOver ? "Drop image onto the linen" : "Threading the needle…"}
            </Badge>
          </div>
        )}
      </div>
    );
  },
);

YarnHoop.displayName = "YarnHoop";

export function useYarnPlayhead(durationMs: number) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const playingRef = useRef(false);
  const tRef = useRef(0);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!playing) {
      lastTs.current = null;
      return;
    }
    let raf = 0;
    const tick = (ts: number) => {
      if (!playingRef.current) return;
      const last = lastTs.current ?? ts;
      lastTs.current = ts;
      const dt = Math.min(48, ts - last);
      const next = Math.min(1, tRef.current + dt / durationMs);
      setT(next);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationMs]);

  const begin = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      setT(1);
      return;
    }
    setPlaying(true);
  };

  return { playing, setPlaying, t, setT, begin };
}

function useHoopSize(
  ref: React.RefObject<HTMLDivElement | null>,
  aspect: number,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (h > 0 && Math.abs(h - w / aspect) > 2) {
        setSize({ w, h });
        return;
      }
      setSize({ w, h: w / aspect });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, ref]);
  return size;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

async function captureCanvases(
  canvases: (HTMLCanvasElement | null)[],
  fill: string | null = null,
): Promise<Blob | null> {
  const layers = canvases.filter((c): c is HTMLCanvasElement => !!c && c.width > 0);
  const first = layers[0];
  if (!first) return null;
  const out = document.createElement("canvas");
  out.width = first.width;
  out.height = first.height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  for (const layer of layers) ctx.drawImage(layer, 0, 0);
  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/png");
  });
}
