import { recipeToQuery, SOURCE_PRESETS, type ArrasRecipe } from "./recipe";

const ENGINE_FILES = [
  "src/lib/yarn-loom/",
  "src/components/YarnHoop.tsx",
  "public/textures/linen.svg",
];

export function recipeJson(recipe: ArrasRecipe): string {
  const body: Record<string, string | number> = {
    source: recipe.source,
    density: recipe.density,
    stitchLength: recipe.stitchLength,
    thickness: recipe.thickness,
    growth: recipe.growth,
    colorMode: recipe.colorMode,
    lightAngle: Number(recipe.lightAngle.toFixed(4)),
    durationMs: recipe.durationMs,
    seed: recipe.seed,
    ground: recipe.ground,
    fray: recipe.fray,
  };
  if (recipe.src) body.src = recipe.src;
  return JSON.stringify(body, null, 2);
}

export function embedUrl(origin: string, recipe: ArrasRecipe): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/embed?${recipeToQuery(recipe)}`;
}

export function embedSnippet(origin: string, recipe: ArrasRecipe): string {
  const url = embedUrl(origin, recipe);
  const ratio = recipe.source === "courtyard" ? "420 / 512" : "4 / 5";
  const bg =
    recipe.ground === "hessian"
      ? "#cbb79a"
      : recipe.ground === "linen"
        ? "#f3efe6"
        : "transparent";
  return `<iframe
  src="${url}"
  title="Arras tapestry"
  loading="lazy"
  allow="autoplay"
  style="width:100%;max-width:620px;aspect-ratio:${ratio};border:0;background:${bg}"
></iframe>`;
}

export function reactSnippet(recipe: ArrasRecipe): string {
  const src =
    recipe.source === "courtyard"
      ? ""
      : recipe.source === "image"
        ? '      src="/arras-subject.jpg"\n'
        : `      src="${recipe.src ?? "/hero-photo.jpg"}"\n`;
  return `import { YarnHoop } from "@/components/YarnHoop";

const recipe = ${recipeJson(recipe)};

export function ArrasSubject() {
  return (
    <YarnHoop
      recipe={recipe}
${src}    />
  );
}
`;
}

export function agentPrompt(origin: string, recipe: ArrasRecipe): string {
  const preset = SOURCE_PRESETS.find((p) => p.id === recipe.source);
  const custom = recipe.source === "image" && !recipe.src;
  const site = recipe.ground === "site";
  const sourceLines = custom
    ? [
        "Custom photo (not in this recipe — blob URLs do not travel).",
        "Attach the same image to this chat, or save it as `public/arras-subject.jpg` and keep `src` pointed there.",
      ]
    : recipe.source === "courtyard"
      ? [
          "Procedural courtyard — no photo file. `YarnHoop` paints it when `recipe.source` is `courtyard`.",
        ]
      : [
          `Arras preset **${preset?.label ?? recipe.source}**${recipe.src ? ` (\`${recipe.src}\`)` : ""}.`,
          recipe.src?.startsWith("/")
            ? `Copy that file from the Arras repo \`public/\` into my \`public/\`, or replace \`src\` with my own photo.`
            : `Use this image URL as \`src\`.`,
        ];

  const groundLines = site
    ? [
        "`ground: \"site\"` — stitches sit on **my page**, not a beige patch.",
        "Do not paint hessian/linen behind the hoop. Put `YarnHoop` on the existing cloth (copy `.bg-linen` from Arras `src/app/globals.css` if my page has no weave yet).",
        "An iframe cannot composite into the parent page. Do **not** iframe this look; inline the component.",
      ]
    : [
        `\`ground: "${recipe.ground}"\` — self-contained ${recipe.ground} patch.`,
        "Iframe embed is fine if I only want a hosted hoop. Prefer inlining `YarnHoop` so the animation lives in my repo.",
      ];

  return `# Drop this Arras hoop on my site

I already dialed this in at ${origin || "Arras"}. Implement the **live stitch hoop** (animated satin stitches from the yarn-loom engine) — not a restyled illustration and not a static screenshot unless I ask.

Engine lives in https://github.com/ozzywu/arras (this public studio). Copy these paths into my project:

${ENGINE_FILES.map((f) => `- \`${f}\``).join("\n")}

Keep the \`@/\` alias (or rewrite those imports). Client-only: no upload API, no env vars, no backend. Keep \`LoomClient\` so weaving stays off the main thread.

## Recipe — match exactly

\`\`\`json
${recipeJson(recipe)}
\`\`\`

## Source

${sourceLines.map((l) => `- ${l}`).join("\n")}

## Ground

${groundLines.map((l) => `- ${l}`).join("\n")}

## Drop-in

\`\`\`tsx
${reactSnippet(recipe).trim()}
\`\`\`

\`YarnHoop\` already weaves, plays, and respects \`prefers-reduced-motion\`. Do not retune density, growth, fray, thickness, light, seed, or duration.

## Optional hosted embed

If inlining is too much and ground is not \`site\`, this iframe plays the same recipe on Arras:

\`\`\`html
${embedSnippet(origin, recipe)}
\`\`\`
${custom ? "\nCustom uploads cannot ride in the iframe URL. Inline the hoop (or use a PNG still) instead.\n" : ""}
## Do not

- Add admin, auth, or an image-upload server
- Wrap site-fabric stitches in a tan sticker
- Change floss scale — \`YarnHoop\` already matches desktop weight on mobile
`;
}
