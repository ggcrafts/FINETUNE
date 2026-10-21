# FINETUNE PRISM — MASTER BUILD SPEC
## Codex + VS Code Implementation Brief

**Project:** Portfolio / Creative Technology website  
**Role positioning:** Senior Motion Designer · Art Director · Creative Technologist  
**Primary language:** English  
**Build environment:** VS Code + Codex  
**Status:** visual direction, narrative and hierarchy approved  
**Authority:** this file is the source of truth. If framework defaults, component habits or convenience conflict with this document, this document wins.

---

# 1. Mission

Build a premium, cinematic, highly interactive portfolio that expresses **FineTune** as a philosophy of observation, experimentation, calibration and refinement.

The visitor should feel that they are not simply viewing finished images. They are **observing visual systems taking shape**.

Central metaphor:

> **Light revealing form.**

Primary headline:

> **Where ideas take form.**

Manifesto:

> **Creation is a process of discovery.**

Process statement:

> **From possibility to precision.**

Signature:

> **Observe. Create. Refine.**

The portfolio must communicate two things simultaneously:

1. Creative viewers should feel a distinctive visual language.
2. Recruiters should immediately understand what Luiz does.

Neither can be sacrificed.

---

# 2. Core positioning

**Senior Motion Designer · Art Director · Creative Technologist**

Core disciplines:

- Art Direction
- Motion Design
- 3D
- VFX
- AI-assisted creative workflows
- Creative Technology
- Automation
- Interactive Visual Systems

Content priority:

1. Work
2. Thinking
3. Process
4. Technical depth
5. Tools

Tools must never dominate the work.

---

# 3. FineTune Prism — visual north star

Internal visual-system name:

## FineTune Prism
### Observed Light Systems

Visual qualities:

- optical
- cinematic
- iridescent
- refractive
- precise
- technological
- controlled
- intelligent
- emergent
- dimensional
- scientific-poetic
- premium

The site should feel somewhere between:

- an optical laboratory
- a cinematic title sequence
- an observatory
- a creative-technology studio
- high-end motion branding
- experimental visual research

It must **not** feel like:

- cyberpunk
- gaming UI
- crypto
- generic AI neon
- holographic dashboard
- hacker terminal
- glassmorphism-heavy SaaS
- fake telemetry spam
- purple-gradient AI branding
- a generic Three.js demo
- a Behance masonry grid

---

# 4. Approved visual references

Before implementation, place the approved images locally:

```text
public/references/
├─ hero-approved.png
├─ hierarchy-blueprint-approved.png
├─ ref-light-streaks-01.png
├─ ref-iridescent-glare-02.png
├─ ref-light-flow-03.png
└─ ref-gravity-light-04.png
```

## `hero-approved.png`

Use as art-direction target and static fallback/poster.

Preserve:

- deep navy / near-black environment
- transparent or smoked-glass sculptural form
- luminous orbital light
- iridescent crystal glare
- cyan / violet / magenta / soft amber spectral highlights
- selective focus
- cinematic depth
- expensive CGI finish
- the sense of matter emerging from energy

Do **not** merely use it as a static wallpaper and consider the hero finished.

## `hierarchy-blueprint-approved.png`

This is the primary layout reference.

Extract:

- clear page start
- visible structural frame
- strong header
- left-side hero copy
- right/center optical focal object
- restrained technical micro-UI
- tight hero → philosophy transition
- compact vertical rhythm
- 3-project observed-works preview
- concise process strip
- experimental lab
- clear final CTA
- technological typography
- substantially less dead space than the first prototype

Do not copy generated fake copy or fake telemetry from the blueprint. Copy its **composition, hierarchy, density, rhythm and spatial logic**.

---

# 5. Four FineTune pillars

Every important visual or interaction decision should support at least one pillar.

## Observation
The interface behaves like an instrument observing a phenomenon.

Use selective focus, focal planes, lens behavior, pointer-influenced refraction, calibrated parallax and depth changes.

## Refinement
Everything feels tuned.

Use rigorous grid, consistent spacing, controlled line weights, deliberate easing, restrained micro-UI and precise visual alignment.

## Emergence
Things form instead of merely appearing.

Prefer blur → focus, scattered → aligned, refracted → coherent, line convergence, depth reveals and geometric resolution. Generic fade-up should never become the dominant motion language.

## Intelligent Creation
Technology is part of the craft, not a badge.

Use subtle references to vectors, shader parameters, rendering, pipelines, procedural behavior, code, automation and system states. Never turn the page into a fake developer dashboard.

---

# 6. Color system

```css
:root {
  --ft-black: #05090E;
  --ft-midnight: #0A1320;
  --ft-slate: #111B28;
  --ft-pearl: #E9F0F4;
  --ft-mist: #9BAAB5;
  --ft-line: rgba(233, 240, 244, 0.12);
  --ft-line-soft: rgba(233, 240, 244, 0.06);
  --ft-panel: rgba(233, 240, 244, 0.035);
  --ft-green: #78D98A;
}
```

FineTune Green is a **technical accent**, not the dominant color.

Use it for active states, focus, selected labels, progress, small system feedback and occasional CTA emphasis.

Iridescent cyan, violet, rose, pearl and amber should appear mostly as consequences of **refraction, glass, bloom and chromatic dispersion**. Do not turn them into random UI gradients.

The interface itself remains primarily:

**black + pearl + mist + restrained FineTune green.**

---

# 7. Typography

The previous typography was too neutral/editorial. The new direction must be more technological and precise.

Headlines: **Space Grotesk**  
Body: **Inter**  
Technical labels: **IBM Plex Mono**

```css
--font-display: "Space Grotesk", "Inter Tight", "Helvetica Neue", Arial, sans-serif;
--font-body: "Inter", "Helvetica Neue", Arial, sans-serif;
--font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Use mono only for section IDs, coordinates, technical data, project metadata, shader readouts and Lab details. Do not use mono for normal paragraphs.

Suggested scale:

```css
--display-xl: clamp(4.5rem, 8vw, 9rem);
--display-lg: clamp(3.3rem, 6vw, 6.4rem);
--display-md: clamp(2.4rem, 4.2vw, 4.4rem);
--body-lg: 1.125rem;
--body-md: 1rem;
--body-sm: .875rem;
--mono-sm: .6875rem;
--mono-xs: .625rem;
```

Hero headline:

```css
line-height: .90;
letter-spacing: -.055em;
font-weight: 600;
```

Do not make every section title equally large.

---

# 8. Grid, spacing and density

```css
--page-max: 1440px;
--page-padding: clamp(18px, 4vw, 64px);
--section-xl: clamp(88px, 8vw, 128px);
--section-lg: clamp(64px, 6vw, 96px);
--section-md: clamp(44px, 4vw, 72px);
```

Grid:

- Desktop: 12 columns
- Tablet: 8 columns
- Mobile: 4 columns

Explicit rejection from the first prototype:

> **Do not create giant empty black gaps between sections.**

The page should preserve visual tension and continuity. Each viewport should contain a meaningful focal point.

Target:

```text
high clarity
medium information density
high visual sophistication
low clutter
```

---
# 9. Recommended technical stack

Preferred:

```text
Vite
TypeScript
Three.js
GSAP
ScrollTrigger
Lenis
GLSL
CSS Grid
CSS custom properties
```

Evaluate only when useful:

```text
postprocessing
glsl-noise
glslify
simplex-noise
Leva        (dev tuning only)
Stats.js    (dev metrics only)
Theatre.js  (only if timeline authoring materially helps)
```

If React is already a deliberate architectural choice, R3F/Drei may be used. Do not introduce React solely to gain access to React Three Fiber.

Do not stack multiple libraries solving the same problem without a concrete reason.

---

# 10. Suggested project structure

```text
finetune/
├─ public/
│  ├─ assets/
│  │  ├─ brand/
│  │  ├─ projects/
│  │  ├─ portrait/
│  │  ├─ textures/
│  │  ├─ models/
│  │  └─ hdr/
│  └─ references/
├─ src/
│  ├─ main.ts
│  ├─ data/projects.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ typography.css
│  │  ├─ global.css
│  │  ├─ layout.css
│  │  └─ responsive.css
│  ├─ components/
│  │  ├─ Header/
│  │  ├─ Hero/
│  │  ├─ Philosophy/
│  │  ├─ Practices/
│  │  ├─ Work/
│  │  ├─ Process/
│  │  ├─ Lab/
│  │  ├─ About/
│  │  └─ Contact/
│  ├─ webgl/
│  │  ├─ renderer.ts
│  │  ├─ camera.ts
│  │  ├─ quality.ts
│  │  ├─ hero/
│  │  │  ├─ HeroScene.ts
│  │  │  ├─ OpticalObject.ts
│  │  │  ├─ LightTrails.ts
│  │  │  └─ HeroPost.ts
│  │  ├─ lab/
│  │  │  ├─ RefractionField.ts
│  │  │  └─ ParticleConvergence.ts
│  │  └─ shaders/
│  │     ├─ glass.vert.glsl
│  │     ├─ glass.frag.glsl
│  │     ├─ trails.vert.glsl
│  │     ├─ trails.frag.glsl
│  │     ├─ refraction.frag.glsl
│  │     └─ optical-noise.glsl
│  ├─ motion/
│  │  ├─ lenis.ts
│  │  ├─ scroll.ts
│  │  ├─ heroTimeline.ts
│  │  └─ transitions.ts
│  └─ utils/
│     ├─ clamp.ts
│     ├─ lerp.ts
│     ├─ raf.ts
│     └─ device.ts
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ FINETUNE_MASTER_SPEC.md
```

---

# 11. Global navigation

The header must make the page feel intentionally designed from the first frame.

Suggested structure:

```text
[ FT / FineTune ]
Motion Design & Creative Technology

                           Work
                           Process
                           Lab
                           About
                           Contact
```

Characteristics:

- transparent dark surface
- thin technical border
- restrained height
- subtle backdrop blur if it helps
- mono microcopy
- small active-state line
- no rounded SaaS container

Past the hero, the nav may become slightly more opaque and structured.

---

# 12. Hero — critical section

The hero must feel like the entrance to a living visual instrument, not a background image.

## Hero layout

Left:

1. technical eyebrow
2. main headline
3. concise supporting copy
4. primary CTA
5. secondary CTA
6. micro metadata/capability strip

Right / center:

- optical focal object
- procedural light system
- restrained system readouts

The artwork may break the frame subtly, but the **interface frame must make the beginning of the website obvious**.

Hero copy:

```text
SENIOR MOTION DESIGNER · ART DIRECTOR · CREATIVE TECHNOLOGIST

Where ideas
take form.

I create visual systems where motion, 3D, VFX, AI and creative technology converge into work that feels precise, cinematic and alive.

View selected work
Explore the process
```

---

# 13. Hero interaction system

The hero must feel alive within the first three seconds.

Use several low-amplitude systems rather than one giant gimmick.

Pointer should influence:

- refraction center
- light bending
- subtle lens distortion
- tiny chromatic separation
- focal plane
- optical-object parallax

Do not attach objects directly to the pointer. Use eased interpolation.

Concept:

```ts
current.x += (target.x - current.x) * 0.06;
current.y += (target.y - current.y) * 0.06;
```

The interaction should be noticeable but not distracting.

---

# 14. WebGL strategy

Use Three.js as the main 3D/WebGL engine.

Renderer baseline:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
```

Tune exposure manually.

Do not default to DPR 2–3 on high-resolution displays.

The approved hero image is a visual target and fallback, not the final implementation by itself.

---

# 15. Optical focal object

Explore a custom sculptural geometry, not a stock sphere.

Possible material basis:

```ts
new THREE.MeshPhysicalMaterial({
  transmission: 1,
  roughness: 0.08,
  metalness: 0,
  ior: 1.45,
  thickness: 1.8,
  clearcoat: 1,
  clearcoatRoughness: 0.08
});
```

Extend with custom shader logic when needed.

The object should feel:

- transparent/smoked
- optically dense
- sculptural
- elegant
- partially unresolved
- capable of refracting the world around it

Do not pursue physical realism at the expense of the approved art direction.

---

# 16. Iridescent shader

Build controlled iridescence based on view angle, normal and light.

Concept:

```glsl
float fresnel = pow(
  1.0 - max(dot(viewDirection, normal), 0.0),
  3.0
);

float spectralShift = sin(fresnel * 8.0 + uTime * 0.15);
vec3 iridescence = palette(spectralShift);
```

Iridescence should be strongest on:

- edges
- thin surfaces
- grazing angles
- highlights

It should not coat the whole object in rainbow color.

---

# 17. Refraction

Explore:

- transmission
- framebuffer/screen-space refraction
- normal-driven UV displacement
- subtle per-channel spectral offset

Concept:

```glsl
vec2 distortedUV = uv + normal.xy * uRefraction * uMouseInfluence;
```

For controlled chromatic dispersion:

```glsl
float r = texture2D(scene, uv + offsetR).r;
float g = texture2D(scene, uv + offsetG).g;
float b = texture2D(scene, uv + offsetB).b;
```

Chromatic aberration must remain subtle. If the image looks broken rather than refracted, reduce it.

---

# 18. Procedural light trails

Light trails are a core brand device and must not exist only inside a JPG.

Evaluate:

- CatmullRomCurve3
- custom ribbon geometry
- instanced ribbons
- shader-driven lines
- GPU particles when justified

Preferred starting direction:

**CatmullRomCurve3 + custom ribbon shader + additive blending**.

Trails should:

- enter from outside the viewport
- curve around the focal object
- converge around relevant content
- continue into the next section
- respond gently to scroll and pointer
- vary intensity rather than loop mechanically

Avoid audio-visualizer aesthetics.

Motion concept:

```glsl
wave =
  sin(position.x * 2.1 + time * 0.22) * 0.4 +
  sin(position.x * 5.7 - time * 0.13) * 0.15;
```

Add subtle noise for microvariation.

---

# 19. Bloom and glare

Use selective bloom, not full-screen glow.

Suitable options:

- postprocessing Bloom
- UnrealBloomPass

Bloom should target:

- hottest light trails
- specific crystal edges
- caustic highlights
- spectral glints

Do not bloom typography or body text.

---

# 20. Focus / tilt-shift behavior

The references use selective focus and a tilt-shift-like focal plane.

Do not imitate miniature photography.

Preferred methods:

- depth-based DOF
- custom focus-band postprocess
- selective blur mask

Focus may respond slightly to:

- pointer Y
- hero scroll state
- active section

The result should feel as if the system is deciding **what to observe**.

---

# 21. Hero scroll choreography

The first scroll should be a cinematic transition, not a simple fade.

Suggested choreography:

```text
0–15%    hero fully composed
15–40%   optical object pushes subtly deeper
35–60%   copy sharpens/repositions slightly
50–75%   light trails start aligning toward transition boundary
70–100%  visual field resolves into Philosophy
```

A light streak should visibly connect Hero → Philosophy.

Do not fade the hero into empty black space.

---

# 22. Development tuning panel

In development, create a Leva/lil-gui tuning panel with at least:

```text
refractionStrength
chromaticAberration
bloomStrength
bloomThreshold
focusDistance
focusRange
trailIntensity
trailSpeed
trailCount
parallaxStrength
mouseInfluence
noiseScale
noiseSpeed
glassIOR
fresnelStrength
exposure
sceneRotation
scrollInfluence
```

This panel must not ship in production.

The tuning process is intentionally part of the FineTune philosophy.

---
# 23. Philosophy section

This section must sit close to the hero and feel like the hero resolving into meaning.

Headline:

> **Creation is a process of discovery.**

Body:

```text
I see creativity as more than producing an image.

It is about finding the right paths, exploring possibilities and watching ideas gradually take shape.

FineTune is where exploration becomes intention, and intention becomes form.
```

Layout:

- large statement on the left
- supporting text on the right
- compact vertical spacing
- one optical structural line or light continuation
- no large dead band before/after

---

# 24. Fields of Practice

Use four disciplines:

```text
01 Art Direction & Design
02 Motion, 3D & VFX
03 AI-Assisted Creation
04 Creative Technology
```

Do not render these as four generic cards.

Preferred behavior:

- full-width accordion or editorial rows
- hover/active visual preview
- thin grid lines
- active numbered state
- restrained technical labels

On hover/active:

- line intensity increases
- preview changes
- description sharpens
- optional tiny shader response

---

# 25. Observed Works

Section title:

> **Ideas made visible.**

Initial projects:

### HBO Max — BFF Nossa Voz
**VFX · 3D · Compositing**

### Bravecto Experience
**Art Direction · 3D · Immersive Experience**

### YES! Idiomas — Diga Sim ao Mundo
**Motion Design · VFX · Visual Storytelling**

### Generative Video Workflow
**AI · Blender Previsualization · Creative Workflows**

The approved hierarchy suggests three prominent previews initially. Use either one dominant project + two supporting projects, or three editorial frames if media quality is comparable.

Each project preview should include:

- strong image/video
- project index
- title
- discipline
- one concise context line
- `Open case` CTA

Avoid badge clutter.

Project hover may use focus shift, slight camera push, optical edge refraction, clip preview, cursor lens or trail direction change.

Do **not** use generic 3D card tilt.

---

# 26. Case-study format

Each case should answer:

```text
Challenge
Idea
Execution
Outcome
```

Then, when relevant:

```text
Role
Tools
Pipeline
Breakdown
```

Prioritize thinking and result over software.

The intended perception is:

> **craft + reasoning + technical depth**

Use media such as:

- full-width video
- short loops
- before/after
- 3D viewport captures
- VFX/compositing breakdown
- AI-generation evolution
- scripts/automation demonstrations
- stills and motion tests

Do not force every case into the exact same template.

---

# 27. FineTune Process

Headline:

> **From possibility to precision.**

Stages:

```text
01 Observe
02 Shape
03 Explore
04 Refine
05 Evolve
```

Do not use five cards.

Use a **calibration rail / living light path**.

Conceptually:

```text
────●────────●────────●────────●────────●────
 Observe   Shape    Explore   Refine    Evolve
```

During scroll:

- active node brightens
- light travels between nodes
- current content comes into focus
- prior stages recede
- line remains visually connected to the FineTune system

---

# 28. Experimental Lab

Headline:

> **Beyond the tools.**

This is a major differentiator and must feel credible.

Subjects:

- Codex
- VS Code
- Python
- JavaScript
- Blender add-ons
- Adobe APIs
- Web 3D
- shaders
- automation
- AI-assisted development
- animated landing pages
- visual prototyping

The section should feel like a creative R&D environment, not a hacker terminal.

Suggested composition:

```text
visual experiment      code / system
visual experiment      capabilities
                       side rail
```

Use one narrow vertical side rail:

```text
R&D
SYSTEMS
PROTOTYPES
CREATIVE CODE
```

Possible live mini-experiments:

### Refractive Field
Pointer distorts a vector field.

### Generative Light
Light lines search for stable paths.

### Noise Calibration
Noise gradually resolves into structure.

### Particle Convergence
Particles organize around a focal point.

These should be real experiments, not fake screenshots.

Pause offscreen experiments and keep GPU cost low.

---

# 29. About

Headline:

> **A designer's eye. A technologist's curiosity.**

Copy:

```text
I'm Luiz Gustavo Czaika, a Brazilian Senior Motion Designer and Art Director with more than 12 years of experience across animation, 3D, VFX, immersive experiences and digital content.

Today I combine that creative foundation with AI-assisted workflows, coding and automation.

I'm particularly interested in collaborating with international teams that value creativity, experimentation, technical thinking and thoughtful execution.
```

Use a real portrait when supplied.

Do not generate a fake portrait.

---

# 30. Contact

Headline:

> **Let's give your next idea a form.**

Supporting text:

```text
Available for international remote opportunities, collaborations and challenging visual work.
```

Primary CTA:

```text
Let's talk
```

Contact:

```text
lgczaika@gmail.com
linkedin.com/in/lgczaika
behance.net/lgczaika
```

Use an optical focus interaction for the contact target.

---

# 31. Footer

Keep minimal:

```text
FineTune
Observe. Create. Refine.
Motion Design & Creative Technology
Curitiba, Brazil
```

No oversized conventional footer sitemap.

---

# 32. Scroll system

Recommended:

- **Lenis** for smooth scroll
- **GSAP ScrollTrigger** for choreography

Smooth scrolling must feel responsive, never heavy or delayed.

Starting point:

```ts
const lenis = new Lenis({
  duration: 0.9,
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.2
});
```

Tune in real browser testing.

Main easing:

```text
cubic-bezier(0.22, 1, 0.36, 1)
power3.out
```

Slow atmospheric movement:

```text
sine.inOut
```

Avoid bounce, elastic or aggressive overshoot.

---

# 33. Transition language

Transitions should reuse the same optical grammar:

- focus
- refraction
- light alignment
- depth
- masks
- geometric convergence

The site should feel like one continuous visual system, not a series of disconnected effects.

---

# 34. Buttons and CTAs

Avoid generic rounded pills.

Primary CTA may use:

- rectangular technical frame
- viewfinder corners
- directional arrow
- sharpening border/focus state

Hover behavior:

```text
border sharpens
optical line aligns
arrow moves slightly
a local light response appears
```

Hero CTA preferred text:

```text
VIEW SELECTED WORK
```

Secondary:

```text
EXPLORE PROCESS
```

Use neon-green fill at most very selectively.

---

# 35. Micro-UI

Allowed:

- index numbers
- focus indicators
- tiny coordinates
- section IDs
- shader values
- calibration ticks
- system status
- project metadata

Rule:

> Every technical element must have a visual purpose.

No fake telemetry spam.

A subtle grid may appear in Hero, Process and Lab at approximately:

```css
opacity: .025 to .065;
```

It should often disappear before users consciously register it.

---

# 36. Section IDs

Suggested:

```text
01 / HERO
02 / PHILOSOPHY
03 / OBSERVED WORKS
04 / PROCESS
05 / EXPERIMENTAL LAB
06 / ABOUT
07 / CONTACT
```

Keep them understated.

---

# 37. Responsive philosophy

Do not simply scale desktop down.

Mobile should feel like a **different camera framing of the same world**.

Hero mobile:

- focal object centered or upper-right
- headline remains primary
- fewer trails
- reduced optical micro-UI
- stronger readability gradient where needed

Work:

- vertical sequence
- large visual previews

Process:

- vertical calibration rail

Lab:

- one live shader/experiment at a time

Suggested breakpoints:

```css
--bp-sm: 600px;
--bp-md: 900px;
--bp-lg: 1200px;
--bp-xl: 1600px;
```

Prefer `clamp`, `minmax`, container queries and intrinsic layout over breakpoint-only thinking.

---

# 38. Performance and adaptive quality

Desktop target:

- 60 FPS on modern discrete GPUs
- acceptable 45+ FPS on integrated graphics

Mobile:

- graceful degradation
- 30–60 FPS
- fewer particles/trails
- reduced bloom
- simpler refraction
- static fallback on weak hardware if needed

Implement quality presets:

```text
LOW
MEDIUM
HIGH
ULTRA
```

Possible detection inputs:

```ts
window.devicePixelRatio
navigator.hardwareConcurrency
navigator.deviceMemory
screen.width
```

Example:

### LOW
- no expensive DOF
- minimal bloom
- reduced trail count
- no high-resolution framebuffer refraction

### HIGH
- full refraction
- selective bloom
- shader trails
- moderate DOF

### ULTRA
- higher framebuffer scale
- richer trail count
- enhanced postprocessing

Do not expose quality controls publicly unless necessary.

---

# 39. WebGL lifecycle

Mandatory:

- dispose materials
- dispose geometries
- dispose textures
- remove RAF loops
- pause offscreen canvases
- handle resize efficiently
- avoid allocation in render loops
- handle WebGL context loss

Bad:

```ts
function tick() {
  const v = new THREE.Vector3();
}
```

Good:

```ts
const tempVec = new THREE.Vector3();

function tick() {
  tempVec.set(...);
}
```

Use IntersectionObserver to pause inactive visual systems, videos and expensive shaders.

Do not use viewport observers to leave important semantic content invisible until triggered.

---
# 40. Accessibility and reduced motion

Mandatory:

- semantic HTML
- keyboard navigation
- visible focus states
- meaningful alt text
- WCAG-conscious contrast
- `prefers-reduced-motion`
- no interaction available only by mouse

Reduced-motion mode should:

- stop continuous camera motion
- remove heavy parallax
- reduce or stop animated trails
- keep the complete hero composition visible
- preserve hierarchy and readability
- use static optical imagery when necessary

A reduced-motion visitor must receive the same information and brand quality.

---

# 41. Static and failure fallback

If WebGL fails, the hero must still render:

- approved hero artwork
- complete headline/copy
- CTA
- correct layout
- correct page transition hierarchy

Concept:

```ts
if (!supportsWebGL()) {
  enableStaticHero();
}
```

A shader compile failure or context loss must never leave a black rectangle.

Handle:

- missing textures
- WebGL context lost/restored
- unsupported extensions
- failed project video
- shader compilation errors

Development should log useful diagnostics. Production should degrade gracefully.

---

# 42. Media strategy

Images:

```text
AVIF preferred where practical
WebP fallback
responsive srcset
lazy loading below first viewport
```

Video previews:

```html
<video muted playsinline preload="metadata" poster="...">
```

Use H.264 MP4 as safe baseline, optional WebM where beneficial.

Pause videos when offscreen.

Do not autoplay several heavy previews at once.

Project imagery must become a visual priority once real assets are supplied.

---

# 43. Loading experience

Avoid generic spinner.

FineTune loading concept:

```text
unstable light line
→ aligns
→ sharpens
→ becomes part of hero grid/system
```

Target approximately 500–900 ms only when loading is genuinely needed.

If critical assets are cached, skip the loader.

Never create a cinematic intro that blocks the website for multiple seconds.

---

# 44. Page-start clarity

This is a direct correction of the rejected first prototype.

At first paint the viewer must immediately perceive:

- navigation
- interface boundary/frame
- headline hierarchy
- CTA
- optical focal object
- technical context
- where the site begins

The artwork may be immersive, but the website must not look like “text sitting on a wallpaper.”

---

# 45. Copy rules

Writing should be:

- precise
- human
- confident
- concise
- intelligent

Avoid generic marketing vocabulary such as:

- elevate
- revolutionize
- cutting-edge
- seamless
- innovative solutions
- AI-powered everything

Do not make tool names sound like achievements.

Bad:

> I use Blender, AI and After Effects.

Better:

> I build visual systems that move between design, 3D, generative tools and compositing.

---

# 46. SEO and metadata

Implement at minimum:

```html
<title>FineTune | Luiz Gustavo Czaika</title>
<meta name="description" content="Senior Motion Designer, Art Director and Creative Technologist working across motion, 3D, VFX, AI and creative systems.">
<meta property="og:title" content="FineTune | Luiz Gustavo Czaika">
<meta property="og:description" content="Where ideas take form.">
<meta property="og:image" content="...">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="...">
```

Add JSON-LD where appropriate:

- `Person`
- `CreativeWork`
- optional `ProfessionalService`

Do not invent employers, awards or metrics.

---

# 47. Routing and case pages

Recommended URLs if individual cases are implemented:

```text
/work/hbo-bff
/work/bravecto
/work/yes
/work/generative-video
```

Use a lightweight approach. Do not build an SPA solely because it is fashionable.

For transitions between Work grid and case page, evaluate the View Transitions API with a clean fallback.

Ideal transition:

> project frame expands naturally into the case hero.

Avoid full-screen loading overlays between internal pages.

---

# 48. Content architecture / no CMS yet

Phase 1 should not depend on a CMS.

Store structured content in something like:

```ts
src/data/projects.ts
```

The architecture may remain migration-friendly for Sanity, Contentful or Storyblok later, but do not add that complexity yet.

---

# 49. Debug mode

Support:

```text
?debug=true
```

Debug mode may expose:

- FPS
- adaptive quality level
- renderer size
- DPR
- pointer coordinates
- scroll progress
- active section
- draw calls
- triangle count
- texture count
- renderer.info
- shader tuning panel

Production default is off.

---

# 50. Creative shader experiments to prototype

Codex is encouraged to prototype multiple approaches **in isolated branches/components**, compare them, and ship only the strongest coherent system.

## Optical Lens Cursor
A small lens field alters refraction around the pointer without attaching a visible gimmick to the cursor.

## Gravitational Light Bending
Light paths subtly curve toward the hero object and respond to proximity.

## Focus Scanner
A slow focal plane resolves different parts of the optical object.

## Crystal Dispersion
RGB wavelengths separate based on Fresnel/view angle.

## Trail Convergence
Disorganized lines gradually resolve into a stable path during scroll.

## Typography Interference
Large display letterforms cause tiny changes in nearby light fields, as if the type occupies optical space.

Do not ship all of them. The goal is **maximum coherence per effect**, not maximum effects.

---

# 51. Things explicitly forbidden

Do not:

- make everything glow
- animate every line of text
- use giant particle clouds in every section
- use purple UI gradients
- use floating glass cards as a default component
- use fake AI diagrams
- use generic bento grids just because they are trendy
- use dashboard-style widgets everywhere
- use 3D only to prove technical skill
- scroll-jack the user
- block the website with a 5-second intro
- sacrifice readability for postprocessing
- bury portfolio work below visual spectacle
- recreate the rejected first prototype’s giant spacing gaps
- turn the approved hero into a static wallpaper with copy over it

---

# 52. Code quality rules

Codex must:

- use TypeScript where appropriate
- keep types explicit and understandable
- keep components/modules small and purposeful
- avoid giant monolithic files
- document non-obvious shader math
- avoid unnecessary abstraction
- avoid premature “design system” engineering
- reuse vectors and buffers in render loops
- dispose GPU resources correctly
- keep visual parameters centralized

No 1000-line all-in-one `main.ts`.

Shader files should be modular and document:

```text
purpose
uniforms
performance cost
fallback behavior
```

Typical uniforms:

```glsl
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uRefraction;
uniform float uFocus;
uniform float uIntensity;
```

Do not hide giant shader strings inside unrelated UI components.

---

# 53. Git and implementation discipline

Create meaningful commits after stable milestones.

Suggested naming:

```text
feat/foundation
feat/hero-webgl
feat/light-trails
feat/work-grid
feat/process
feat/lab
perf/webgl
polish/final-motion
```

Before major visual decisions, Codex should:

1. re-read this file
2. inspect approved references
3. inspect the latest screenshot
4. identify which FineTune pillar the change serves
5. implement the smallest strong solution
6. run the site
7. capture screenshots
8. compare against references
9. refine before moving on

---

# 54. Implementation phases

## PHASE 01 — Foundation and hierarchy

Build:

- Vite + TypeScript
- semantic page structure
- tokens
- Space Grotesk / Inter / IBM Plex Mono
- responsive grid
- navigation
- hero interface structure
- compact Philosophy
- layout placeholders for Work, Process, Lab, About and Contact

**Do not begin the complex WebGL layer yet.**

First prove hierarchy and density.

## PHASE 02 — Hero optical system

Build:

- Three.js renderer
- optical focal object
- transmission/refraction
- Fresnel iridescence
- procedural light trails
- pointer response
- selective bloom
- subtle focus/DOF
- adaptive quality
- Hero → Philosophy scroll choreography

Review this phase independently before extending the visual system.

## PHASE 03 — Connected section rhythm

Implement:

- Philosophy
- Fields of Practice
- Observed Works
- Process

Priority:

- continuity
- reduced dead space
- clear projects
- optical transitions

## PHASE 04 — Experimental Lab

Build a small number of real shader/creative-code experiments.

Optimize aggressively.

## PHASE 05 — Real portfolio assets

Replace placeholders with actual projects, footage and breakdowns.

Do not lock final project color grading before the real media is present.

## PHASE 06 — Final polish

Perform:

- desktop review
- mobile review
- typography tuning
- shader tuning
- motion timing pass
- contrast/accessibility pass
- reduced-motion review
- performance profiling
- browser testing

---

# 55. Visual review loop

After every major phase:

1. Run development server.
2. Capture 1440×900 desktop screenshot.
3. Capture 1920×1080 desktop screenshot for hero quality.
4. Capture a full-page desktop screenshot.
5. Capture approximately 390×844 mobile.
6. Compare directly with `hierarchy-blueprint-approved.png`.
7. Compare Hero with `hero-approved.png`.
8. Name visual drift explicitly.
9. Correct major drift before moving forward.

Do not wait until final delivery to review design.

---

# 56. FineTune visual-drift test

After each section ask:

- Does this still feel optical?
- Does it feel calibrated?
- Does light have a structural role?
- Is the iridescence physically/visually motivated?
- Does the typography feel technological?
- Is the section connected to the previous one?
- Is the density intentional?
- Could this section belong unchanged to an unrelated AI startup?

If the answer to the last question is yes, redesign it.

---

# 57. Hero acceptance criteria

The Hero is approved only if:

- [ ] page entry is visually obvious
- [ ] hierarchy is understandable within ~3 seconds
- [ ] the system visibly responds to user input
- [ ] the optical object feels alive
- [ ] interaction preserves readability
- [ ] light trails feel structural, not decorative
- [ ] the transition connects to Philosophy
- [ ] typography feels technological and precise
- [ ] hero is more than a background image
- [ ] reduced-motion version still looks premium
- [ ] mobile framing feels intentionally art-directed

---

# 58. Full-page acceptance criteria

The website is ready only if:

- [ ] visual quality remains strong below Hero
- [ ] no giant dead spacing remains
- [ ] actual projects become a major focal point quickly
- [ ] FineTune philosophy is understandable
- [ ] Motion / Art Direction / 3D / VFX / AI / Creative Tech are clear
- [ ] Lab demonstrates credible technical curiosity
- [ ] WebGL improves rather than distracts
- [ ] mobile feels authored, not scaled down
- [ ] keyboard navigation works
- [ ] reduced motion works
- [ ] fallback works without WebGL
- [ ] no generic template sections remain
- [ ] performance is acceptable

---

# 59. Performance acceptance

Initial web-vitals goals:

```text
LCP < 2.5 s
CLS < 0.1
INP < 200 ms
```

Profile using:

- Chrome Performance panel
- Lighthouse
- Three.js `renderer.info`
- Stats.js/debug mode
- network throttling
- mobile device emulation

WebGL should not monopolize the main thread.

---

# 60. Codex operating mode

Codex should act as a **senior creative developer + art-direction implementation partner**, not as a CRUD developer.

When more than one implementation is plausible:

- prototype the visually meaningful alternatives
- compare against the approved references
- choose the solution that best supports FineTune’s pillars
- avoid settling for the first technically functional version

However, do not add complexity for its own sake.

The goal is not “the most complicated website.”

The goal is:

> **the most intentional website.**

---
# 61. VS Code environment

Recommended editor extensions/configuration for this project:

```text
ESLint
Prettier
Error Lens
GitLens
GLSL syntax / shader language support
Shader languages support for GLSL
EditorConfig
Path IntelliSense
```

Optional:

```text
TODO Tree
Pretty TypeScript Errors
```

Use Vite's development server rather than relying on Live Server once the project is initialized.

Suggested `.vscode/settings.json` principles:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.trimTrailingWhitespace": true,
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

Do not install a large collection of editor extensions that modify code unpredictably.

---

# 62. Baseline package installation

Codex may adapt versions to the current stable ecosystem, but the conceptual package set should stay minimal.

Example:

```bash
npm create vite@latest finetune -- --template vanilla-ts
cd finetune
npm install

npm install three gsap lenis postprocessing simplex-noise
npm install -D leva stats.js glslify vite-plugin-glsl eslint prettier typescript
```

Notes:

- `vite-plugin-glsl` or equivalent may be used to import `.glsl` files cleanly.
- `Leva` is dev-only in spirit; if its architecture increases bundle complexity, use `lil-gui` instead.
- Use only one preferred postprocessing path.
- Review tree-shaking and actual bundle cost before shipping.

---

# 63. Shader engineering goals

Create reusable shader modules rather than one-off visual hacks.

Useful modules/functions:

```text
fresnel()
fbm()
snoise()
rotate2D()
spectralPalette()
chromaticOffset()
softCircle()
lineGlow()
depthFade()
focusBand()
```

Recommended philosophy:

- use procedural noise for organic variation
- preserve deterministic composition
- avoid noise that destroys form
- keep frequencies low enough to feel cinematic
- avoid rapidly evolving noise fields

Shader time should generally move slowly.

The page must feel **observed and refined**, not electrically unstable.

---

# 64. Light-trail implementation exploration

Codex should test at least two approaches in Phase 02 before choosing the final carrier:

## Prototype A — Curve ribbons

Use `CatmullRomCurve3` with ribbon geometry. Advantages:

- art-directable paths
- predictable silhouette
- easier hero composition
- easy convergence toward content

Use custom fragment shader for glow, spectral edge and flow.

## Prototype B — GPU particle/line field

Use instancing or buffer geometry driven by curl/simplex-like displacement. Advantages:

- more alive
- more generative
- ideal for Lab experiments

Risk:

- can become generic particle art
- more difficult to art direct

Final hero should favor **art direction over simulation**. A hybrid is acceptable: carefully authored major ribbons plus a small procedural particle/light field.

---

# 65. Postprocessing order

Potential order to evaluate:

```text
Scene Render
→ Refraction/transmission within scene
→ Depth/Focus treatment
→ Selective Bloom
→ very subtle Chromatic/Optical finishing
→ Tone mapping/output
```

Do not layer several full-screen distortions simply because they exist.

Postprocessing should disappear psychologically. The visitor should experience the final optical phenomenon, not think “this has five effects on it.”

---

# 66. Real-time hierarchy rule

WebGL must respond to the DOM hierarchy rather than compete with it.

Examples:

- main hero trail passes behind text rather than through the paragraph
- pointer refraction weakens near body copy
- bloom exposure may reduce when text crosses bright visual areas
- focal object avoids covering the primary CTA at standard widths
- light can emphasize section boundaries and active states

The 3D scene and HTML should feel art-directed together.

---

# 67. DOM/WebGL synchronization

Centralize state such as:

```ts
interface FineTuneState {
  pointer: { x: number; y: number };
  scroll: number;
  heroProgress: number;
  activeSection: string;
  viewport: { width: number; height: number; dpr: number };
  quality: "low" | "medium" | "high" | "ultra";
  reducedMotion: boolean;
}
```

Avoid multiple components attaching competing scroll/pointer loops.

One RAF orchestration path is preferable.

---

# 68. Case-page philosophy

When cases are added, they should inherit the FineTune optical language but let the **project's own art direction become dominant**.

FineTune acts as a frame, not a filter that recolors every client project.

Recommended case flow:

```text
Project Hero
Role / Scope
Challenge
Idea
Hero Media
Execution / Breakdown
Selected Details
Outcome
Next Project
```

Use project-specific layouts when the material benefits from it.

---

# 69. User-experience constraint

No interaction should require the visitor to learn how the site works.

Creative interaction must be discoverable through normal actions:

- mouse movement
- hover
- scroll
- click/tap

Do not hide essential navigation behind experimental gestures.

---

# 70. First Codex prompt — Phase 01

Copy this into Codex after placing this MD and references in the project:

```text
Read FINETUNE_MASTER_SPEC_CODEX.md in full before touching the code.

Treat it as the project's source of truth.

Inspect every file in /public/references, especially:
- hero-approved.png
- hierarchy-blueprint-approved.png

Before writing code, summarize privately the visual rules you extracted:
1. hierarchy,
2. optical material language,
3. typography,
4. light behavior,
5. spacing rhythm,
6. interaction opportunities.

Then implement ONLY Phase 01: Foundation and hierarchy.

Use Vite + TypeScript unless the repository already contains an equivalent suitable foundation.

Implement:
- semantic page structure,
- centralized design tokens,
- Space Grotesk / Inter / IBM Plex Mono,
- responsive 12-column desktop composition,
- technological header,
- clearly framed hero hierarchy,
- compact Philosophy section,
- structural placeholders for Fields of Practice, Observed Works, Process, Experimental Lab, About and Contact.

Critical constraints:
- match hierarchy-blueprint-approved.png in composition, rhythm and density,
- do not reproduce fake project names/telemetry from the AI blueprint,
- no generic cards,
- no pill-button SaaS language,
- no giant empty section gaps,
- no complex WebGL yet,
- use hero-approved.png only as temporary visual/fallback while validating layout.

Run the site.
Capture screenshots at approximately 1440×900 and 390×844.
Compare the result against the approved blueprint.
Identify visual drift and fix the most important hierarchy/spacing issues before reporting completion.

Stop after Phase 01. Do not automatically continue into WebGL.
```

---

# 71. Second Codex prompt — Phase 02 Hero optical system

Run only after Phase 01 is visually approved:

```text
Read FINETUNE_MASTER_SPEC_CODEX.md again and proceed ONLY with Phase 02.

The Phase 01 layout is approved. Preserve its hierarchy.

Build the FineTune Hero optical system with Three.js and custom GLSL.

Use hero-approved.png as the art-direction target, not as the final background implementation.

Explore and compare at least two light-trail carriers before finalizing:
A. authored curve/ribbon trails,
B. procedural GPU line/particle field.
Prefer the solution that is easier to art-direct and closer to the approved visual reference.

Implement:
- original sculptural optical focal object,
- transmission/refraction,
- Fresnel-driven iridescent dispersion,
- art-directed procedural light trails,
- pointer-driven optical response with eased interpolation,
- restrained chromatic aberration,
- selective bloom,
- subtle focus/tilt-shift behavior,
- responsive parallax,
- Hero → Philosophy scroll choreography,
- reduced-motion fallback,
- static fallback if WebGL is unavailable,
- adaptive quality modes.

Create a development-only FineTune parameter panel for:
refractionStrength,
chromaticAberration,
bloomStrength,
bloomThreshold,
focusDistance,
focusRange,
trailIntensity,
trailSpeed,
trailCount,
parallaxStrength,
mouseInfluence,
noiseScale,
noiseSpeed,
glassIOR,
fresnelStrength,
exposure,
sceneRotation,
scrollInfluence.

The hero must visibly feel alive within three seconds, but the interaction must remain sophisticated and low-amplitude.

Do not:
- turn the hero into a particle demo,
- use uncontrolled rainbow colors,
- bloom text,
- obscure CTA/copy,
- add unrelated 3D objects,
- alter the approved hierarchy to make the WebGL easier.

Test at:
- 1440×900,
- 1920×1080,
- 390×844.

Profile FPS and renderer.info.
Capture screenshots and compare with hero-approved.png and hierarchy-blueprint-approved.png.
Refine visual drift before reporting completion.

Stop after Phase 02 for visual approval.
```

---

# 72. Third Codex prompt — Sections / rhythm / work

```text
Proceed with Phase 03 from FINETUNE_MASTER_SPEC_CODEX.md.

Preserve the approved Hero.

Implement and visually connect:
- Philosophy,
- Fields of Practice,
- Observed Works,
- FineTune Process.

The primary goal is continuity and rhythm.

Requirements:
- Philosophy begins close to the Hero without dead space.
- Fields of Practice uses editorial/accordion rows, not four generic cards.
- Observed Works becomes a major visual focal point quickly.
- Use project placeholders only where real media is unavailable.
- Process uses a living calibration/light rail rather than five boxes.
- Reuse light/focus/refraction grammar so sections feel like one optical system.
- Do not use full-screen empty spacer sections.

Measure full-page rhythm with screenshots.
If any viewport becomes mostly empty black with no visual purpose, tighten it.

Test desktop and mobile and stop after completing Phase 03.
```

---

# 73. Fourth Codex prompt — Experimental Lab

```text
Proceed with Phase 04 from FINETUNE_MASTER_SPEC_CODEX.md.

Build the Experimental Lab as credible creative R&D.

Implement 2 or 3 small real-time experiments maximum.
Candidate ideas:
- Refractive Field,
- Generative Light,
- Noise Calibration,
- Particle Convergence.

Choose the experiments that best reinforce FineTune's four pillars.

Do not present the section as a hacker terminal.
Do not create fake code solely for decoration.
Use code snippets only when they communicate an actual workflow or visual-system idea.

Include the narrow R&D / SYSTEMS / PROTOTYPES / CREATIVE CODE side rail from the visual direction.

Pause expensive experiments while offscreen and degrade complexity on mobile.

Profile performance after implementation.
```

---

# 74. Final Codex prompt — quality pass

```text
Perform a final FineTune quality pass.

Re-read FINETUNE_MASTER_SPEC_CODEX.md from top to bottom.

Audit the entire site for:
- visual drift,
- excessive empty space,
- typography inconsistency,
- generic components,
- excessive glow,
- fake technological decoration,
- weak project visibility,
- WebGL performance,
- mobile framing,
- keyboard accessibility,
- reduced motion,
- animation timing,
- fallback behavior,
- resource leaks,
- unnecessary dependencies.

The site should feel like one continuous optical instrument, not separate sections with effects.

Remove any effect or component that does not clearly support:
Observation,
Refinement,
Emergence,
or Intelligent Creation.

Run production build and eliminate errors/warnings that affect quality.
Run Lighthouse and profile WebGL.
Test latest Chrome/Edge and one Firefox/Safari-compatible path where possible.

Then report:
1. final architecture,
2. dependency list with reason for each,
3. WebGL/shader architecture,
4. adaptive-quality strategy,
5. accessibility/reduced-motion strategy,
6. performance findings,
7. remaining placeholders,
8. next recommended refinements.
```

---

# 75. Final creative tests

Before calling the portfolio finished, answer these questions honestly:

### If the word FineTune disappeared, would the visual behavior still communicate calibration, emergence and refinement?
If no, the identity is still too dependent on copy.

### Could this design belong unchanged to a generic AI startup?
If yes, remove generic technological conventions.

### Does the visitor encounter excellent work quickly?
If no, reduce spectacle and expose projects sooner.

### Does technology feel integrated into the creative practice?
If no, strengthen Process and Lab rather than adding more technology badges.

### Is the site memorable after closing the browser?
That is the final target.

---

# FINAL DIRECTIVE

Do not aim for the most complicated website.

Aim for the most **intentional** website.

Use advanced WebGL, shaders, motion libraries and creative code aggressively **only when they improve the FineTune concept**.

The final portfolio should feel as though an optical system was designed specifically to observe creative ideas becoming real.

> **Where ideas take form.**

> **Observe. Create. Refine.**
