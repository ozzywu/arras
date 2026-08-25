import {
  DEFAULT_LOOM_PARAMS,
  type ColorMode,
  type GroundMode,
  type GrowthMode,
  type LoomParams,
} from "./types";

export type RecipeSource = "courtyard" | "portrait" | "plant" | "goat" | "image";

export const SOURCE_PRESETS: {
  id: RecipeSource;
  label: string;
  url: string | null;
}[] = [
  { id: "portrait", label: "Portrait", url: "/hero-photo.jpg" },
  { id: "courtyard", label: "Courtyard", url: null },
  { id: "plant", label: "Plant", url: "/plant.png" },
  { id: "goat", label: "Goat", url: "/goat-lineart.png" },
];

const GROWTH: GrowthMode[] = ["sew", "weave", "bloom", "colonize"];
const COLOR: ColorMode[] = ["sampled", "sunbleached"];
const GROUND: GroundMode[] = ["hessian", "linen", "site"];
const SOURCES: RecipeSource[] = [
  "courtyard",
  "portrait",
  "plant",
  "goat",
  "image",
];

/** Everything needed to recreate a hoop — knobs plus which picture. */
export interface ArrasRecipe extends LoomParams {
  source: RecipeSource;
  /**
   * Public path or absolute URL. Omitted for courtyard (procedural) and for
   * local uploads (blob URLs do not travel).
   */
  src?: string;
}

export function presetUrl(source: RecipeSource): string | null {
  return SOURCE_PRESETS.find((p) => p.id === source)?.url ?? null;
}

export function recipeOf(
  params: LoomParams,
  source: RecipeSource,
  imageUrl: string | null,
): ArrasRecipe {
  const preset = presetUrl(source);
  const src =
    source === "courtyard" || source === "image"
      ? imageUrl && !imageUrl.startsWith("blob:")
        ? imageUrl
        : undefined
      : (imageUrl && !imageUrl.startsWith("blob:") ? imageUrl : preset) ??
        undefined;
  return { ...params, source, ...(src ? { src } : {}) };
}

function num(
  value: string | null,
  fallback: number,
  lo: number,
  hi: number,
): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parseRecipe(search: URLSearchParams): ArrasRecipe {
  const source = pick(search.get("src"), SOURCES, "portrait");
  const preset = presetUrl(source);
  const rawSrc = search.get("img");
  const src =
    rawSrc && !rawSrc.startsWith("blob:")
      ? rawSrc
      : (preset ?? undefined);
  return {
    density: num(search.get("d"), DEFAULT_LOOM_PARAMS.density, 0.5, 1),
    stitchLength: num(
      search.get("sl"),
      DEFAULT_LOOM_PARAMS.stitchLength,
      4,
      14,
    ),
    thickness: num(search.get("th"), DEFAULT_LOOM_PARAMS.thickness, 0.8, 3.2),
    growth: pick(search.get("g"), GROWTH, DEFAULT_LOOM_PARAMS.growth),
    colorMode: pick(search.get("c"), COLOR, DEFAULT_LOOM_PARAMS.colorMode),
    lightAngle: num(
      search.get("la"),
      DEFAULT_LOOM_PARAMS.lightAngle,
      -Math.PI,
      Math.PI,
    ),
    durationMs: num(
      search.get("dur"),
      DEFAULT_LOOM_PARAMS.durationMs,
      1000,
      28000,
    ),
    seed: Math.round(num(search.get("seed"), DEFAULT_LOOM_PARAMS.seed, 0, 1e9)),
    ground: pick(search.get("gr"), GROUND, DEFAULT_LOOM_PARAMS.ground),
    fray: num(search.get("fr"), DEFAULT_LOOM_PARAMS.fray, 0, 1),
    source,
    ...(src ? { src } : {}),
  };
}

export function recipeToSearch(recipe: ArrasRecipe): URLSearchParams {
  const p = new URLSearchParams();
  p.set("src", recipe.source);
  p.set("d", trimNum(recipe.density));
  p.set("sl", trimNum(recipe.stitchLength));
  p.set("th", trimNum(recipe.thickness));
  p.set("g", recipe.growth);
  p.set("c", recipe.colorMode);
  p.set("la", trimNum(recipe.lightAngle, 4));
  p.set("dur", String(Math.round(recipe.durationMs)));
  p.set("seed", String(Math.round(recipe.seed)));
  p.set("gr", recipe.ground);
  p.set("fr", trimNum(recipe.fray));
  if (recipe.src && !recipe.src.startsWith("blob:")) p.set("img", recipe.src);
  return p;
}

export function recipeToQuery(recipe: ArrasRecipe): string {
  return recipeToSearch(recipe).toString();
}

export function loomParamsOf(recipe: ArrasRecipe): LoomParams {
  return {
    density: recipe.density,
    stitchLength: recipe.stitchLength,
    thickness: recipe.thickness,
    growth: recipe.growth,
    colorMode: recipe.colorMode,
    lightAngle: recipe.lightAngle,
    durationMs: recipe.durationMs,
    seed: recipe.seed,
    ground: recipe.ground,
    fray: recipe.fray,
  };
}

export function imageUrlOf(recipe: ArrasRecipe): string | null {
  if (recipe.source === "courtyard") return null;
  if (recipe.src) return recipe.src;
  return presetUrl(recipe.source);
}

function trimNum(n: number, digits = 3): string {
  const t = n.toFixed(digits);
  return t.replace(/\.?0+$/, "");
}
