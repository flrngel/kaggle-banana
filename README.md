# Nano Banana Studio

A layer-based visual editor where humans place multiple objects at exact positions; Gemini only finishes the image (blend, lighting, edges). Positioning is deterministic and locked by the editor. The model is used as a “finisher,” not a layout engine.

## Why Layers Matter
- Precise placement: Drag/scale/rotate and set Z-order in the UI.
- Position lock: We export the canvas offscreen by layer IDs to preserve pixel-accurate position/scale/rotation.
- Minimized model role: Prompts + inputs are designed so Gemini does not move objects; it only refines edges, lighting, and shadows.

## What’s In The Code
- Visual editor: React + Konva canvas, layer panel (DnD reordering/visibility/delete).
- Background removal: Runs in a Web Worker using IMG.LY (`public/browser.js`), keeping the main thread smooth.
- Exact export: `App.js` uses `exportIdsOffscreen` to clone `#base-image` and `#obj-<id>` nodes into an offscreen Konva Stage and export PNGs with exact transforms.
- Gemini pipeline (Image Understanding + Final Blend):
  - Image Understanding: `api/gemini.js` first sends base/objects to a text-only model (`gemini-2.0-flash`) to produce concise element descriptions.
  - Final Blend: It then sends the working composite and objects to `gemini-2.5-flash-image-preview` (Nano Banana) with strict “do not move elements” rules to refine edges/lighting/shadows.
- Iterative compose: Objects are integrated two at a time to reduce drift and maintain consistency.

## Demo
- Video (≤2 min): https://youtu.be/TtCNOdwGtKU

## Core Features
- Layer canvas: Drag/scale/rotate, reorder, toggle visibility.
- Deterministic compositing: Editor fixes position; Gemini finishes realism. “Do not move” enforced in prompts.
- Image understanding: Base/objects summarized to text to provide scene context before blending.
- Performance: Heavy work (background removal) runs in a Web Worker.
- Security: Vercel Edge Function proxies Gemini, protects secrets, and standardizes responses.

## How It Works (Pipeline)
1) User: Upload base → add object images (Worker removes background) → set position/scale/rotation in the canvas.
2) App: `exportIdsOffscreen` exports base and each object PNG “as placed”.
3) Edge server:
   - Image Understanding: Describe base/objects via a text model.
   - Compose prompt: Include rules “keep all positions; only blend/lighting/edges”.
   - Final blend: Send to the image model (Nano Banana) step-by-step; return final PNG.

## Architecture
- React app (`src/`): `Canvas.js` (Konva), `ObjectLayer.js` (Worker-backed masking), `LayerItem.js` (DND list).
- Web Worker (`src/worker.js`): Background removal and image transforms (OffscreenCanvas, transferable-friendly).
- Edge Function (`api/gemini.js`):
  - Text model: `gemini-2.0-flash` for image→text summaries (image understanding).
  - Image model: `gemini-2.5-flash-image-preview` for final blending.
- Static shell (`public/`): CRA HTML/assets with IMG.LY bundle in `public/browser.js`.

## Project Structure
- `src/`: `App.js`, `Canvas.js`, `ObjectLayer.js`, `LayerItem.js`, tests and setup.
- `src/worker.js`: Off-main-thread image tasks (background removal, conversions).
- `api/gemini.js`: Vercel Edge Function Gemini proxy (server env vars/limits/error handling).
- `public/`: Static assets and CRA HTML shell.
- `vercel.json`: Function-level resource limits/regions.

## Prerequisites
- Node 18+ and Yarn 1.x
- Vercel CLI (`npm i -g vercel`) for local Edge Functions
- Gemini API key set in your environment

## Setup
1) Install dependencies
```
yarn
```
2) Environment variables
```
cp .env.example .env
# Then set GEMINI_API_KEY in .env or your shell
```
Required:
- `GEMINI_API_KEY` – used only by `api/gemini.js` (never exposed to the client)

## Development
Run Edge Function and React app in parallel (CRA proxies API calls).

Terminal A (Vercel dev on 5001):
```
yarn dev:vercel
```

Terminal B (CRA on 3000):
```
yarn start
```

App: http://localhost:3000
API: http://localhost:5001 via CRA proxy (`proxy` in `package.json`).

## Testing
```
yarn test
```

## Production Build
```
yarn build
```

## Deployment (Vercel)
- Ensure `GEMINI_API_KEY` is set in your Vercel Project Environment Variables.
- Deploy via Vercel CLI or Git integration. Edge Function is available at `/api/gemini`.

## Usage (Quick Start)
1) Upload/drop a base image onto the canvas.
2) Add object images (multi-select). The Worker removes backgrounds and adds them as layers.
3) In the canvas, position/scale/rotate each object. Use the left panel to reorder and toggle visibility.
4) Optionally add a prompt on the right (e.g., “warmer lighting, soft shadow under the mug”).
5) Click Generate Final. Gemini refines edges/lighting/shadows without moving objects.
6) Export PNG/WebP.

## Gemini Integration (Details)
- Image Understanding:
  - In pipeline mode, `api/gemini.js` feeds base/object PNGs to the text model (`gemini-2.0-flash`) to get succinct descriptions.
  - Those descriptions seed the final blend prompt with scene context.
- Final Blend:
  - Sends inputs to `gemini-2.5-flash-image-preview` with strict “do not move or resize” rules; improves realism only.
- Progressive steps: Integrates objects two at a time to control drift/cost.
- Security/limits: Keys remain server-side; standardized errors and rate limiting are applied.

## Limits & Safety
- Usage limits depend on your API plan.
- Costs follow your billing plan if you use a paid API key.
- Do not store secrets in `REACT_APP_*`; use server-side env vars only.

## Troubleshooting
- 404 at `/api/gemini`: Ensure `yarn dev:vercel` runs on port 5001.
- 401/403 from API: Check `GEMINI_API_KEY` in local `.env` and in Vercel.
- UI stutter on large images: Verify the Worker is active (`src/worker.js`); avoid main-thread heavy work.

## License
Proprietary — internal hackathon project. Replace with your preferred license if open-sourcing.
