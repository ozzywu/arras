"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pause, Play, RotateCcw, Sun, Upload } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const edgePreset =
    EDGE_PRESETS.find((preset) => Math.abs(params.fray - preset.value) < 0.03)
      ?.label ?? "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className={siteGround ? "bg-linen py-8" : undefined}>
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

      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:w-[340px] lg:overflow-y-auto">
        <Card size="sm" className="bg-card/90 shadow-sm">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Studio</CardTitle>
                <CardDescription>
                  Source, cloth, and stitch — then take the hoop with you.
                </CardDescription>
              </div>
              <Badge variant={stats.busy ? "secondary" : "outline"}>
                {stats.busy ? "Threading" : "Ready"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <TakeThis
              recipe={recipe}
              hoopRef={hoopRef}
              customImage={source === "image" && !!imageUrl?.startsWith("blob:")}
            />

            <Separator />

            <section className="space-y-2.5">
              <SectionLabel>Source</SectionLabel>
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={source === "image" ? "" : source}
                  onValueChange={(value) => {
                    if (!value) return;
                    const preset = SOURCE_PRESETS.find((p) => p.id === value);
                    if (!preset) return;
                    setSource(preset.id);
                    setImageUrl(preset.url);
                  }}
                  className="flex flex-wrap"
                >
                  {SOURCE_PRESETS.map((preset) => (
                    <ToggleGroupItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  type="button"
                  variant={source === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload data-icon="inline-start" />
                  Upload
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </section>

            <section className="space-y-2.5">
              <SectionLabel>Ground</SectionLabel>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Site fabric is the compositing target: no baked beige, same weave
                as the page, hoop and site sharing one cloth.
              </p>
              <RadioGroup
                value={params.ground}
                onValueChange={(value) => patch("ground", value as GroundMode)}
                className="gap-2"
              >
                {GROUNDS.map((ground) => (
                  <Label
                    key={ground.id}
                    className="flex items-start gap-3 rounded-lg border border-input bg-background/60 p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={ground.id} className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        {ground.label}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {ground.hint}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </section>

            <section className="space-y-2.5">
              <SectionLabel>Edge</SectionLabel>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tight clips to a hem. Unravelled overshoots, yaws off-grain, and
                leaves stray fibers on the cloth.
              </p>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={edgePreset}
                onValueChange={(label) => {
                  const preset = EDGE_PRESETS.find((item) => item.label === label);
                  if (preset) patch("fray", preset.value);
                }}
              >
                {EDGE_PRESETS.map((preset) => (
                  <ToggleGroupItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <ParamSlider
                label="Fray"
                min={0}
                max={1}
                step={0.01}
                value={params.fray}
                onChange={(value) => patch("fray", value)}
                display={
                  params.fray < 0.08
                    ? "hemmed"
                    : params.fray > 0.72
                      ? "unravelled"
                      : `${Math.round(params.fray * 100)}%`
                }
              />
            </section>

            <section className="space-y-2.5">
              <SectionLabel>Growth</SectionLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={params.growth}
                onValueChange={(value) => {
                  if (value) patch("growth", value as GrowthMode);
                }}
                className="grid w-full grid-cols-2"
              >
                {GROWTH.map((mode) => (
                  <ToggleGroupItem
                    key={mode.id}
                    value={mode.id}
                    title={mode.hint}
                    className="h-auto flex-col items-start gap-0.5 whitespace-normal px-2.5 py-2"
                  >
                    <span>{mode.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {mode.hint}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>

            <ParamSlider
              label="Density"
              min={0.5}
              max={1}
              step={0.01}
              value={params.density}
              onChange={(value) => patch("density", value)}
              display={`${Math.round(params.density * 100)}%`}
            />
            <ParamSlider
              label="Stitch length"
              min={4}
              max={14}
              step={0.1}
              value={params.stitchLength}
              onChange={(value) => patch("stitchLength", value)}
            />
            <ParamSlider
              label="Floss weight"
              min={0.8}
              max={3.2}
              step={0.05}
              value={params.thickness}
              onChange={(value) => patch("thickness", value)}
            />

            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Light</SectionLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Sun data-icon="inline-start" />
                    Edit light
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56">
                  <PopoverHeader>
                    <PopoverTitle>Light direction</PopoverTitle>
                    <PopoverDescription>
                      Drag the lamp around the hoop
                    </PopoverDescription>
                  </PopoverHeader>
                  <LightOrbit
                    angle={params.lightAngle}
                    onChange={(value) => patch("lightAngle", value)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <ParamSlider
              label="Duration"
              min={4000}
              max={28000}
              step={250}
              value={params.durationMs}
              onChange={(value) => patch("durationMs", value)}
              display={`${(params.durationMs / 1000).toFixed(1)}s`}
            />

            <section className="space-y-2.5">
              <SectionLabel>Color</SectionLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={params.colorMode}
                onValueChange={(value) => {
                  if (value) patch("colorMode", value as ColorMode);
                }}
              >
                <ToggleGroupItem value="sampled">Sampled</ToggleGroupItem>
                <ToggleGroupItem value="sunbleached">
                  Sun-bleached
                </ToggleGroupItem>
              </ToggleGroup>
            </section>
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  if (play.t >= 1) {
                    play.setT(0);
                    play.setPlaying(true);
                    return;
                  }
                  play.setPlaying((playing) => !playing);
                }}
              >
                {play.playing ? (
                  <Pause data-icon="inline-start" />
                ) : (
                  <Play data-icon="inline-start" />
                )}
                {play.playing ? "Pause" : play.t >= 1 ? "Replay" : "Play"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  play.setT(0);
                  play.setPlaying(true);
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Rewind
              </Button>
            </div>

            <Slider
              min={0}
              max={1}
              step={0.001}
              value={[play.t]}
              onValueChange={([value]) => {
                play.setPlaying(false);
                play.setT(value);
              }}
              aria-label="Playhead"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {stats.stitchCount.toLocaleString()} stitches · {stats.passages}{" "}
                passages
                {stats.busy ? " · threading" : ""}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => patch("seed", params.seed + 1)}
              >
                New seed
              </Button>
            </div>
          </CardFooter>
        </Card>
      </aside>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </div>
  );
}

function ParamSlider({
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
  onChange: (value: number) => void;
  display?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </Label>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
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
      className="mx-auto block max-w-[168px] cursor-crosshair select-none"
      style={{ touchAction: "none" }}
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
        stroke="var(--border)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      <line
        x1={lampX}
        y1={lampY}
        x2={cx}
        y2={cy}
        stroke="color-mix(in oklch, var(--primary) 45%, transparent)"
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
