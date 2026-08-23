"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildEmbroidery,
  drawMotes,
  drawNeedle,
  frayPad,
  paintCloth,
  paintDemoSource,
  paintSourceFromImage,
  playheadEase,
  renderStitches,
} from "@/lib/yarn-loom";
import { stitchProgress } from "@/lib/yarn-loom/timeline";
import {
  DEFAULT_LOOM_PARAMS,
  LINEN,
  type ColorMode,
  type GroundMode,
  type GrowthMode,
  type LoomParams,
  type Stitch,
} from "@/lib/yarn-loom/types";
import {
  CourtyardThumb,
  LightOrbit,
  PlusMark,
  Segmented,
  Slider,
  SourceTile,
  Transport,
} from "@/components/studio-ui";

type SourceKind = "courtyard" | "portrait" | "plant" | "goat" | "image";

const PRESETS: { id: SourceKind; label: string; url: string | null }[] = [
  { id: "portrait", label: "Portrait", url: "/hero-photo.jpg" },
  { id: "courtyard", label: "Courtyard", url: null },
  { id: "plant", label: "Plant", url: "/plant.png" },
  { id: "goat", label: "Goat", url: "/goat-lineart.png" },
];

const GROWTH: { id: GrowthMode; label: string; title: string }[] = [
  { id: "colonize", label: "Colonize", title: "Ink and chroma first" },
  { id: "sew", label: "Sew", title: "Needle crawls, thread trails" },
  { id: "weave", label: "Weave", title: "Warp then weft" },
  { id: "bloom", label: "Bloom", title: "From the heart outward" },
];

const GROUNDS: { id: GroundMode; label: string }[] = [
  { id: "site", label: "Plain" },
  { id: "linen", label: "Linen" },
  { id: "hessian", label: "Hessian" },
];

const EDGE_PRESETS: { id: string; label: string; value: number }[] = [
  { id: "tight", label: "Tight", value: 0 },
  { id: "lived-in", label: "Lived-in", value: 0.38 },
  { id: "unravelled", label: "Unravelled", value: 0.86 },
];

/** Desktop hoop width. Floss is tuned here; phones scale thickness to match. */
const HOOP_MAX_WIDTH = 620;

export default function YarnStudio() {
  const hoopRef = useRef<HTMLDivElement>(null);
  const clothRef = useRef<HTMLCanvasElement>(null);
  const stitchRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [params, setParams] = useState<LoomParams>(DEFAULT_LOOM_PARAMS);
  const [source, setSource] = useState<SourceKind>("portrait");
  const [imageUrl, setImageUrl] = useState<string | null>("/hero-photo.jpg");
  const [stitches, setStitches] = useState<Stitch[]>([]);
  const [analysisSize, setAnalysisSize] = useState({ w: 340, h: 415 });
  const [busy, setBusy] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dropOver, setDropOver] = useState(false);

  const playingRef = useRef(false);
  const tRef = useRef(0);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    playingRef.current = playing;
    tRef.current = t;
  });

  const pad = frayPad(params.fray, params.ground);
  const siteGround = params.ground === "site";
  const totalW = analysisSize.w + pad * 2;
  const totalH = analysisSize.h + pad * 2;
  const aspect = totalW / totalH;

  const genKey = [
    source,
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
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      setPlaying(false);
      setT(0);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;

      const painted =
        source === "courtyard" || !imageUrl
          ? paintDemoSource()
          : paintSourceFromImage(await loadImage(imageUrl));
      if (cancelled) return;

      const built = buildEmbroidery(painted.analysis, params);
      setAnalysisSize({ w: painted.canvas.width, h: painted.canvas.height });
      setStitches(built);
      setBusy(false);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reduce.matches) {
        setPlaying(false);
        setT(1);
      } else {
        setPlaying(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // Thickness, light, and duration are playback-only and must not re-thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedGenKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
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
      const next = Math.min(1, tRef.current + dt / params.durationMs);
      setT(next);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, params.durationMs]);

  const size = useHoopSize(hoopRef, aspect);

  const lastEasedRef = useRef(0);

  useEffect(() => {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    for (const canvas of [clothRef.current, stitchRef.current, liveRef.current]) {
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
  }, [params.lightAngle, params.thickness, stitches, pad]);

  useEffect(() => {
    const canvas = stitchRef.current;
    const live = liveRef.current;
    if (!canvas || !live || size.w === 0) return;
    const ctx = canvas.getContext("2d")!;
    const liveCtx = live.getContext("2d")!;
    const eased = playheadEase(t);
    const sx = size.w / totalW;
    const sy = size.h / totalH;
    const visualScale = size.w / HOOP_MAX_WIDTH;
    const last = lastEasedRef.current;
    const scrubbedBack = eased < last - 0.0005;
    const restyle = last < 0;

    if (scrubbedBack || restyle) {
      ctx.clearRect(0, 0, size.w, size.h);
      const done = stitches.filter((s) => stitchProgress(s, eased) >= 1);
      renderStitches(ctx, {
        stitches: done,
        t: 1,
        thickness: params.thickness,
        lightAngle: params.lightAngle,
        scaleX: sx,
        scaleY: sy,
        originX: pad,
        originY: pad,
        visualScale,
      });
    } else {
      const newly = stitches.filter(
        (s) => stitchProgress(s, eased) >= 1 && stitchProgress(s, last) < 1,
      );
      if (newly.length) {
        renderStitches(ctx, {
          stitches: newly,
          t: 1,
          thickness: params.thickness,
          lightAngle: params.lightAngle,
          scaleX: sx,
          scaleY: sy,
          originX: pad,
          originY: pad,
          visualScale,
        });
      }
    }

    liveCtx.clearRect(0, 0, size.w, size.h);
    const growing = stitches.filter((s) => {
      const p = stitchProgress(s, eased);
      return p > 0 && p < 1;
    });
    const needles = renderStitches(liveCtx, {
      stitches: growing,
      t: eased,
      thickness: params.thickness,
      lightAngle: params.lightAngle,
      scaleX: sx,
      scaleY: sy,
      originX: pad,
      originY: pad,
      visualScale,
    });
    if (eased < 0.98) {
      for (const n of needles) {
        drawNeedle(liveCtx, n, sx, sy, pad, pad, visualScale);
      }
    }
    drawMotes(liveCtx, size.w, size.h, eased);
    lastEasedRef.current = eased;
  }, [
    analysisSize.h,
    analysisSize.w,
    params.lightAngle,
    params.thickness,
    size.h,
    size.w,
    stitches,
    t,
    pad,
    totalH,
    totalW,
  ]);

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
    setSource("image");
  };

  const patch = <K extends keyof LoomParams>(key: K, value: LoomParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const passages = useMemo(() => {
    const ids = new Set(stitches.map((s) => s.passage));
    return ids.size;
  }, [stitches]);

  const activeEdge =
    EDGE_PRESETS.find((preset) => Math.abs(params.fray - preset.value) < 0.03)
      ?.id ?? "lived-in";

  const stageFill = siteGround
    ? "#f6f6f6"
    : params.ground === "linen"
      ? LINEN.base
      : "#cbb79a";

  return (
    <div className="studio h-full lg:h-auto lg:max-w-[1180px] lg:mx-auto lg:px-8 lg:pb-16 flex flex-col lg:flex-row lg:items-start lg:gap-10">
      <section className="shrink-0 px-4 pb-3 lg:flex-1 lg:px-0 lg:sticky lg:top-6">
        <div
          className="preview-frame mx-auto overflow-hidden rounded-[24px] bg-card"
          style={{
            ["--preview-aspect" as string]: String(aspect),
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08)",
          }}
        >
          <div
            ref={hoopRef}
            className="relative w-full h-full"
            title="Drop an image"
            style={{ background: stageFill }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropOver(true);
            }}
            onDragLeave={() => setDropOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropOver(false);
              onFiles(e.dataTransfer.files);
            }}
          >
            <canvas ref={clothRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={stitchRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={liveRef} className="absolute inset-0 h-full w-full" />
            <Transport
              playing={playing}
              t={t}
              busy={busy}
              stitchCount={stitches.length}
              passages={passages}
              onToggle={() => {
                if (t >= 1) {
                  setT(0);
                  setPlaying(true);
                  return;
                }
                setPlaying((p) => !p);
              }}
              onRewind={() => {
                setT(0);
                setPlaying(true);
              }}
              onScrub={(next) => {
                setPlaying(false);
                setT(next);
              }}
            />
            {dropOver ? (
              <div className="absolute inset-0 grid place-items-center bg-white/70 text-[15px] font-medium">
                Drop photo
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex-1 min-h-0 bg-card rounded-t-[24px] lg:rounded-[24px] lg:w-[340px] lg:flex-none lg:mt-0 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] lg:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.08)] flex flex-col">
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#d4d4d4]" />
        </div>
        <div className="sheet-scroll flex-1 min-h-0 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 lg:px-5 lg:py-6 flex flex-col gap-6">
          <div className="thumb-row flex gap-2.5 overflow-x-auto pb-1">
            {PRESETS.map((preset) => (
              <SourceTile
                key={preset.id}
                label={preset.label}
                active={source === preset.id}
                onClick={() => {
                  setSource(preset.id);
                  setImageUrl(preset.url);
                }}
              >
                {preset.id === "courtyard" ? (
                  <CourtyardThumb />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preset.url ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition:
                        preset.id === "portrait" ? "center top" : "center",
                    }}
                  />
                )}
              </SourceTile>
            ))}
            <SourceTile
              label="Upload image"
              active={source === "image"}
              onClick={() => fileRef.current?.click()}
            >
              {source === "image" && imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-muted bg-well">
                  <PlusMark />
                </span>
              )}
            </SourceTile>
          </div>

          <Segmented
            label="Cloth"
            value={params.ground}
            options={GROUNDS}
            onChange={(id) => patch("ground", id)}
          />
          <Segmented
            label="Edge"
            value={activeEdge}
            options={EDGE_PRESETS.map((preset) => ({
              id: preset.id,
              label: preset.label,
            }))}
            onChange={(id) => {
              const preset = EDGE_PRESETS.find((item) => item.id === id);
              if (preset) patch("fray", preset.value);
            }}
          />
          <Segmented
            label="Growth"
            value={params.growth}
            options={GROWTH}
            columns={2}
            onChange={(id) => patch("growth", id)}
          />
          <Segmented
            label="Color"
            value={params.colorMode}
            options={
              [
                { id: "sampled", label: "Sampled" },
                { id: "sunbleached", label: "Sun-bleached" },
              ] satisfies { id: ColorMode; label: string }[]
            }
            onChange={(id) => patch("colorMode", id)}
          />

          <div className="flex flex-col gap-4 pt-1">
            <Slider
              label="Density"
              min={0.5}
              max={1}
              step={0.01}
              value={params.density}
              onChange={(v) => patch("density", v)}
              display={`${Math.round(params.density * 100)}%`}
            />
            <Slider
              label="Stitch"
              min={4}
              max={14}
              step={0.1}
              value={params.stitchLength}
              onChange={(v) => patch("stitchLength", v)}
            />
            <Slider
              label="Floss"
              min={0.8}
              max={3.2}
              step={0.05}
              value={params.thickness}
              onChange={(v) => patch("thickness", v)}
            />
            <Slider
              label="Duration"
              min={4000}
              max={28000}
              step={250}
              value={params.durationMs}
              onChange={(v) => patch("durationMs", v)}
              display={`${(params.durationMs / 1000).toFixed(1)}s`}
            />
          </div>

          <LightOrbit
            angle={params.lightAngle}
            onChange={(v) => patch("lightAngle", v)}
          />

          <button
            type="button"
            onClick={() => patch("seed", params.seed + 1)}
            className="text-[15px] font-medium self-start text-muted"
          >
            Re-thread
          </button>
        </div>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
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
      setSize({ w, h: h > 0 ? h : w / aspect });
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
