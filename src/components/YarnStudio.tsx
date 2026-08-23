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

type SourceKind = "courtyard" | "portrait" | "plant" | "goat" | "image";

const PRESETS: { id: SourceKind; label: string; url: string | null }[] = [
  { id: "portrait", label: "Portrait", url: "/hero-photo.jpg" },
  { id: "courtyard", label: "Courtyard", url: null },
  { id: "plant", label: "Plant", url: "/plant.png" },
  { id: "goat", label: "Goat", url: "/goat-lineart.png" },
];

const GROWTH: { id: GrowthMode; label: string; hint: string }[] = [
  { id: "colonize", label: "Colonize", hint: "Ink & chroma first" },
  { id: "sew", label: "Sew", hint: "Needle crawls, thread trails" },
  { id: "weave", label: "Weave", hint: "Warp then weft" },
  { id: "bloom", label: "Bloom", hint: "From the heart outward" },
];

const GROUNDS: { id: GroundMode; label: string; hint: string }[] = [
  {
    id: "site",
    label: "Site fabric",
    hint: "Stitches on the page weave",
  },
  {
    id: "linen",
    label: "Linen patch",
    hint: "White cloth rectangle",
  },
  {
    id: "hessian",
    label: "Hessian patch",
    hint: "Tan sticker (old look)",
  },
];

const EDGE_PRESETS: { label: string; value: number }[] = [
  { label: "Tight", value: 0 },
  { label: "Lived-in", value: 0.38 },
  { label: "Unravelled", value: 0.86 },
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

  playingRef.current = playing;
  tRef.current = t;

  const pad = frayPad(params.fray, params.ground);
  const siteGround = params.ground === "site";

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
      setPlaying(true);
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

  const size = useHoopSize(
    hoopRef,
    (analysisSize.w + pad * 2) / (analysisSize.h + pad * 2),
  );

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
    const totalW = analysisSize.w + pad * 2;
    const totalH = analysisSize.h + pad * 2;
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

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      setPlaying(false);
      setT(1);
    }
  }, [stitches]);

  const patch = <K extends keyof LoomParams>(key: K, value: LoomParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const passages = useMemo(() => {
    const ids = new Set(stitches.map((s) => s.passage));
    return ids.size;
  }, [stitches]);

  const dolly = 1;

  return (
    <div
      className="flex flex-col gap-5 lg:flex-row lg:items-start"
      style={{ fontFamily: "var(--font-geist-sans)", color: "#3b3228" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm mb-4" style={{ color: "#6d5c4c" }}>
          Pick a source or drop your own image. Site fabric sews the stitches
          into the page weave. Fray runs from a clean hem to threads that
          wander onto the cloth.
        </p>

        <div
          className={siteGround ? "-mx-2 sm:mx-0 px-2 py-8 bg-linen" : undefined}
        >
          <div
            ref={hoopRef}
            className={`relative mx-auto${siteGround ? " bg-linen" : ""}`}
            style={{
              width: "100%",
              maxWidth: HOOP_MAX_WIDTH,
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
            <div
              className="absolute inset-0 origin-center"
              style={{ transform: `scale(${dolly})` }}
            >
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
                <span
                  className="text-sm tracking-wide"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    color: "#4a3728",
                    background: "rgba(232,220,200,0.72)",
                    padding: "6px 14px",
                  }}
                >
                  {dropOver ? "Drop image onto the linen" : "Threading the needle…"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside
        className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4 p-4"
        style={{
          background: "#efe4d0",
          border: "1px solid rgba(140,90,50,0.18)",
        }}
      >
        <section>
          <Label>Source</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((p) => (
              <Chip
                key={p.id}
                active={source === p.id}
                onClick={() => {
                  setSource(p.id);
                  setImageUrl(p.url);
                }}
              >
                {p.label}
              </Chip>
            ))}
            <Chip
              active={source === "image"}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Chip>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </section>

        <section>
          <Label>Ground</Label>
          <p className="text-[11px] mt-1 mb-2" style={{ color: "#8a6d55" }}>
            Site fabric is the compositing target: no baked beige, same weave
            as the page, hoop and site sharing one cloth.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {GROUNDS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => patch("ground", g.id)}
                className="text-left px-2 py-2 text-xs"
                style={{
                  background: params.ground === g.id ? "#4a7ec7" : "#e8dcc8",
                  color: params.ground === g.id ? "#f7f1e6" : "#3b3228",
                }}
              >
                <span className="block font-medium">{g.label}</span>
                <span className="opacity-80">{g.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <Label>Edge</Label>
          <p className="text-[11px] mt-1 mb-2" style={{ color: "#8a6d55" }}>
            Tight clips to a hem. Unravelled overshoots, yaws off-grain, and
            leaves stray fibers on the cloth.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {EDGE_PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                active={Math.abs(params.fray - preset.value) < 0.03}
                onClick={() => patch("fray", preset.value)}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
          <Slider
            label="Fray"
            min={0}
            max={1}
            step={0.01}
            value={params.fray}
            onChange={(v) => patch("fray", v)}
            display={
              params.fray < 0.08
                ? "hemmed"
                : params.fray > 0.72
                  ? "unravelled"
                  : `${Math.round(params.fray * 100)}%`
            }
          />
        </section>

        <section>
          <Label>Growth</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {GROWTH.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => patch("growth", g.id)}
                className="text-left px-2 py-2 text-xs"
                style={{
                  background: params.growth === g.id ? "#4a7ec7" : "#e8dcc8",
                  color: params.growth === g.id ? "#f7f1e6" : "#3b3228",
                }}
                title={g.hint}
              >
                <span className="block font-medium">{g.label}</span>
                <span className="opacity-80">{g.hint}</span>
              </button>
            ))}
          </div>
        </section>

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
          label="Stitch length"
          min={4}
          max={14}
          step={0.1}
          value={params.stitchLength}
          onChange={(v) => patch("stitchLength", v)}
        />
        <Slider
          label="Floss weight"
          min={0.8}
          max={3.2}
          step={0.05}
          value={params.thickness}
          onChange={(v) => patch("thickness", v)}
        />
        <LightEditor
          angle={params.lightAngle}
          onChange={(v) => patch("lightAngle", v)}
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

        <section>
          <Label>Color</Label>
          <div className="flex gap-2 mt-2">
            {(["sampled", "sunbleached"] as ColorMode[]).map((m) => (
              <Chip
                key={m}
                active={params.colorMode === m}
                onClick={() => patch("colorMode", m)}
              >
                {m === "sampled" ? "Sampled" : "Sun-bleached"}
              </Chip>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (t >= 1) {
                setT(0);
                setPlaying(true);
                return;
              }
              setPlaying((p) => !p);
            }}
            className="flex-1 py-2 text-sm"
            style={{ background: "#4a7ec7", color: "#f7f1e6" }}
          >
            {playing ? "Pause" : t >= 1 ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
            className="px-3 py-2 text-sm"
            style={{ background: "#e8dcc8" }}
          >
            Rewind
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          aria-label="Playhead"
          className="w-full"
        />

        <p
          className="text-xs tabular-nums"
          style={{ fontFamily: "var(--font-space-mono)", color: "#8a6d55" }}
        >
          {stitches.length.toLocaleString()} stitches · {passages} passages
          {busy ? " · threading" : ""}
        </p>

        <button
          type="button"
          onClick={() => patch("seed", params.seed + 1)}
          className="text-xs self-start underline underline-offset-4"
          style={{ color: "#6d5c4c" }}
        >
          Re-thread with a new seed
        </button>
      </aside>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] tracking-[0.18em] uppercase"
      style={{ color: "#8a6d55" }}
    >
      {children}
    </div>
  );
}

function LightEditor({
  angle,
  onChange,
}: {
  angle: number;
  onChange: (angle: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between gap-2">
        <Label>Light</Label>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 text-xs"
          style={{
            background: open ? "#4a7ec7" : "#e8dcc8",
            color: open ? "#f7f1e6" : "#3b3228",
          }}
        >
          Edit light
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Light direction"
          className="absolute left-0 right-0 z-20 mt-2 p-3"
          style={{
            background: "#f7f1e6",
            border: "1px solid rgba(140,90,50,0.22)",
            boxShadow: "0 10px 28px rgba(70,40,20,0.12)",
          }}
        >
          <p
            className="text-[11px] mb-2 text-center"
            style={{ color: "#8a6d55" }}
          >
            Drag the lamp around the hoop
          </p>
          <LightOrbit angle={angle} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function LightOrbit({
  angle,
  onChange,
}: {
  angle: number;
  onChange: (angle: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const size = 148;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 52;
  const lampA = angle + Math.PI;
  const lampX = cx + Math.cos(lampA) * radius;
  const lampY = cy + Math.sin(lampA) * radius;

  const setFromEvent = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size - cx;
    const y = ((e.clientY - rect.top) / rect.height) * size - cy;
    if (x * x + y * y < 4) return;
    let next = Math.atan2(y, x) + Math.PI;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    onChange(next);
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      className="block mx-auto cursor-crosshair select-none"
      style={{ maxWidth: 168, touchAction: "none" }}
      aria-label="Light orbit"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        setFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        setFromEvent(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(140,90,50,0.28)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      <line
        x1={lampX}
        y1={lampY}
        x2={cx}
        y2={cy}
        stroke="rgba(74,126,199,0.45)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r="11"
        fill="#cbb79a"
        stroke="rgba(90,60,30,0.45)"
        strokeWidth="1.4"
      />
      <circle cx={cx} cy={cy} r="2.2" fill="#4a3728" />
      <circle
        cx={lampX}
        cy={lampY}
        r="8"
        fill="#f3e2a8"
        stroke="#c4a040"
        strokeWidth="1.4"
      />
      {[0, 1, 2, 3].map((i) => {
        const a = lampA + (i * Math.PI) / 2;
        const inner = 11;
        const outer = 15;
        return (
          <line
            key={i}
            x1={lampX + Math.cos(a) * inner}
            y1={lampY + Math.sin(a) * inner}
            x2={lampX + Math.cos(a) * outer}
            y2={lampY + Math.sin(a) * outer}
            stroke="#c4a040"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-xs"
      style={{
        background: active ? "#4a7ec7" : "#e8dcc8",
        color: active ? "#f7f1e6" : "#3b3228",
      }}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between mb-1">
        <Label>{label}</Label>
        <span
          className="text-[11px] tabular-nums"
          style={{ fontFamily: "var(--font-space-mono)", color: "#8a6d55" }}
        >
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
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
