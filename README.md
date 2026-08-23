# Arras

A modern interpretation of medieval tapestry.

Drop a photo. It is sampled into satin stitches and woven onto linen in the browser — no account, no server-side image upload.

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
