import { recipeToQuery, SOURCE_PRESETS, type ArrasRecipe } from "./recipe";

const ENGINE_FILES = [
  "`src/lib/yarn-loom/` — stitch engine. Skip `take.ts` (Arras export UI).",
  "`src/components/YarnHoop.tsx`",
  "`public/textures/linen.svg` — only if the page uses `.bg-linen` or a linen/hessian patch",
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
        "`ground: \"site\"` — stitches sit on **my page**, not a beige/linen patch.",
        "The hoop is **snug to the subject**. No inner padding, no imaginary frame, no box-shadow. Type should sit flush to the sides. Fray (if any) spills *outside* the box onto my page.",
        "Do not paint hessian/linen behind the hoop and do not wrap it in extra padding to 'frame' it. Copy `.bg-linen` from Arras `src/app/globals.css` only if my page has no weave yet.",
        "An iframe cannot composite into the parent page. Do **not** iframe this look; inline the component.",
      ]
    : [
        `\`ground: "${recipe.ground}"\` — self-contained ${recipe.ground} patch.`,
        "Iframe embed is fine if I only want a hosted hoop. Prefer inlining `YarnHoop` so the animation lives in my repo.",
      ];

  return `# Drop this Arras hoop on my site

I already dialed this in at ${origin || "Arras"}. **Copy the engine, then drop \`YarnHoop\` in.** Do not reimplement satin stitches, canvas streamlines, or a CSS/SVG facsimile.

This is a client-side stitch engine (analyze → generate → pack → canvas), not Lottie and not a CSS animation. The work is a file copy plus layout wiring — not building a loom from scratch.

Engine lives in https://github.com/ozzywu/arras. Copy these paths:

${ENGINE_FILES.map((f) => `- ${f}`).join("\n")}

Keep the \`@/\` alias (or rewrite those imports). Client-only: no upload API, no env vars, no backend, no shadcn. \`YarnHoop\` has no UI-kit dependency.

\`LoomClient\` + \`loom.worker.ts\` keep weaving off the main thread. If my bundler chokes on \`new Worker(new URL("./loom.worker.ts", import.meta.url))\`, leave them — \`YarnHoop\` already falls back to the main thread.

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

\`YarnHoop\` weaves silently (no "Threading the needle…" badge, no flying needles, no dust motes), then plays the stitch growth. It respects \`prefers-reduced-motion\`. Omit \`t\` — the hoop owns playback. Do not retune density, growth, fray, thickness, light, seed, or duration.

## Optional hosted embed

If inlining is too much and ground is not \`site\`, this iframe plays the same recipe on Arras:

\`\`\`html
${embedSnippet(origin, recipe)}
\`\`\`
${custom ? "\nCustom uploads cannot ride in the iframe URL. Inline the hoop (or use a PNG still) instead.\n" : ""}
## Do not

- Reimplement the loom or restyle it into an illustration
- Add a "Threading the needle…" overlay or other studio loading chrome
- Wrap site-fabric stitches in a linen/tan sticker, or pad the box so type does not sit flush
- Add admin, auth, or an image-upload server
- Change floss scale — \`YarnHoop\` already matches desktop weight on mobile
`;
}
