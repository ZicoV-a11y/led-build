# LED Build — Space Cable

Single-page React app for planning LED-wall cable looms: wall/rigging setup,
XD hub routing (over-truss / at-panel), loom-build measurements, the SOCA stock
calculator, and per-wall show summaries.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build
```

## Saving your work

- **Projects** (in-app): saved to the browser's localStorage, persists between sessions.
- **Export to file**: downloads a `.loomproject.json` you can archive per show and
  re-open later with **Import from file**.

## Structure

- `src/LoomBuilder.jsx` — the whole app (one component).
- `src/main.jsx` — mounts it, installs the localStorage-backed `window.storage` shim.
