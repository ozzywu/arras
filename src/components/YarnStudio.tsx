"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  imageUrlOf,
  loomParamsOf,
  parseRecipe,
  recipeOf,
  recipeToQuery,
  SOURCE_PRESETS,
  type RecipeSource,
} from "@/lib/yarn-loom";
import {
  type ColorMode,
  type GroundMode,
  type GrowthMode,
  type LoomParams,
} from "@/lib/yarn-loom/types";
import { TakeThis } from "./TakeThis";
import {
  YarnHoop,
  type HoopStats,
  type YarnHoopHandle,
  useYarnPlayhead,
} from "./YarnHoop";

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

export default function YarnStudio() {
  const searchParams = useSearchParams();
  const [boot] = useState(() => parseRecipe(searchParams));
  const hoopRef = useRef<YarnHoopHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [params, setParams] = useState<LoomParams>(() => loomParamsOf(boot));
  const [source, setSource] = useState<RecipeSource>(boot.source);
  const [imageUrl, setImageUrl] = useState<string | null>(() => imageUrlOf(boot));
  const [dropOver, setDropOver] = useState(false);
  const [stats, setStats] = useState<HoopStats>({
    busy: true,
    stitchCount: 0,
    passages: 0,
    width: 340,
    height: 415,
  });

  const play = useYarnPlayhead(params.durationMs);
  const recipe = useMemo(
    () => recipeOf(params, source, imageUrl),
    [params, source, imageUrl],
  );

  useEffect(() => {
    const qs = recipeToQuery(recipe);
    const next = qs ? `/?${qs}` : "/";
    if (window.location.search.slice(1) !== qs) {
      window.history.replaceState(null, "", next);
    }
  }, [recipe]);

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

  const siteGround = params.ground === "site";

  return (
    <div
      className="flex flex-col gap-5 lg:flex-row lg:items-start"
      style={{ fontFamily: "var(--font-geist-sans)", color: "#3b3228" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm mb-4" style={{ color: "#6d5c4c" }}>
          Pick a source or drop your own image. When the hoop looks right, copy
          it for your agent or paste an embed on a site. Site fabric sews the
          stitches into the page weave.
        </p>

        <div
          className={siteGround ? "-mx-2 sm:mx-0 px-2 py-8 bg-linen" : undefined}
        >
          <YarnHoop
            ref={hoopRef}
            recipe={recipe}
            src={imageUrl}
            t={play.t}
            interactive
            dropOver={dropOver}
            onDropOver={setDropOver}
            onFiles={onFiles}
            onStats={(next) => {
              setStats(next);
              if (next.busy) {
                play.setPlaying(false);
                play.setT(0);
              }
            }}
            onReady={play.begin}
          />
        </div>
      </div>

      <aside
        className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4 p-4"
        style={{
          background: "#efe4d0",
          border: "1px solid rgba(140,90,50,0.18)",
        }}
      >
        <TakeThis
          recipe={recipe}
          hoopRef={hoopRef}
          customImage={source === "image" && !!imageUrl?.startsWith("blob:")}
        />

        <section>
          <Label>Source</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SOURCE_PRESETS.map((p) => (
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
              if (play.t >= 1) {
                play.setT(0);
                play.setPlaying(true);
                return;
              }
              play.setPlaying((p) => !p);
            }}
            className="flex-1 py-2 text-sm"
            style={{ background: "#4a7ec7", color: "#f7f1e6" }}
          >
            {play.playing ? "Pause" : play.t >= 1 ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              play.setT(0);
              play.setPlaying(true);
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
          value={play.t}
          onChange={(e) => {
            play.setPlaying(false);
            play.setT(Number(e.target.value));
          }}
          aria-label="Playhead"
          className="w-full"
        />

        <p
          className="text-xs tabular-nums"
          style={{ fontFamily: "var(--font-space-mono)", color: "#8a6d55" }}
        >
          {stats.stitchCount.toLocaleString()} stitches · {stats.passages}{" "}
          passages
          {stats.busy ? " · threading" : ""}
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
