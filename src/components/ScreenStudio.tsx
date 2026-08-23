"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildScreen,
  drawBrush,
  lacquerBackgroundStyle,
  markProgress,
  paintDemoSource,
  paintPanelFrame,
  paintPanelGround,
  paintSourceFromImage,
  renderMarks,
  screenPlayheadEase,
} from "@/lib/screen-atelier";
import {
  DEFAULT_SCREEN_PARAMS,
  type InkMode,
  type RevealMode,
  type ScreenFrame,
  type ScreenGround,
  type ScreenParams,
  type Mark,
} from "@/lib/screen-atelier/types";

type SourceKind = "courtyard" | "portrait" | "plant" | "goat" | "image";

const PRESETS: { id: SourceKind; label: string; url: string | null }[] = [
  { id: "portrait", label: "Portrait", url: "/hero-photo.jpg" },
  { id: "courtyard", label: "Courtyard", url: null },
  { id: "plant", label: "Plant", url: "/plant.png" },
  { id: "goat", label: "Goat", url: "/goat-lineart.png" },
];

const GROUNDS: { id: ScreenGround; label: string; hint: string }[] = [
  { id: "lacquer", label: "Lacquer", hint: "Black kuancai ground" },
  { id: "gold", label: "Gold leaf", hint: "Mottled mineral gold" },
  { id: "silk", label: "Silk", hint: "Warm woven panel" },
  { id: "parchment", label: "Parchment", hint: "Aged paper wash" },
];

const FRAMES: { id: ScreenFrame; label: string; hint: string }[] = [
  { id: "none", label: "Open", hint: "No surround" },
  { id: "oval", label: "Oval", hint: "Scalloped vignette" },
  { id: "stepped", label: "Stepped", hint: "Geometric border" },
  { id: "honeycomb", label: "Honeycomb", hint: "Floral hex band" },
];

const INKS: { id: InkMode; label: string; hint: string }[] = [
  { id: "gongbi", label: "Gongbi", hint: "Fine court line" },
  { id: "xieyi", label: "Xieyi", hint: "Wet, fewer strokes" },
  { id: "engraved", label: "Engraved", hint: "Cloisonné wire" },
];

const REVEALS: { id: RevealMode; label: string; hint: string }[] = [
  { id: "wash-first", label: "Wash first", hint: "Pigment, then ink" },
  { id: "ink-first", label: "Ink first", hint: "Bone, then color" },
  { id: "bloom", label: "Bloom", hint: "From the heart out" },
];

export default function ScreenStudio() {
  const hoopRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLCanvasElement>(null);
  const settleRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [params, setParams] = useState<ScreenParams>(DEFAULT_SCREEN_PARAMS);
  const [source, setSource] = useState<SourceKind>("plant");
  const [imageUrl, setImageUrl] = useState<string | null>("/plant.png");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [analysisSize, setAnalysisSize] = useState({ w: 340, h: 415 });
  const [busy, setBusy] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dropOver, setDropOver] = useState(false);

  const playingRef = useRef(false);
  const tRef = useRef(0);
  const lastTs = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
    tRef.current = t;
  });

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const genKey = [
    source,
    imageUrl ?? "",
    params.outline,
    params.wetness,
    params.goldLeaf,
    params.aging,
    params.flatten,
    params.pattern,
    params.ink,
    params.reveal,
    params.ground,
    params.seed,
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
      const built = buildScreen(painted.analysis, params);
      setAnalysisSize({ w: painted.canvas.width, h: painted.canvas.height });
      setMarks(built);
      setBusy(false);
      if (reduceMotionRef.current) {
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
    // duration / frame / craquelure restyle without re-inking
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

  const size = useHoopSize(hoopRef, analysisSize.w / analysisSize.h);
  const lastEasedRef = useRef(0);

  useEffect(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const canvas of [
      groundRef.current,
      settleRef.current,
      liveRef.current,
      frameRef.current,
    ]) {
      if (!canvas || size.w === 0) continue;
      canvas.width = Math.round(size.w * dpr);
      canvas.height = Math.round(size.h * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    lastEasedRef.current = -1;
    if (groundRef.current && size.w > 0) {
      const ctx = groundRef.current.getContext("2d")!;
      ctx.clearRect(0, 0, size.w, size.h);
      paintPanelGround(ctx, size.w, size.h, params);
    }
    if (frameRef.current && size.w > 0) {
      const ctx = frameRef.current.getContext("2d")!;
      ctx.clearRect(0, 0, size.w, size.h);
      paintPanelFrame(ctx, size.w, size.h, params);
    }
    // Ground and frame restyle from overlay knobs; playback knobs stay out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    size.h,
    size.w,
    params.seed,
    params.ground,
    params.craquelure,
    params.goldLeaf,
    params.frame,
  ]);

  useEffect(() => {
    lastEasedRef.current = -1;
  }, [marks, params.wetness]);

  useEffect(() => {
    const settled = settleRef.current;
    const live = liveRef.current;
    if (!settled || !live || size.w === 0) return;
    const ctx = settled.getContext("2d")!;
    const liveCtx = live.getContext("2d")!;
    const eased = screenPlayheadEase(t);
    const sx = size.w / analysisSize.w;
    const sy = size.h / analysisSize.h;
    const last = lastEasedRef.current;
    const scrubbedBack = eased < last - 0.0005;
    const restyle = last < 0;

    if (scrubbedBack || restyle) {
      ctx.clearRect(0, 0, size.w, size.h);
      const done = marks.filter((m) => markProgress(m, eased) >= 1);
      renderMarks(ctx, {
        marks: done,
        t: 1,
        scaleX: sx,
        scaleY: sy,
        wetness: params.wetness,
      });
    } else {
      const newly = marks.filter(
        (m) => markProgress(m, eased) >= 1 && markProgress(m, last) < 1,
      );
      if (newly.length) {
        renderMarks(ctx, {
          marks: newly,
          t: 1,
          scaleX: sx,
          scaleY: sy,
          wetness: params.wetness,
        });
      }
    }

    liveCtx.clearRect(0, 0, size.w, size.h);
    const growing = marks.filter((m) => {
      const p = markProgress(m, eased);
      return p > 0 && p < 1;
    });
    renderMarks(liveCtx, {
      marks: growing,
      t: eased,
      scaleX: sx,
      scaleY: sy,
      wetness: params.wetness,
    });
    if (eased < 0.98) {
      const tips = growing.filter((m) => m.kind !== "wash").slice(-3);
      for (const m of tips) {
        const p = markProgress(m, eased);
        drawBrush(
          liveCtx,
          m.x0 + (m.x1 - m.x0) * p,
          m.y0 + (m.y1 - m.y0) * p,
          m.x1 - m.x0,
          m.y1 - m.y0,
          sx,
          sy,
        );
      }
    }
    lastEasedRef.current = eased;
  }, [
    analysisSize.h,
    analysisSize.w,
    marks,
    params.wetness,
    size.h,
    size.w,
    t,
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

  const patch = <K extends keyof ScreenParams>(key: K, value: ScreenParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  const counts = useMemo(() => {
    let wash = 0;
    let ink = 0;
    for (const m of marks) {
      if (m.kind === "wash") wash++;
      else ink++;
    }
    return { wash, ink };
  }, [marks]);

  return (
    <div
      className="flex flex-col gap-5 lg:flex-row lg:items-start"
      style={{ fontFamily: "var(--font-geist-sans)", color: "#e6d3a4" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm mb-4" style={{ color: "#9a8460" }}>
          Pick a source or drop your own image. The panel is inlaid like a
          Coromandel screen: mineral washes, ink contours, optional gold, and
          a frame you can change without re-inking.
        </p>

        <div className="-mx-2 sm:mx-0 px-2 py-8" style={lacquerBackgroundStyle()}>
          <div
            ref={hoopRef}
            className="relative mx-auto"
            style={{
              width: "100%",
              maxWidth: 620,
              aspectRatio: `${analysisSize.w} / ${analysisSize.h}`,
              background: "#100e0c",
              boxShadow:
                "0 22px 60px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(214,176,96,0.22)",
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
            <canvas ref={groundRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={settleRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={liveRef} className="absolute inset-0 h-full w-full" />
            <canvas ref={frameRef} className="absolute inset-0 h-full w-full" />

            {(busy || dropOver) && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: dropOver ? "rgba(16,14,12,0.55)" : "transparent",
                }}
              >
                <span
                  className="text-sm tracking-wide"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    color: "#e6d3a4",
                    background: "rgba(20,16,12,0.72)",
                    padding: "6px 14px",
                    border: "1px solid rgba(214,176,96,0.28)",
                  }}
                >
                  {dropOver ? "Drop image onto the screen" : "Grinding the ink…"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside
        className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4 p-4"
        style={{
          background: "#1c1814",
          border: "1px solid rgba(214,176,96,0.22)",
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
          <p className="text-[11px] mt-1 mb-2" style={{ color: "#9a8460" }}>
            Lacquer keeps the kuancai black. Gold leaf is the oval vignette.
            Silk and parchment lean toward gongbi paper.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GROUNDS.map((g) => (
              <ModeButton
                key={g.id}
                active={params.ground === g.id}
                label={g.label}
                hint={g.hint}
                onClick={() => patch("ground", g.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <Label>Frame</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {FRAMES.map((f) => (
              <ModeButton
                key={f.id}
                active={params.frame === f.id}
                label={f.label}
                hint={f.hint}
                onClick={() => patch("frame", f.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <Label>Stroke</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {INKS.map((ink) => (
              <ModeButton
                key={ink.id}
                active={params.ink === ink.id}
                label={ink.label}
                hint={ink.hint}
                onClick={() => patch("ink", ink.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <Label>Reveal</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {REVEALS.map((r) => (
              <ModeButton
                key={r.id}
                active={params.reveal === r.id}
                label={r.label}
                hint={r.hint}
                onClick={() => patch("reveal", r.id)}
              />
            ))}
          </div>
        </section>

        <Slider
          label="Outline"
          min={0.45}
          max={2.2}
          step={0.05}
          value={params.outline}
          onChange={(v) => patch("outline", v)}
        />
        <Slider
          label="Wetness"
          min={0}
          max={1}
          step={0.01}
          value={params.wetness}
          onChange={(v) => patch("wetness", v)}
          display={
            params.wetness < 0.2
              ? "dry mineral"
              : params.wetness > 0.75
                ? "wet bloom"
                : `${Math.round(params.wetness * 100)}%`
          }
        />
        <Slider
          label="Gold leaf"
          min={0}
          max={1}
          step={0.01}
          value={params.goldLeaf}
          onChange={(v) => patch("goldLeaf", v)}
          display={`${Math.round(params.goldLeaf * 100)}%`}
        />
        <Slider
          label="Aging"
          min={0}
          max={1}
          step={0.01}
          value={params.aging}
          onChange={(v) => patch("aging", v)}
          display={
            params.aging < 0.2
              ? "fresh pigment"
              : params.aging > 0.8
                ? "museum mute"
                : `${Math.round(params.aging * 100)}%`
          }
        />
        <Slider
          label="Flatten"
          min={0}
          max={1}
          step={0.01}
          value={params.flatten}
          onChange={(v) => patch("flatten", v)}
          display={
            params.flatten < 0.2
              ? "observed"
              : params.flatten > 0.8
                ? "cloisonné"
                : `${Math.round(params.flatten * 100)}%`
          }
        />
        <Slider
          label="Pattern"
          min={0}
          max={1}
          step={0.01}
          value={params.pattern}
          onChange={(v) => patch("pattern", v)}
          display={`${Math.round(params.pattern * 100)}%`}
        />
        <Slider
          label="Craquelure"
          min={0}
          max={1}
          step={0.01}
          value={params.craquelure}
          onChange={(v) => patch("craquelure", v)}
          display={`${Math.round(params.craquelure * 100)}%`}
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
            style={{ background: "#8f2e2a", color: "#f6e6c8" }}
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
            style={{ background: "#2a241c", color: "#e6d3a4" }}
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
          style={{ fontFamily: "var(--font-space-mono)", color: "#9a8460" }}
        >
          {counts.ink.toLocaleString()} strokes · {counts.wash.toLocaleString()}{" "}
          washes
          {busy ? " · grinding" : ""}
        </p>

        <button
          type="button"
          onClick={() => patch("seed", params.seed + 1)}
          className="text-xs self-start underline underline-offset-4"
          style={{ color: "#9a8460" }}
        >
          Re-ink with a new seed
        </button>
      </aside>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] tracking-[0.18em] uppercase"
      style={{ color: "#9a8460" }}
    >
      {children}
    </div>
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
        background: active ? "#8f2e2a" : "#2a241c",
        color: active ? "#f6e6c8" : "#e6d3a4",
      }}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left px-2 py-2 text-xs"
      style={{
        background: active ? "#8f2e2a" : "#2a241c",
        color: active ? "#f6e6c8" : "#e6d3a4",
      }}
    >
      <span className="block font-medium">{label}</span>
      <span className="opacity-80">{hint}</span>
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
          style={{ fontFamily: "var(--font-space-mono)", color: "#9a8460" }}
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
