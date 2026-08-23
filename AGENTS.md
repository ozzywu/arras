# AGENTS.md

**Project:** Arras — public image-to-art studio (yarn tapestry + Coromandel screen). Next.js 16, TypeScript, Tailwind CSS v4. No backend, no env vars.

## What this is

A standalone Next.js app. The homepage (`/`) is a library of ateliers. Yarn weaves a photo into linen. Screen inlays it onto a folding-screen panel (lacquer, gongbi, gold leaf).

This repo is **not** Tosca. Do not add admin, Supabase, or portfolio routes here.

## Commands

- **Dev:** `npm run dev` (port **3001**, so it does not collide with Tosca on 3000)
- **Build:** `npm run build`
- **Lint:** `npx eslint .`

Node.js 22+ is required. Package manager is npm.

## Layout

```
src/app/                 # App Router — homepage only
src/components/          # AtelierApp, ArrasShell, YarnStudio, ScreenStudio
src/lib/yarn-loom/       # Stitch engine (analyze, generate, fray, render)
src/lib/screen-atelier/  # Screen engine (quantize, wash, ink, ground, frame)
public/                  # Demo sources + linen texture
```

## Notes

- Image handling is client-side only (`FileReader` / `Image`). Do not add a upload API unless asked.
- Demo presets live in `public/` (`hero-photo.jpg`, `plant.png`, `goat-lineart.png`). Courtyard is painted procedurally.
- Deploy on Vercel with no environment variables.
