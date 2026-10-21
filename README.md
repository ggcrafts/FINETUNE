# FineTune — Portfolio of Luiz Gustavo Czaika

> Where ideas take form. · Observe. Create. Refine.

Source of truth: [`FINETUNE_MASTER_SPEC_CODEX.md`](./FINETUNE_MASTER_SPEC_CODEX.md).
Current status: **Phase 01 + Phase 02 (hero optical system) + interaction layer** — see "What's live" below.

## Como rodar (Windows)

1. Instale o **Node.js LTS** uma única vez: https://nodejs.org
2. Dê dois cliques em **`start.bat`**.
   - Na primeira vez ele instala as dependências (~1 min).
   - Depois abre o site automaticamente em `http://localhost:5173`.
3. Para parar o servidor, feche a janela do terminal.

Alterações nos arquivos aparecem no navegador na hora (hot reload).

### Terminal / VS Code

```bash
npm install      # first time only
npm run dev      # local server with hot reload → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

Debug overlay (12/8/4 column grid + state HUD): `http://localhost:5173/?debug=true`

## What's live

- **Hero** — real-time light vortex around a glass core (WebGL2, no 3D library): procedural ribbons, refraction with crystal dispersion, Fresnel iridescence, selective bloom, focus band, chromatic aberration, mouse parallax + gravitational bending; slow autopilot on touch. Poster image stays as fallback (no WebGL / context loss / reduced motion still shows a static 3D frame).
- **"form"** — self-calibrating type (seeded cycles: weight + fill→stroke wave, approval blink). The FT-01 readout shows its live weight / stroke / progress / seed.
- **Stacked slides** — panels are sticky; the next one rises with blur→focus while the previous recedes and dims. Scroll-linked, no scroll-jacking. Off with reduced motion.
- **Keyword calibration** — discovery / visible / precision / tools / form tune in as their section enters.
- **Grid parallax** — follows the mouse; constant soft drift on touch/idle.
- **Line waves** — frame lines near the cursor become spectral waveforms with sparks (desktop only).
- **Tool icons** — from `simple-icons` (synced automatically) or your own SVGs in `public/assets/tools/custom/`. Edit the list in `src/data/tools.json`.
- **Tuning** — `?debug=true` opens the FineTune parameter panel (all hero params live) + FPS / draw calls / triangles.
- **Hero shape** — the centre is a cut crystal (rounded, lapidated dodecahedron). `?shape=twist` brings back the previous twisted glass column for comparison.
- **Accent** — the UI accent is a living spectral hue (`src/motion/spectrum.ts`) cycling through the hero-line palette; `--ft-green` is kept as an alias of `--ft-accent`.

## Structure

```text
public/
  references/        approved art direction (hero + hierarchy blueprint)
  assets/brand/      hero poster (static / no-WebGL fallback), og image
  assets/projects/   PLACEHOLDER crops — replace with real media (Phase 05)
  assets/textures/   practice / lab / contact optical crops
  assets/portrait/   put the real portrait here
src/
  main.ts            entry: fonts, styles, component init
  state.ts           central FineTuneState + single RAF loop (spec §67)
  styles/            tokens, typography, global, layout, responsive
  components/        Header, Hero, Philosophy, Practices, Work, Process, Lab, About, Contact, Footer
  data/projects.ts   Observed Works content (edit here)
  debug/             ?debug=true tools
  utils/             clamp, lerp/damp, device + quality estimate
  webgl/             hero light vortex: gl.ts, math.ts, params.ts, quality.ts, hero/, shaders/*.glsl
  motion/            stack.ts (slides), ambient.ts (grid parallax)
  effects/           lineWaves.ts (cursor waveforms)
  components/Tools   tool icon strips (data in src/data/tools.json)
scripts/sync-icons.mjs  copies brand icons from simple-icons → public/assets/tools/
```

## Languages (EN / PT-BR)

English is written in `index.html`. Portuguese lives in `src/i18n/pt.ts`
(text map keyed by the English string, plus a few HTML blocks for headings).
The EN/PT switch is in the header; the choice is remembered, and first visits
follow the browser language. Project copy has a `pt` field in `src/data/projects.ts`.

## Placeholders to replace

- `src/data/projects.ts` — the `context` lines are draft copy; confirm or rewrite.
- `public/assets/projects/*` — crops of the hero artwork marked "Media pending".
- About portrait — a real photo only (`public/assets/portrait/`).
- `<link rel="canonical">` in `index.html` — set the final domain.

## Tool logos

`npm run icons` (runs automatically on start) copies the logos it finds in `simple-icons`.
Brands not in that package show a small monogram (e.g. `Hf`). To show their real logo,
download the official SVG from the brand's press kit and save it as
`public/assets/tools/custom/<id>.svg` (ids in `src/data/tools.json`).

## Next

Phase 03 — Work/Process rhythm (process rail driven by scroll), Phase 04 — live Lab experiments,
Phase 05 — real project media.

## Publish online (GitHub Pages)

Double-click **publish.bat** (needs Git and GitHub CLI; the first run asks you to sign in to GitHub).
It creates the public repository `finetune` under your account, pushes the code and turns on Pages.
Every later run pushes your changes; `.github/workflows/deploy.yml` rebuilds the site automatically.
Live URL: `https://<your-user>.github.io/finetune/`.

## Reel clips

Drop short silent WebM loops into `public/assets/reel/` (`clip-01.webm` … `clip-06.webm`, 3–6 s, ~480–720 px wide)
and set `placeholder: false` in `src/data/reel.ts`. Add or remove entries there to change the count.
