# Nano Banana Studio

Instruction-driven, layer-based visual editor powered by Gemini 2.5 Flash Image Preview ("Nano Banana"). Edit with words, blend realities, and keep characters consistent across scenes — all in a responsive, non-destructive canvas workflow.

## Overview

Nano Banana Studio turns natural language into precise visual edits. It fuses real photos and generated elements with lighting- and shadow-aware blending, supports character/style consistency, and accelerates creative and e‑commerce workflows.

What you can do:
- Conversational edits: “Replace the background with a sunny park and add soft morning light.”
- Consistent characters: Keep the same mascot/person across multiple shots.
- Product visualization: Place products into real spaces, match shadows, refine edges.
- Creative automation: Batch-size variants for channels and campaigns.

## Demo
- Video (≤2 min): https://youtu.be/TtCNOdwGtKU

## Core Features
- Layer canvas: Drag/scale/rotate, reorder, toggle visibility, history-based non-destructive edits.
- Localized edits: Apply Gemini-powered changes to selected layers or masked regions only.
- Photo+gen fusion: Insert generated props that match perspective, lighting, and shadows.
- Fast UI: Heavy work (background removal, mask refine) offloaded to a Web Worker.
- Secure API access: Vercel Edge Function proxies Gemini, protects secrets, enforces limits.

## Architecture
- React app (`src/`): Canvas UI, layers, and prompts.
- Web Worker (`src/worker.js`): Background removal and image-heavy pre/post-processing.
- Edge Function (`api/gemini.js`): Structured Gemini calls (edit, blend, consistency) and rate-limit guards.
- Static shell (`public/`): CRA HTML and assets.

## Project Structure
- `src/`: React components (`App.js`, `Canvas.js`, `ObjectLayer.js`, `LayerItem.js`) and tests.
- `src/worker.js`: Off-main-thread image tasks (background removal, mask refinement).
- `api/gemini.js`: Vercel Edge Function proxy for Gemini API.
- `public/`: Static assets and CRA HTML shell.
- `vercel.json`: Per-function config (limits, regions).

## Prerequisites
- Node 18+ and Yarn 1.x
- Vercel CLI (`npm i -g vercel`) for local Edge Functions
- A Gemini API key (free tier available) stored as an environment variable

## Setup
1) Install dependencies:
```
yarn
```
2) Configure environment variables:
```
cp .env.example .env
# Then set GEMINI_API_KEY in .env or your shell
```
Required:
- `GEMINI_API_KEY` – used by `api/gemini.js` (never exposed to the client).

## Development
Run the Edge Function and the React app in parallel. The React app proxies API calls to the Edge server.

Terminal A (Vercel dev on 5001):
```
yarn dev:vercel
```

Terminal B (CRA on 3000):
```
yarn start
```

Open the app at http://localhost:3000. API calls go to http://localhost:5001 via CRA proxy (see `proxy` in `package.json`).

## Testing
Interactive watch mode:
```
yarn test
```

## Production Build
Create an optimized build:
```
yarn build
```

## Deployment (Vercel)
- Ensure `GEMINI_API_KEY` is set in your Vercel Project Environment Variables.
- Deploy with the Vercel CLI or Git integration. Edge Function lives at `/api/gemini`.

## Usage Guide (Quick Start)
1) Upload or drop a base image onto the canvas.
2) Add object layers (images with optional masks; background removal handled in the worker).
3) Select a layer or region, then enter a prompt (e.g., “make lighting warm; add soft shadow under the mug”).
4) Use “Final Blend” to fuse layers with realistic lighting and edges.
5) Export as PNG/WebP.

## Gemini Integration
The app uses Gemini 2.5 Flash Image Preview (Nano Banana) for localized, instruction-driven editing:
- Targeted edits: relight, background replace, add/remove objects — constrained to selected layers/masks.
- Fusion: insert generated props consistent with scene perspective, lighting, and shadows.
- Consistency: reuse prompt context, seeds, and references to keep characters/styles stable across scenes.
Edge proxy enforces special-tier limits, runs safety checks, and keeps API keys off the client. Heavy image prep runs in a Web Worker to maintain UI responsiveness.

## Limits & Safety
- Special tier limits: ~20 images/min and ~500 requests/day per project.
- Costs: Using a paid API key incurs usage charges per your plan.
- Secrets: Do not place secrets in `REACT_APP_*`; use server-side env vars only.

## Troubleshooting
- 404 on `/api/gemini`: Ensure `yarn dev:vercel` is running on port 5001.
- 401/403 from API: Verify `GEMINI_API_KEY` is set in your local `.env` and in Vercel.
- UI jank on large images: Confirm worker is active (`src/worker.js`) and avoid blocking main thread tasks.

## License
Proprietary – internal hackathon project. Replace with your preferred license if open-sourcing.
