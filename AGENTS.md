# AGENTS.md

**Project:** Arras — public image-to-tapestry studio. Next.js 16, TypeScript, Tailwind CSS v4. No backend, no env vars.

## What this is

A standalone Next.js app. The homepage (`/`) is the hoop: drop a photo, watch it get woven into linen.

This repo is **not** Tosca. Do not add admin, Supabase, or portfolio routes here.

## Commands

- **Dev:** `npm run dev` (port **3001**, so it does not collide with Tosca on 3000)
- **Build:** `npm run build`
- **Lint:** `npx eslint .`

Node.js 22+ is required. Package manager is npm.

## Layout

```
src/app/                 # App Router — homepage only
src/components/          # ArrasShell + YarnStudio UI
src/lib/yarn-loom/       # Stitch engine (analyze, generate, fray, render)
public/                  # Demo sources + linen texture
```

## Notes

- Image handling is client-side only (`FileReader` / `Image`). Do not add a upload API unless asked.
- Demo presets live in `public/` (`hero-photo.jpg`, `plant.png`, `goat-lineart.png`). Courtyard is painted procedurally.
- Deploy on Vercel with no environment variables.
- After any visual change, include the live Vercel preview URL in the wrap-up without being asked. Prefer the stable `*-git-*.vercel.app` preview from the PR (Vercel’s GitHub comment or deployment statuses), not just the dashboard inspect link. Include the PR URL too. If it is still deploying, say so and post the URL as soon as it is Ready.
