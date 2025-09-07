# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React app source (e.g., `App.js`, `Canvas.js`, `ObjectLayer.js`, `LayerItem.js`). Tests live alongside modules as `*.test.js` and setup in `src/setupTests.js`.
- `api/`: Vercel Edge Functions (e.g., `api/gemini.js`) used to proxy external AI calls and protect secrets.
- `public/`: Static assets and CRA HTML shell.
- Workers: `src/worker.js` runs background removal off the main thread; invoked by `ObjectLayer`.

## Build, Test, and Development Commands
- `npm start`: Starts CRA dev server at `http://localhost:3000` with linting and HMR.
- `npm test`: Runs Jest in watch mode with React Testing Library.
- `npm run build`: Produces optimized production bundle in `build/`.
- `npm run eject`: Copies CRA config (one‑way; avoid unless necessary).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; use semicolons; single quotes in JS/JSX.
- Components: PascalCase files (e.g., `Canvas.js`, `ObjectLayer.js`); hooks/functions camelCase.
- State shape: Prefer plain objects/arrays; keep render‑safe derivations in components.
- Linting: CRA’s ESLint defaults (`react-app`, `react-app/jest`). Fix warnings surfaced by `npm start`.

## Testing Guidelines
- Frameworks: Jest + React Testing Library (`@testing-library/*`).
- Placement: Co-locate tests (`src/Component.test.js`).
- Conventions: Test user-visible behavior over implementation; use `screen` queries and `data-testid` sparingly.
- Running: `npm test` (watch). For a single file: `npm test -- Canvas.test.js`.

## Commit & Pull Request Guidelines
- Commits: Present-tense, concise (e.g., `feat: add layer reordering`, `fix: guard null stageRef`).
- Branches: `feat/<summary>`, `fix/<issue-id>`, `chore/<task>`.
- PRs: Include scope/description, before/after screenshots for UI, steps to test, and link issues. Ensure `npm test` passes and the app builds.

## Security & Configuration Tips
- Secrets: Never expose secrets to the client. Use Vercel project env vars in `api/*` (Edge Functions). Avoid `REACT_APP_*` for secrets—these are public.
- Worker safety: Keep heavy image work in `src/worker.js`; pass transferable data (e.g., `ImageData`) to avoid UI jank.
- Deployment: Vercel config lives in `vercel.json` (e.g., `api/gemini.js` memory/duration limits).

