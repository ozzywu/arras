# Arras

A modern interpretation of medieval tapestry.

Drop a photo. It is sampled into satin stitches and woven onto linen in the browser — no account, no server-side image upload.

When a hoop looks right, **Take this** in the studio copies it onto a website:

- **Copy for agent** — a prompt you paste into Cursor on your site repo. It includes the exact recipe (density, growth, ground, seed, …) and tells the agent to copy `src/lib/yarn-loom` plus `YarnHoop`.
- **Embed** — an iframe of `/embed?…` that plays the same recipe on Arras. Works for presets on a linen or hessian patch. Site fabric and local uploads need the agent path (stitches have to live *in* your page, and blob URLs do not travel).
- **React** — a `<YarnHoop recipe={…} />` snippet.
- **PNG** — a still of the hoop (transparent when ground is site fabric).

The studio URL also stores the recipe, so you can bookmark or share a look.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Arras uses **3001** so it does not collide with Tosca on 3000.

Requires Node.js 22.

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npx eslint .` | Lint |

## Deploy

Import this GitHub repo in [Vercel](https://vercel.com/new). No environment variables. Framework preset is Next.js.

## What it does

The hoop reads an image, scores subject vs ground, and lays satin stitches. Growth modes (colonize, sew, weave, bloom) decide the order the needle travels. Ground can be the page weave, a linen patch, or hessian. Edges run from a tight hem to an unravelled fray.

Everything runs in the client. Your photo never leaves the tab.
