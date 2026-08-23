# Arras

A library of handmade image styles: medieval tapestry, and Coromandel / gongbi screen work.

Drop a photo. Yarn samples it into satin stitches on linen. Screen inlays it as mineral washes and ink on lacquer, gold, or silk. Everything runs in the browser — no account, no server-side image upload.

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

**Yarn** reads an image, scores subject vs ground, and lays satin stitches. Growth modes (colonize, sew, weave, bloom) decide the order the needle travels. Ground can be the page weave, a linen patch, or hessian. Edges run from a tight hem to an unravelled fray.

**Screen** quantizes the same photo into a museum-aged mineral palette, seats pale ground onto lacquer / gold leaf / silk / parchment, and draws calligraphic contours. Knobs cover outline, wetness, gold leaf, aging, flatten, filigree pattern, craquelure, frame, and ink mode (gongbi, xieyi, engraved).

Everything runs in the client. Your photo never leaves the tab.
