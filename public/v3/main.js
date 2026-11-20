// FineTune v3 — Observatory prototype: focus-ring gate + 3D glass gallery.
// Raw WebGL2, no dependencies. Scroll drives a camera through a galaxy
// corridor; each category is a glass pane that docks in front of the lens, and opens into a
// lateral carousel of its works.
import { createLineWaves } from "./lines.js";
import { createKnob } from "./knob.js";

const PROJECTS = [
  { slug: "hbo-bff", title: "HBO Max — BFF Nossa Voz", disc: "VFX · 3D · Compositing", ctx: "VFX, 3D and compositing for an HBO Max campaign piece.", pt: "VFX, 3D e composição para uma peça de campanha da HBO Max.", tint: [0.62, 0.48, 1.0] },
  { slug: "bravecto", title: "Bravecto Experience", disc: "Art Direction · 3D · Immersive", ctx: "Art direction and 3D for an immersive brand experience.", pt: "Direção de arte e 3D para uma experiência de marca imersiva.", tint: [1.0, 0.70, 0.36] },
  { slug: "yes", title: "YES! — Diga Sim ao Mundo", disc: "Motion Design · VFX · Storytelling", ctx: "Motion design and VFX carrying a language-school campaign.", pt: "Motion design e VFX construindo a história de uma campanha.", tint: [0.42, 0.84, 1.0] },
  { slug: "hbo-use-sua-voz", title: "HBO — Use Sua Voz", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [1.0, 0.45, 0.72] },
  { slug: "cleopatra", title: "Cleopatra", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [1.0, 0.82, 0.50] },
  { slug: "melhor-verao", title: "Melhor Verão", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.45, 0.95, 0.86] },
  { slug: "true-riches", title: "True Riches", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.56, 0.62, 1.0] },
  { slug: "conectivo", title: "Conectivo", disc: "Placeholder · disciplines", ctx: "Placeholder — one line of context for this case.", pt: "Placeholder — uma linha de contexto para este case.", tint: [0.86, 0.56, 1.0] },
];
const PRACTICES = [
  { t: "Art Direction & Design", tp: "Direção de Arte & Design", k: "Concept · Key visuals · Systems", kp: "Conceito · Key visuals · Sistemas",
    d: "Visual languages built around one clear idea — from the first frame and key visual to the system that keeps every piece coherent.",
    dp: "Linguagens visuais construídas em torno de uma ideia clara — do primeiro frame e do key visual ao sistema que mantém cada peça coerente.", rel: [1, 4], tint: [0.74, 0.62, 1.0] },
  { t: "Motion, 3D & VFX", tp: "Motion, 3D & VFX", k: "Animation · Lookdev · Compositing", kp: "Animação · Lookdev · Composição",
    d: "Animation, modeling, shading, lighting, rendering and compositing for campaigns, content and immersive experiences.",
    dp: "Animação, modelagem, shading, iluminação, render e composição para campanhas, conteúdo e experiências imersivas.", rel: [0, 2, 3], tint: [1.0, 0.74, 0.46] },
  { t: "AI-Assisted Creation", tp: "Criação Assistida por IA", k: "Previs · Generation · Iteration", kp: "Previs · Geração · Iteração",
    d: "Generative tools placed inside a directed pipeline — used to explore faster, while art direction decides what stays.",
    dp: "Ferramentas generativas dentro de um pipeline dirigido — para explorar mais rápido, enquanto a direção de arte decide o que fica.", rel: [], tint: [0.5, 0.88, 1.0] },
  { t: "Creative Technology", tp: "Tecnologia Criativa", k: "Automation · Tools · Web 3D", kp: "Automação · Ferramentas · Web 3D",
    d: "Scripts, Blender add-ons, automations and web prototypes that remove friction from production and open new visual possibilities.",
    dp: "Scripts, add-ons de Blender, automações e protótipos web que tiram o atrito da produção e abrem novas possibilidades visuais.", rel: [], tint: [0.62, 0.76, 1.0] },
];
// Each process stage is paired with a career era (era.y = null → year placeholder until Luiz confirms).
const PROCESS = [
  { era: { y: null, t: "Visual design foundations", tp: "Fundamentos de design visual", w: "Degree · Industrial Design / Visual Programming", wp: "Graduação · Desenho Industrial / Programação Visual" }, t: "Observe", tp: "Observar", k: "Brief · Audience · Intent", kp: "Briefing · Público · Intenção", order: 0.08, tint: [0.62, 0.72, 0.95],
    d: "Listen before designing: the brief, the audience and what the piece has to make people feel.",
    dp: "Escutar antes de desenhar: o briefing, o público e o que a peça precisa fazer sentir." },
  { era: { y: null, t: "Motion graphics", tp: "Motion graphics", w: "Where the practice started", wp: "Onde a prática começou" }, t: "Shape", tp: "Moldar", k: "Idea · References · System", kp: "Ideia · Referências · Sistema", order: 0.41, tint: [0.5, 0.86, 1.0],
    d: "Turn intent into one clear idea, a reference board and a visual system.",
    dp: "Transformar intenção em uma ideia clara, um painel de referências e um sistema visual." },
  { era: { y: null, t: "3D, VFX & compositing", tp: "3D, VFX & composição", w: "Campaigns · content", wp: "Campanhas · conteúdo" }, t: "Explore", tp: "Explorar", k: "Design · 3D · AI · Code", kp: "Design · 3D · IA · Código", order: 0.63, tint: [0.86, 0.56, 1.0],
    d: "Push the idea through design, 3D, AI and code until the unexpected shows up.",
    dp: "Levar a ideia por design, 3D, IA e código até o inesperado aparecer." },
  { era: { y: null, t: "Art & creative direction", tp: "Direção de arte & criativa", w: "Brand & immersive experiences", wp: "Experiências de marca e imersivas" }, t: "Refine", tp: "Refinar", k: "Light · Motion · Timing", kp: "Luz · Movimento · Timing", order: 0.98, tint: [0.9, 0.95, 1.0],
    d: "Calibrate light, motion and timing until every frame holds.",
    dp: "Calibrar luz, movimento e timing até cada frame se sustentar." },
  { era: { y: "now", t: "AI workflows, code & automation", tp: "Workflows com IA, código & automação", w: "FineTune · postgraduate in 3D Technologies (in progress)", wp: "FineTune · pós em Tecnologias 3D (em andamento)" }, t: "Evolve", tp: "Evoluir", k: "Tools · Workflows · Next idea", kp: "Ferramentas · Workflows · Próxima ideia", order: 0.86, tint: [1.0, 0.76, 0.48],
    d: "Keep what worked as a tool or a workflow, so the next idea starts further ahead.",
    dp: "Guardar o que funcionou como ferramenta ou workflow, para a próxima ideia começar mais à frente." },
];
/* ───────────── content: content.json (written by Portfolio Update) ───────────── */
// The arrays above are the fallback when content.json is missing. `?draft` (the editor's live
// preview) reads the unsaved draft from localStorage instead of the file.
const QS = new URLSearchParams(location.search);
const tx = (v, lang) => (v == null ? "" : typeof v === "string" ? v : v[lang] || v.en || "");
const hex3 = (h, d) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255) : d; };
let CONTENT = null;
if (QS.has("draft")) { try { CONTENT = JSON.parse(localStorage.getItem("portfolio-update:draft")); } catch { CONTENT = null; } }
if (!CONTENT) { try { const r = await fetch("./content.json", { cache: "no-cache" }); if (r.ok) CONTENT = await r.json(); } catch { CONTENT = null; } }
const C = CONTENT || {};
const TINTS = PROJECTS.map((p) => p.tint);
if (Array.isArray(C.jobs) && C.jobs.length) {
  PROJECTS.length = 0;
  C.jobs.filter((j) => !j.hidden || (QS.has("draft") && QS.get("case") === j.id)).forEach((j, i) => PROJECTS.push({ slug: j.id, title: j.title || "Untitled", disc: j.disciplines || "", ctx: tx(j.context, "en"), pt: tx(j.context, "pt"),
    tint: hex3(j.tint, TINTS[i % TINTS.length]), cover: j.cover || "", job: j }));
}
PROJECTS.forEach((p) => { if (p.cover === undefined) p.cover = `covers/${p.slug}.webp`; if (!p.job) p.job = {}; });
// tool registry (icons in ./tools/; tools without an icon show their monogram, as in v2)
const TOOLS = new Map((Array.isArray(C.tools) ? C.tools : []).map((t) => [t.id, t]));
PROJECTS.forEach((p) => { p.tools = (Array.isArray(p.job.tools) ? p.job.tools : []).filter((id) => TOOLS.has(id)); });
// categories: the corridor shows categories; each one opens into a lateral carousel of its jobs.
// Empty categories are hidden; jobs without a category land in "Selected work".
const CATS = [];
(Array.isArray(C.categories) ? C.categories : []).forEach((c) => {
  const jobs = PROJECTS.map((p, k) => ((p.job.categories || []).includes(c.id) ? k : -1)).filter((k) => k >= 0);
  if (!jobs.length) return;
  CATS.push({ id: c.id, name: tx(c.name, "en"), nameP: tx(c.name, "pt"), text: tx(c.text, "en"), textP: tx(c.text, "pt"),
    cover: c.cover || PROJECTS[jobs[0]].cover, tint: hex3(c.tint, PROJECTS[jobs[0]].tint), jobs });
});
const ORPHANS = PROJECTS.map((_, k) => k).filter((k) => !CATS.some((c) => c.jobs.includes(k)));
if (ORPHANS.length) CATS.push({ id: "selected-work", name: "Selected work", nameP: "Trabalhos selecionados", text: "", textP: "", cover: PROJECTS[ORPHANS[0]].cover, tint: PROJECTS[ORPHANS[0]].tint, jobs: ORPHANS });
function toolChips(ids, labels) {
  const frag = document.createDocumentFragment();
  ids.forEach((id) => {
    const t = TOOLS.get(id); if (!t) return;
    const el = document.createElement("span"), ic = document.createElement("span");
    el.className = "tool" + (labels ? " tool--l" : ""); el.title = t.label; ic.className = "tool__ic";
    if (t.icon) { ic.style.setProperty("--icon", `url("./${t.icon}")`); el.classList.add("has-icon"); } else ic.textContent = t.mono || t.label.slice(0, 2);
    el.append(ic);
    if (labels) { const l = document.createElement("span"); l.className = "tool__l"; l.textContent = t.label; el.append(l); } else el.setAttribute("aria-label", t.label);
    frag.append(el);
  });
  return frag;
}
PRACTICES.forEach((p, i) => { p.img = `practice/practice-0${i + 1}.webp`; });
(C.practices || []).slice(0, PRACTICES.length).forEach((c, i) => {
  const p = PRACTICES[i];
  Object.assign(p, { t: tx(c.title, "en") || p.t, tp: tx(c.title, "pt") || p.tp, k: tx(c.keys, "en"), kp: tx(c.keys, "pt"), d: tx(c.text, "en"), dp: tx(c.text, "pt"),
    img: c.image || "", tint: hex3(c.tint, p.tint), rel: (c.jobs || []).map((id) => PROJECTS.findIndex((x) => x.slug === id)).filter((k) => k >= 0) });
});
(C.process || []).slice(0, PROCESS.length).forEach((c, i) => {
  const p = PROCESS[i], e = c.era || {};
  Object.assign(p, { t: tx(c.name, "en") || p.t, tp: tx(c.name, "pt") || p.tp, k: tx(c.keys, "en"), kp: tx(c.keys, "pt"), d: tx(c.text, "en"), dp: tx(c.text, "pt"),
    era: { y: (e.year || "").trim() || null, t: tx(e.title, "en"), tp: tx(e.title, "pt"), w: tx(e.where, "en"), wp: tx(e.where, "pt") } });
});
// The dial's stations are the portfolio categories, clockwise from 12 o'clock: each one has a
// low-opacity preview (its cover), an LED colour (its tint) and opens its lateral carousel.
const hexOf = (t) => "#" + t.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
const GATE = CATS.map((c) => ({ n: c.name, nP: c.nameP, src: c.cover ? "./" + c.cover : "", led: hexOf(c.tint), count: c.jobs.length }));
const SEC = 360 / GATE.length;                      // degrees per station
const rgb01 = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
// hero + about copy (applied to the DOM just before the EN strings are captured)
function applyContent() {
  const setI = (key, v) => { if (v == null) return; document.querySelectorAll(`[data-i18n="${key}"]`).forEach((el) => (el.textContent = tx(v, "en"))); I18N.pt[key] = tx(v, "pt"); };
  if (C.hero) { setI("eyebrow", C.hero.eyebrow); setI("lead", C.hero.lead); }
  const a = C.about; if (!a) return;
  setI("idRole", a.role); setI("idBio", a.bio); setI("idAvail", a.availability);
  (a.facts || []).slice(0, 3).forEach((f, i) => { setI("idF" + (i + 1), f.label); setI("idF" + (i + 1) + "v", f.value); });
  if (a.name) { const parts = a.name.trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : "", h3 = $(".idcard__body h3"); h3.replaceChildren(parts.join(" ")); if (last) h3.append(document.createElement("br"), last); }
  if (a.portrait) { const img = $(".idcard__photo img"); img.src = "./" + a.portrait; img.alt = "Portrait of " + (a.name || ""); }
  const li = document.querySelectorAll(".idcard__links li"), show = (k, href, text) => { li[k].hidden = !href; const l = li[k].firstElementChild; if (href) { l.href = href; l.textContent = text; } };
  if (a.email) $("#talkBtn").href = "mailto:" + a.email;
  show(0, a.email && "mailto:" + a.email, a.email);
  show(1, a.linkedin, (a.linkedin || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") + " ↗");
  show(2, a.behance, (a.behance || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") + " ↗");
}
const N = CATS.length;
const PLATE_TINT = [0.60, 0.80, 1.0];
const D = 11;                       // world spacing between panes
const PW = 2.72, PH = 2.13;         // pane size (cover aspect 404:316)
const FOV = (38 * Math.PI) / 180;

const I18N = {
  pt: { tagline: "Motion Design & Tecnologia Criativa", navWork: "Trabalhos", navPractice: "Prática", navAbout: "Sobre", navContact: "Contato",
    pracEyebrow: "Áreas de atuação", pracT1: "Quatro disciplinas.", pracT2: "Um sistema.", lensPh: "Placeholder — trecho de reel por disciplina",
    navProcess: "Processo", navAbout: "Sobre", procEyebrow: "Processo · Trajetória", procT1: "Da possibilidade", procT2: "à precisão.",
    rdOrder: "Ordem", rdParts: "Partículas", tlEyebrow: "Trajetória", tlT1: "12+ anos.", tlT2: "Uma linha contínua.", tlYears: "anos de prática",
    nextEyebrow: "Próxima etapa, aguardando aprovação",
    hLead: "Onde ideias ganham",
    abEyebrow: "Sobre · Contato", abT1: "Vamos dar à sua próxima ideia", abT2: "uma", idAvail: "Disponível · Remoto",
    idRole: "Senior Motion Designer · Diretor de Arte · Creative Technologist",
    idBio: "12+ anos em animação, 3D, VFX e experiências imersivas — hoje combinados com workflows assistidos por IA, código e automação.",
    idF1: "Experiência", idF1v: "12+ anos", idF2: "Base", idF2v: "Curitiba, Brasil", idF3: "Atuação", idF3v: "Remoto · Internacional", idCta: "Entrar em contato",
    featured: "Observado", gateRole: "Luiz Gustavo Czaika", gateCta: "Pressione para entrar", gateArc: "Portfólio · Seleção de trabalhos",
    eyebrow: "Senior Motion Designer · Diretor de Arte · Creative Technologist",
    lead: "Sistemas visuais onde motion, 3D, VFX, IA e tecnologia criativa convergem.", hint: "Role para observar", open: "Abrir case",
    nextTitle: "O caminho de luz continua.",
    n1: "Campos de prática", n1d: "Lista fixa + preview vivo, imagem resolvendo do desfoque ao foco",
    n2: "Processo & linha do tempo", n2d: "Uma única trilha de luz atravessando 12 anos de trabalho",
    n3: "Sobre & contato", n3d: "Retrato, assinatura em escala gigante, “Observe. Create. Refine.”",
    talk: "Vamos conversar", phMedia: "Placeholder — vídeo / breakdown entra aqui",
    cChallenge: "Desafio", cIdea: "Ideia", cExec: "Execução", cOutcome: "Resultado", cRole: "Função", cTools: "Ferramentas", cMore: "Ver projeto",
    catBack: "Voltar ao dial", gateHint: "Gire para sintonizar · pressione para entrar", gateMore: "Role ↓ Práticas · Processo · Sobre", catHint: "Role ou arraste para explorar", catWord: "Categoria", works: "trabalhos", work: "trabalho", explore: "Explorar", openCase: "Abrir case" },
};
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/* ───────────── state ───────────── */
const S = {
  entered: false, focus: 0, focusT: 0, gateNear: 0,
  p: 0, pT: 0, time: 0, motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
  hole: null, abV: 0, psIdx: -1, psV: 0, stF: 0, stS: 0, post: 0, tlV: 0, tlP: 0,
  prIdx: -1, prFrom: 0, prTo: 0, prT: 1, prQ: 0, prV: 0, prIn: 0,
  cat: -1, catShown: -1, catT: 0, slide: 0, slideT: 0, capKey: "",
  mx: 0, my: 0, mxT: 0, myT: 0, hover: 0, hoverT: 0, lang: "en", active: -2, past: false, caseOpen: false,
};

/* ───────────── gate ring (SVG) ───────────── */
function buildRing() {
  const ring = $("#ring"), NS = "http://www.w3.org/2000/svg";
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  let ticks = "";
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, maj = i % 15 === 0, r0 = maj ? 196 : 203, r1 = 210;
    ticks += `<line class="tick${maj ? " maj" : ""}" x1="${Math.cos(a) * r0}" y1="${Math.sin(a) * r0}" x2="${Math.cos(a) * r1}" y2="${Math.sin(a) * r1}"/>`;
  }
  const labels = GATE.map((g) => (S.lang === "pt" ? g.nP : g.n).toUpperCase());
  let txt = `<defs><path id="lp" d="M0,-228 A228,228 0 1,1 -0.01,-228"/></defs>`;
  labels.forEach((l, i) => { txt += `<text text-anchor="middle" data-g="${i}"><textPath href="#lp" startOffset="${((i + 0.5) / labels.length) * 100}%">${l}</textPath></text>`; });
  // aperture blades: thin arcs that close toward the centre when the pointer approaches
  let ap = "";
  for (let i = 0; i < 6; i++) ap += `<circle class="ap" r="${146 + i * 6}" stroke-dasharray="${40 + i * 22} ${90 + i * 30}" transform="rotate(${i * 47})"/>`;
  ring.innerHTML = `<circle class="orbit" r="210"/><circle class="orbit" r="176"/>${ap}${ticks}${txt}
    <g class="needle" id="needle"><line x1="0" y1="-176" x2="0" y2="-214" stroke="#78D98A" stroke-width="1"/><circle class="dot" cy="-190" r="3.4"/></g>`;
}
buildRing();
const gatePrev = $("#gatePrev"); let gateIdx = -1, gateAng = 0, gateIdle = 0, gateAuto = 0;
// the knob in the centre of the gate (knob.js): turns to the discipline under the cursor,
// tilts toward the pointer, lights up on hover and presses in on click
let knob = null, knobT = 0;
try { knob = createKnob($("#knob"), { motion: S.motion, label: "Press to enter" }); } catch (err) { console.warn("[FineTune] knob:", err); }
if (!knob) document.documentElement.classList.add("no-knob");
GATE.forEach((g) => {
  const vid = /\.(webm|mp4|mov)$/i.test(g.src), el = document.createElement(vid ? "video" : "img");
  if (vid) { el.muted = true; el.loop = true; el.playsInline = true; el.preload = "none"; el.dataset.src = g.src; } else { el.loading = "lazy"; el.alt = ""; if (g.src) el.src = g.src; }
  gatePrev.appendChild(el); g.el = el;
});
let tuneT = 0, quietTune = false;
/* ── tuning notes: one short tone per station on the Egyptian pentatonic scale: a filtered square wave with a hard attack and a long synthetic reverb ──
   Browsers only allow sound after a first click / tap / key press, so the dial is silent until
   then. Sound follows the Motion toggle (Motion off = silent). */
const SCALE = [0, 2, 5, 7, 10, 12, 14, 17, 19, 22];      // Egyptian (suspended) pentatonic: 1 2 4 5 b7
let AC = null, verb = null;
function audio() {
  if (AC) return AC;
  const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return null;
  AC = new Ctor();
  const len = Math.floor(AC.sampleRate * 3.2), buf = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  verb = AC.createConvolver(); verb.buffer = buf;
  const wet = AC.createGain(); wet.gain.value = 0.85; verb.connect(wet).connect(AC.destination);
  return AC;
}
["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, () => { const a = audio(); if (a && a.state === "suspended") a.resume(); }, { passive: true }));
function note(semi, { gain = 0.075, dur = 0.34, when = 0 } = {}) {
  if (!when) pulseGem();                                // the flash happens even while sound is still locked
  if (!AC || AC.state !== "running" || !S.motion) return;
  const t = AC.currentTime + when, f = 392 * Math.pow(2, semi / 12), g = AC.createGain(), lp = AC.createBiquadFilter();
  // hard attack: a 2 ms rise to an accent 1.8× the body, then the decay
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * 1.8, t + 0.002); g.gain.exponentialRampToValueAtTime(gain, t + 0.035); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // the filter opens on the attack and closes with the note, so the square stays bright but not harsh
  lp.type = "lowpass"; lp.Q.value = 2.5; lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(f * 2.2, t + dur);
  [["square", 1, 0.8], ["square", 2.003, 0.12]].forEach(([type, mul, lv]) => { const o = AC.createOscillator(), og = AC.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = lv; o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.05); });
  lp.connect(g); g.connect(AC.destination); g.connect(verb);
}
// the crystal of the mark flashes with every tone: on the knob and on the small marks in the page
let gemT = 0;
function pulseGem() {
  if (knob) { knob.snap({ gem: 1 }); knob.set({ gem: 0 }); }
  document.body.classList.remove("tone"); void document.body.offsetWidth; document.body.classList.add("tone"); clearTimeout(gemT); gemT = setTimeout(() => document.body.classList.remove("tone"), 700);
}
const stationNote = (i) => SCALE[i % SCALE.length];
function setGate(i, turn = gateIdle > 2) {
  if (i === gateIdx || i < 0) return; gateIdx = i;
  GATE.forEach((g, k) => { const on = k === i; g.el.classList.toggle("on", on);
    if (g.el.tagName === "VIDEO") { if (on) { if (!g.el.src) g.el.src = g.el.dataset.src; g.el.play().catch(() => {}); } else g.el.pause(); } });
  document.querySelectorAll("#ring text").forEach((t) => t.classList.toggle("on", +t.dataset.g === i));
  gatePrev.classList.add("on");
  const g = GATE[i], pt = S.lang === "pt", w = g.count === 1 ? (pt ? "trabalho" : "work") : (pt ? "trabalhos" : "works");
  $("#gateDisc").textContent = `CH ${String(i + 1).padStart(2, "0")} — ${pt ? g.nP : g.n} · ${g.count} ${w}`;
  // a moment of static while the dial settles on the new station
  if (!quietTune && !S.entered && gateIdle < 2.4) note(stationNote(i));
  if (knob && !quietTune) { knob.snap({ glow: 1, hover: 0.8 }); knob.set({ glow: 0, hover: 0 }); }     // the button blinks: "press me"
  const gt = $("#gate"); gt.classList.remove("blink"); void gt.offsetWidth; gt.classList.add("blink");
  gt.classList.add("tuning"); clearTimeout(tuneT); tuneT = setTimeout(() => gt.classList.remove("tuning"), 420);
  let target = (i + 0.5) * SEC; while (target - gateAng > 180) target -= 360; while (target - gateAng < -180) target += 360;   // shortest way round
  gateAng = target; gatePrev.style.setProperty("--ang", gateAng + "deg");
  if (knob) { const [lr, lg, lb] = rgb01(g.led); knob.set(turn ? { angle: -((i + 0.5) * SEC) * Math.PI / 180, lr, lg, lb } : { lr, lg, lb }); }
  gt.style.setProperty("--led", g.led);
}

/* ───────────── "form": the self-calibrating word (ported from v2 formType.ts) ───────────── */
const FORM_STATES = [
  { label: "Thin", w: 100, wd: 100, fill: 1, sw: 0 },
  { label: "Ultra Bold Stroke", w: 1000, wd: 112, fill: 0, sw: 0.018 },
  { label: "Regular Wide", w: 400, wd: 151, fill: 1, sw: 0 },
  { label: "Black Narrow", w: 860, wd: 45, fill: 1, sw: 0 },
];
const F = { STAGGER: 0.09, MORPH: 1.15, GLITCH: 0.26, HOLD: 1.5, WW: 170, WWD: 18, from: 3, to: 0, status: "calibrating", phase: 0, flex: false, seed: 77, still: false, acc: 1 };
const formWord = $("#formWord"), formLetters = [...formWord.querySelectorAll(".fl")];
const c01 = (v) => clamp(v, 0, 1), easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(function detectFlex(tries) {
  if (!document.fonts || tries <= 0) return;
  document.fonts.load('400 1em "FT Form"').then((f) => { F.flex = f.length > 0; formWord.classList.toggle("has-flex", F.flex); if (!F.flex) setTimeout(() => detectFlex(tries - 1), 700); }).catch(() => {});
})(4);
function setLetter(el, w, wd, fill, sw, tx = 0, sk = 0, clip = "") {
  let weight = w, sx = 1, mx = 0;
  if (!F.flex) { weight = 300 + c01((w - 100) / 900) * 400; sx = 0.55 + c01((wd - 25) / 126) * 0.75; mx = (sx - 1) * 0.2; }   // Space Grotesk emulation
  const xt = wd <= 100 ? 410 + ((wd - 25) / 75) * 58 : 468 + ((wd - 100) / 51) * 135;
  const st = el.style;
  st.setProperty("--w", weight.toFixed(1)); st.setProperty("--wd", wd.toFixed(1)); st.setProperty("--xt", xt.toFixed(0));
  st.setProperty("--sx", sx.toFixed(3)); st.setProperty("--mx", mx.toFixed(3) + "em"); st.setProperty("--fill", fill.toFixed(2));
  st.setProperty("--sw", sw.toFixed(4) + "em"); st.setProperty("--tx", tx.toFixed(3) + "em"); st.setProperty("--sk", sk.toFixed(2) + "deg"); st.clipPath = clip;
}
function formStatus(label, status) { $("#formState").textContent = label; $("#formStatus").textContent = S.lang === "pt" ? (status === "approved" ? "aprovado" : "calibrando") : status; }
function tickForm(dt) {
  if (!S.motion) { if (!F.still) { const s = FORM_STATES[2]; formLetters.forEach((el) => setLetter(el, s.w, s.wd, s.fill, s.sw)); formWord.classList.remove("is-glitch"); formStatus(s.label, "approved"); F.still = true; } return; }
  F.still = false;
  const n = formLetters.length, A = FORM_STATES[F.from], B = FORM_STATES[F.to], rnd = () => (F.seed = (F.seed * 16807) % 2147483647) / 2147483647;
  F.phase += dt;
  if (F.status === "calibrating") {
    const end = (n - 1) * F.STAGGER + F.MORPH;
    formLetters.forEach((el, i) => {
      const p = c01((F.phase - i * F.STAGGER) / F.MORPH), e = easeIO(c01(p / 0.62));
      const osc = Math.sin(p * Math.PI * 4.5) * Math.pow(1 - p, 1.6) * (p > 0 ? 1 : 0);   // damped wobble before it settles
      setLetter(el, clamp(mix(A.w, B.w, e) + osc * F.WW, 100, 1000), clamp(mix(A.wd, B.wd, e) - osc * F.WWD, 25, 151), mix(A.fill, B.fill, e), mix(A.sw, B.sw, e));
    });
    if (F.phase >= end) { F.status = "approved"; F.phase = 0; formWord.classList.add("is-glitch"); formStatus(B.label, "approved"); }
  } else {
    const glitching = F.phase < F.GLITCH;
    formLetters.forEach((el) => {
      if (glitching) { const y0 = Math.floor(rnd() * 70), y1 = Math.min(100, y0 + 14 + Math.floor(rnd() * 30));
        setLetter(el, B.w, B.wd, rnd() < 0.6 ? Math.max(B.fill, 0.25) : 0.25, B.sw || 0.01, (rnd() - 0.5) * 0.07, (rnd() - 0.5) * 10, rnd() < 0.5 ? `inset(${y0}% 0 ${100 - y1}% 0)` : "");
      } else setLetter(el, B.w, B.wd, B.fill, B.sw);
    });
    if (!glitching) formWord.classList.remove("is-glitch");
    if (F.phase >= F.GLITCH + F.HOLD) { F.from = F.to; F.to = (F.to + 1) % FORM_STATES.length; F.status = "calibrating"; F.phase = 0; formStatus(FORM_STATES[F.to].label, "calibrating"); }
  }
}
// spectral accent for the word (v2 spectrum.ts): cyan → violet → rose → amber, 24 s cycle, ~12 fps
const ACC = [[77, 214, 255], [77, 214, 255], [143, 107, 255], [255, 97, 194], [255, 154, 77]];
function tickAccent(dt) {
  F.acc += dt; if (F.acc < 1 / 12) return; F.acc = 0;
  const p = (((S.time / 24) % 1) + 1) % 1 * ACC.length, i = Math.floor(p), f = p - i, t = f * f * (3 - 2 * f), a = ACC[i], b = ACC[(i + 1) % ACC.length];
  const ch = (k) => Math.round(Math.pow(clamp(Math.pow(a[k] / 255, 2.2) + (Math.pow(b[k] / 255, 2.2) - Math.pow(a[k] / 255, 2.2)) * t, 0, 1), 1 / 2.2) * 255);
  document.documentElement.style.setProperty("--acc", `rgb(${ch(0)} ${ch(1)} ${ch(2)})`);
}

/* ───────────── WebGL ───────────── */
const canvas = $("#gl");
const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
if (!gl) document.documentElement.classList.add("no-gl");

const COMMON = `#version 300 es
precision highp float;
vec3 spectrum(float t){ return 0.5+0.5*cos(6.28318*(t+vec3(0.0,0.33,0.67))); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
`;
const BG_VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }`;
// Galaxy: spiral-warped nebula + amber core + anamorphic streak (hero-approved.png language).
const BG_FS = COMMON + `
uniform vec2 uRes,uMouse; uniform float uTime,uCamZ,uCore,uFocus,uShift,uLines; uniform vec3 uTint,uTint2; out vec4 o;
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv.x-=uShift; uv-=uMouse*vec2(.035,-.035);
  float r=length(uv), a=atan(uv.y,uv.x);
  float sw=a+1.5/(r+.38)+uTime*.012-uCamZ*.022;
  vec2 q=vec2(cos(sw),sin(sw))*r;
  float n=fbm(q*2.1+vec2(0.,uCamZ*.03)); float n2=fbm(q*4.4-vec2(uTime*.008,3.)+n*1.3);
  float arms=pow(.5+.5*sin(sw*2.+n*3.2+log(r+.05)*3.2),3.);
  float neb=smoothstep(.34,.98,n*.72+n2*.5)*(.22+.78*arms)*exp(-r*1.05);
  vec3 col=vec3(.018,.032,.052)+vec3(.0,.012,.03)*(1.-r);
  col+=neb*mix(uTint,uTint2,n2)*.62;
  // thin orbital filaments
  float fil=pow(.5+.5*sin(log(r+.02)*26.+sw*3.+n*6.),24.)*exp(-r*1.6)*smoothstep(.05,.25,r);
  col+=fil*mix(uTint,vec3(.9,.95,1.),.5)*.09*uLines;
  float core=exp(-r*5.2)*1.0+exp(-r*24.)*1.7;
  float streak=exp(-abs(uv.y)*52.)*exp(-abs(uv.x)*1.5)*.6;
  float rays=pow(noise(vec2(a*13.,uTime*.04+uCamZ*.02)),7.)*exp(-r*2.3);
  vec3 warm=vec3(1.,.78,.5);
  col+=(core*mix(warm,uTint,.28)+streak*mix(vec3(.8,.9,1.),uTint,.45)+rays*mix(warm,uTint2,.5))*uCore;
  vec2 sp=uv*74.+vec2(0.,uCamZ*.35); vec2 c=floor(sp); float h=hash(c);
  col+=step(.986,h)*smoothstep(.3,0.,length(fract(sp)-.5))*(.5+.5*sin(uTime*(1.+h*3.)+h*40.))*.8;
  col*=1.-.6*smoothstep(.35,1.25,r);
  col*=mix(.32,1.,uFocus);
  col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)*.012;
  o=vec4(col,1.);
}`;
const PANE_VS = `#version 300 es
in vec2 aPos; uniform mat4 uMVP; out vec2 vUv; void main(){ vUv=aPos+.5; gl_Position=uMVP*vec4(aPos,0.,1.); }`;
// Glass pane: rounded slab, beveled refractive edge with spectral dispersion, pearl rim, slow specular sweep.
const PANE_FS = COMMON + `
in vec2 vUv; uniform sampler2D uTex,uTex2; uniform vec2 uSize,uTexScale; uniform vec3 uTint; uniform float uMix,uResolve;
vec3 smp(sampler2D t,vec2 uv,vec2 n,float ca,float lod){ return vec3(textureLod(t,uv+n*ca,lod).r,textureLod(t,uv,lod).g,textureLod(t,uv-n*ca,lod).b); }
uniform float uTime,uAlpha,uDim,uBlur,uSeed,uGhost,uHover; out vec4 o;
void main(){
  vec2 p=(vUv-.5)*uSize; float rad=.09;
  vec2 b=abs(p)-uSize*.5+rad; float d=length(max(b,0.))+min(max(b.x,b.y),0.)-rad;
  float aa=fwidth(d)*1.2+uBlur*.012; float mask=smoothstep(aa,-aa,d);
  float e=-d; float rim=smoothstep(.022+uBlur*.02,0.,e); float bevel=smoothstep(.17,0.,e);
  vec2 nrm=normalize(p*vec2(1.,uSize.x/uSize.y)+1e-4);
  float ang=atan(p.y,p.x);
  vec3 iri=spectrum(ang/6.28318+e*2.4+uTime*.04+uSeed);
  vec3 col;
  if(uGhost>.5){
    col=uTint*.035+iri*bevel*.16+vec3(.92,.96,1.)*rim*.4;
    float al=mask*uAlpha;
    o=vec4(col*al, al*.09); return;
  }
  vec2 tuv=(vUv-nrm*bevel*.034-.5)*uTexScale+.5;
  float rr=length(vUv-.5)*1.5; float ca=.0004+rr*rr*.0016+bevel*.02+uHover*.0016*rr+uBlur*.003+uResolve*.016;
  float lod=uBlur+uResolve*3.6;
  // unresolved state: the image is split into refracted shards that drift back into register
  vec2 cell=floor(vUv*vec2(11.,7.)+noise(vUv*3.+uSeed)*1.5);
  vec2 dsp=((vec2(hash(cell),hash(cell+7.3))-.5)*.11+(vec2(noise(vUv*6.+uSeed*9.),noise(vUv*6.+31.))-.5)*.14)*uResolve;
  vec3 img=smp(uTex,tuv+dsp,nrm,ca,lod);
  if(uMix>0.001){ float m=smoothstep(0.,1.,uMix*1.5-.25+(hash(cell+3.1)-.5)*.5*uResolve); img=mix(img,smp(uTex2,tuv-dsp,nrm,ca,lod),m); }
  col=img*uDim;
  col=mix(col,col*.55+uTint*.12,bevel*.6);
  col+=iri*bevel*(.2+uHover*.14);
  col+=vec3(.92,.96,1.)*rim*.85;
  float sx=vUv.x+vUv.y*.35; float spos=fract(uTime*.05+uSeed)*3.4-1.2;
  col+=exp(-pow((sx-spos)*5.5,2.))*.06*uDim;
  col+=uTint*.05*(1.-uDim);
  float al=mask*uAlpha;
  o=vec4(col*al,al*mix(.97,.8,bevel));
}`;
// Light trails: screen-space ribbons along helical paths anchored in world space.
const TR_VS = COMMON + `
in vec2 aTS; in vec4 aSeed; uniform mat4 uVP; uniform float uCamZ,uTime,uAspect; uniform vec2 uRes;
out float vSide,vWz,vD; out vec4 vSeed;
vec3 curve(float wz){
  float ang=aSeed.x*6.28318+wz*(.016+aSeed.w*.026)+sin(wz*.09+aSeed.y*20.)*.4+uTime*.018;
  float r=mix(2.35,6.2,aSeed.z)+sin(wz*.17+aSeed.y*9.)*.45;
  return vec3(cos(ang)*r*1.6,sin(ang)*r,wz);
}
void main(){
  float d=.7+aTS.x*aTS.x*78.; float wz=uCamZ-d;
  vec4 p0=uVP*vec4(curve(wz),1.), p1=uVP*vec4(curve(wz-.35),1.);
  vec2 s0=p0.xy/p0.w, s1=p1.xy/p1.w;
  vec2 dir=normalize((s1-s0)*vec2(uAspect,1.)+1e-6); vec2 n=vec2(-dir.y,dir.x)/vec2(uAspect,1.);
  float wpx=mix(1.4,3.4,aSeed.y)*(7./(d+2.))+.7;
  gl_Position=vec4((s0+n*aTS.y*wpx/uRes.y*2.)*p0.w,p0.z,p0.w);
  vSide=aTS.y; vWz=wz; vD=d; vSeed=aSeed;
}`;
const TR_FS = COMMON + `
in float vSide,vWz,vD; in vec4 vSeed; uniform float uTime,uGain; uniform vec3 uTint; out vec4 o;
void main(){
  float prof=exp(-vSide*vSide*4.5);
  float pulse=pow(.5+.5*sin(vWz*.26+uTime*(.45+vSeed.w*.8)+vSeed.x*50.),9.);
  float fade=smoothstep(78.,26.,vD)*smoothstep(.7,3.2,vD);
  vec3 c=mix(spectrum(vSeed.x+vWz*.012),uTint,.5); c=mix(c,vec3(1.,.95,.88),pulse*.6);
  o=vec4(c*prof*(.07+pulse*.95)*fade*uGain,0.);
}`;
// Bokeh dust: world-anchored points whose size grows with distance from the focal plane.
const ST_VS = `#version 300 es
in vec4 aSeed; uniform mat4 uVP; uniform float uCamZ,uDefocus,uFocusD,uPx; out float vA; out float vK;
void main(){
  vec2 xy=aSeed.xy*vec2(15.,9.); float l=length(xy); if(l<1.7) xy*=1.7/max(l,.01);
  float d=mod(uCamZ+aSeed.z*90.,90.)+.4;
  gl_Position=uVP*vec4(xy,uCamZ-d,1.);
  float coc=abs(d-uFocusD)/d;
  float size=(1.6+aSeed.w*3.4+coc*(6.+uDefocus*46.))*uPx/max(d*.22,.35);
  gl_PointSize=clamp(size,1.,96.);
  vA=smoothstep(90.,50.,d)*smoothstep(.4,2.5,d)*(.35+aSeed.w*.65)/(1.+size*size*.012); vK=aSeed.w;
}`;
const ST_FS = `#version 300 es
precision highp float; in float vA; in float vK; uniform vec3 uTint; out vec4 o;
void main(){ float r=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.82,r)*(.55+.45*smoothstep(.4,.95,r));
  vec3 c=mix(vec3(.92,.96,1.),mix(vec3(1.,.8,.55),uTint,step(.5,vK)),.55*fract(vK*7.)); o=vec4(c*a*vA,0.); }`;

// Process instrument: one particle field that moves from noise (Observe) through lines (Shape),
// a spectral fan (Explore) and a single focused ring (Refine) to an outgoing spiral (Evolve).
// Positions are procedural per stage; each particle carries its own delay so transitions read as emergence.
const PS_VS = COMMON + `
in vec4 aSeed; uniform vec4 uRect; uniform float uAsp,uStage,uTime,uPx,uAlpha; uniform vec3 uTint; out vec3 vC; out float vA;
const float TAU=6.28318;
vec2 form(int k, vec4 s, float t){
  float a=uAsp;
  if(k==0){ vec2 p=(s.xy*2.-1.)*vec2(a*.92,.92); return p+vec2(sin(t*.31+s.z*40.),cos(t*.27+s.w*30.))*.045; }
  if(k==1){ float li=floor(s.z*7.); float x=(s.x*2.-1.)*a*.92; return vec2(x,(li-3.)*.24+sin(x*1.7+li*1.3+t*.35)*.07+(s.y-.5)*.01); }
  if(k==2){ float ray=floor(s.z*26.); float ang=(ray/25.-.5)*1.05+sin(t*.18+ray*1.7)*.02; float r=pow(s.x,.8)*a*1.84;
            return vec2(-a*.92,0.)+vec2(cos(ang),sin(ang)*.62)*r; }
  if(k==3){ float ang=s.x*TAU+t*.04; if(s.w<.12) return vec2(cos(ang),sin(ang))*.2; return vec2(cos(ang),sin(ang))*(.66+(s.y-.5)*.012); }
  if(s.w<.3){ float a2=s.y*TAU+t*.05; return vec2(cos(a2),sin(a2))*.66; }
  float u=s.x, ang=u*TAU*2.2+t*.12; return vec2(cos(ang)*mix(.66,a*.92,u),sin(ang)*mix(.66,.92,u));
}
vec3 col(int k, vec4 s){
  if(k==0) return vec3(.78,.84,.95)*.95;
  if(k==1) return mix(vec3(.85,.92,1.),uTint,.45)*.85;
  if(k==2) return spectrum(s.z*1.3+.1)*.9+.08;
  if(k==3) return vec3(.95,.98,1.)*1.2;
  return mix(vec3(1.,.78,.5),uTint,.3);
}
void main(){
  float st=clamp(uStage,0.,4.); int i=int(floor(st)); int j=min(4,i+1); float f=st-float(i);
  float ff=clamp((f-aSeed.w*.35)/.65,0.,1.); ff=ff*ff*(3.-2.*ff);
  float mid=sin(3.14159*ff);
  vec2 p=mix(form(i,aSeed,uTime),form(j,aSeed,uTime),ff);
  p+=(vec2(noise(aSeed.xy*9.+uTime*.2),noise(aSeed.zw*9.-uTime*.2))-.5)*.2*mid;
  gl_Position=vec4(uRect.xy+vec2(p.x/uAsp,p.y)*uRect.zw,0.,1.);
  gl_PointSize=(1.3+aSeed.w*1.8+mid*3.2+float(i==0&&j==1)*(1.-ff)*.8)*uPx;
  vC=mix(col(i,aSeed),col(j,aSeed),ff);
  vA=uAlpha*(.5+.5*aSeed.y)/(1.+mid*1.6);
}`;
const PS_FS = COMMON + `in vec3 vC; in float vA; out vec4 o;
void main(){ float r=length(gl_PointCoord-.5)*2.; o=vec4(vC*smoothstep(1.,.15,r)*vA,0.); }`;

// Contact exit: a luminous black hole (v2 blackhole.frag.glsl, re-timed to 1.2 s). Spectral accretion disc,
// photon ring, lensing glow; uDark closes the frame to black, uFlash is the final collapse.
const BH_FS = COMMON + `
uniform vec2 uRes,uCenter; uniform float uRadius,uTime,uIntensity,uFlash,uDark; uniform vec3 uTint; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 frag=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y); vec2 d=frag-uCenter; float r=max(uRadius,1.); float dist=length(d); float ang=atan(d.y,d.x);
  float tilt=-.21; vec2 q=vec2(d.x*cos(tilt)-d.y*sin(tilt),d.x*sin(tilt)+d.y*cos(tilt)); q.y*=3.4; float qd=length(q)/r; float qa=atan(q.y,q.x);
  float streaks=.55+.45*sin(qa*3.+log(max(qd,1e-3))*9.-uTime*9.);
  float band=smoothstep(1.25,1.7,qd)*(1.-smoothstep(2.4,5.2,qd)); float doppler=.55+.45*cos(qa+.6);
  vec3 disc=mix(mix(spectrum(qa/6.2831+qd*.12+uTime*.2),uTint,.35),vec3(1.,.95,.9),.35)*band*streaks*doppler*1.9;
  float ring=exp(-pow((dist/r-1.06)*18.,2.))*2.6; vec3 ringCol=mix(spectrum(ang/6.2831+uTime*.3),vec3(1.),.55)*ring;
  // thin light trails being pulled in — the site's line language
  float tr=pow(.5+.5*sin(ang*13.+log(max(dist/r,1e-3))*11.+uTime*12.+sin(ang*3.)*1.5),90.)*smoothstep(1.1,2.2,dist/r)*exp(-dist/(r*4.))*.9;
  vec3 glow=vec3(.55,.62,1.)*exp(-max(dist-r,0.)/(r*1.6))*.55;
  vec3 col=(disc+ringCol+glow+tr*mix(uTint,vec3(1.),.4))*uIntensity;
  float horizon=1.-smoothstep(r*.96,r,dist); col*=1.-horizon;
  col+=vec3(1.,.98,.95)*uFlash*exp(-max(dist-r,0.)/(r*.5+30.))*1.6*(1.-horizon);
  col=aces(col);
  float a=clamp(max(max(max(col.r,col.g),col.b)*1.2+horizon,uDark),0.,1.);
  o=vec4(col,a);
}`;

function program(vs, fs) {
  const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").slice(0, 6).join("\n")); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

/* mat4 (column-major) */
const M = {
  persp(f, a, n, fr) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, (2 * fr * n) / (n - fr), 0]; },
  mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
  trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  scale(x, y) { return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  xf(m, x, y) { const w = m[3] * x + m[7] * y + m[15]; return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]; },
};

// video covers: play while drawn, pause ~1 s after they leave the screen
const VIDS = []; let frameNo = 0;
function bindCover(t) {
  gl.bindTexture(gl.TEXTURE_2D, t);
  const v = t._vid; if (!v) return;
  t._seen = frameNo;
  if (v.paused && S.motion) v.play().catch(() => {});
  if (v.readyState >= 2 && v.currentTime !== t._f) { t._f = v.currentTime; gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); }
}
function idleVideos() { frameNo++; for (const t of VIDS) if (t._vid && !t._vid.paused && frameNo - (t._seen || 0) > 60) t._vid.pause(); }
let R = null; // GL resources
function initGL() {
  const bh = program(BG_VS, BH_FS), ps = program(PS_VS, PS_FS), bg = program(BG_VS, BG_FS), pane = program(PANE_VS, PANE_FS), tr = program(TR_VS, TR_FS), st = program(ST_VS, ST_FS);
  const vao = (prog, setup) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); setup(prog.p); gl.bindVertexArray(null); return v; };
  const buf = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; };
  const attr = (p, name, size, stride, off) => { const l = gl.getAttribLocation(p, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride, off); };

  const bgVao = vao(bg, (p) => { buf([-1, -1, 3, -1, -1, 3]); attr(p, "aPos", 2, 0, 0); });
  const paneVao = vao(pane, (p) => { buf([-.5, -.5, .5, -.5, -.5, .5, .5, .5]); attr(p, "aPos", 2, 0, 0); });

  const TRAILS = 44, SEG = 150, tv = [];
  let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < TRAILS; i++) { const s = [rand(), rand(), Math.pow(rand(), 1.4), rand()];
    for (let j = 0; j < SEG; j++) { const t = j / (SEG - 1); tv.push(t, -1, ...s, t, 1, ...s); } }
  const trVao = vao(tr, (p) => { buf(tv); attr(p, "aTS", 2, 24, 0); attr(p, "aSeed", 4, 24, 8); });

  const PARTS = 4200, pv = [];
  for (let i = 0; i < PARTS; i++) pv.push(rand(), rand(), rand(), rand());
  const psVao = vao(ps, (p) => { buf(pv); attr(p, "aSeed", 4, 0, 0); });
  const STARS = 1500, sv = [];
  for (let i = 0; i < STARS; i++) sv.push(rand() * 2 - 1, rand() * 2 - 1, rand(), rand());
  const stVao = vao(st, (p) => { buf(sv); attr(p, "aSeed", 4, 0, 0); });

  // ghost slabs lining the corridor (glass only, no image)
  const ghosts = [];
  for (let i = 0; i < 46; i++) { const side = i % 2 ? 1 : -1;
    ghosts.push({ z: -3 - i * 2.35 - rand() * 1.2, x: side * (4.6 + rand() * 3.4), y: (rand() - .5) * 5.2, ry: -side * (.75 + rand() * .5), rz: (rand() - .5) * .35, s: .55 + rand() * .9, seed: rand() }); }

  // cover textures: images, or muted looping videos (webm/mp4) whose frames are uploaded only
  // while their pane is drawn. t._a holds the source aspect so panes can cover-fit it.
  const loadTex = (src) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([14, 22, 34, 255]));
    if (!src) return t;
    const params = (mip) => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
    if (/\.(webm|mp4|mov)$/i.test(src)) {
      const v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
      v.addEventListener("loadeddata", () => { t._a = v.videoWidth / v.videoHeight; t._vid = v; t._f = -1; gl.bindTexture(gl.TEXTURE_2D, t); params(false); });
      v.src = src; VIDS.push(t); return t;
    }
    const img = new Image();
    img.onload = () => { t._a = img.naturalWidth / img.naturalHeight; gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); params(true); };
    img.src = src;
    return t;
  };
  const tex = PROJECTS.map((pr) => loadTex(pr.cover ? "./" + pr.cover : null));
  const ctex = CATS.map((c) => loadTex(c.cover ? "./" + c.cover : null));
  const ptex = PRACTICES.map((p) => loadTex(p.img ? "./" + p.img : null));
  R = { ctex, bh, ps, psVao, PARTS, bg, pane, tr, st, bgVao, paneVao, trVao, stVao, TRAILS, SEG, STARS, ghosts, tex, ptex };
}

let W = 1, H = 1, DPR = 1, dockD = 4.4;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, innerWidth > 2200 ? 1 : 1.5);
  W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
  if (gl) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
  const aspect = innerWidth / innerHeight, th = Math.tan(FOV / 2);
  // dock distance: pane fills ~70% of height, or ~86% of width on narrow screens
  dockD = Math.max(PH / (2 * th * 0.7), PW / (2 * th * aspect * 0.86));
}

/* scroll → progress (in stops: 0 = title plate, 1..N = projects) */
const unit = () => innerHeight * 1.1;
const pracEl = $("#practice"), lens = $("#lens"), procEl = $("#process"), aboutEl = $("#about"), inst = $("#instrument");
function readScroll() {
  S.past = scrollY > innerHeight * 0.25;                 // left the dial: Practice is next
  const top = pracEl.offsetTop, span = pracEl.offsetHeight - innerHeight, ih = innerHeight;
  S.prQ = clamp((scrollY - top) / span, 0, 1);
  S.prIn = sstep(top - ih, top, scrollY);                                   // approach (camera leaves the corridor)
  S.prV = sstep(top - ih * 0.55, top - ih * 0.05, scrollY) * (1 - sstep(top + span, top + span + ih * 0.5, scrollY));
  const idx = S.prV > 0.02 ? Math.min(3, Math.floor(S.prQ * 3.999)) : -1;
  if (idx !== S.prIdx) setPractice(idx);
  if (idx >= 0) document.querySelectorAll(".row").forEach((r, k) => r.style.setProperty("--w", k === idx ? (S.prQ * 4 - idx).toFixed(3) : 0));
  S.post = Math.max(0, scrollY - (top - ih)) / ih;                         // screens travelled since leaving the gallery

  // process: each stage holds, then morphs into the next during the last 40% of its segment
  const pt = procEl.offsetTop, ps = procEl.offsetHeight - ih;
  const q = clamp((scrollY - pt) / ps, 0, 1), raw = q * 5, si = Math.min(4, Math.floor(raw));
  S.stF = si + (si < 4 ? sstep(0.6, 1, raw - si) : 0);
  S.psV = sstep(pt - ih * 0.6, pt - ih * 0.1, scrollY) * (1 - sstep(pt + ps + ih * 0.05, pt + ps + ih * 0.6, scrollY));
  const pidx = Math.min(4, Math.round(S.stF));
  if (pidx !== S.psIdx) setStage(pidx);

  const at = aboutEl.offsetTop;
  S.abV = sstep(at - ih * 0.7, at - ih * 0.1, scrollY); document.body.classList.toggle("in-about", S.abV > 0.5); S.tlV = S.abV * 0.6; S.tlP = 0.35;
  const navIdx = scrollY >= at - ih * 0.4 ? 3 : scrollY >= pt - ih * 0.3 ? 2 : scrollY >= top - ih * 0.3 ? 1 : 0;
  document.querySelectorAll(".nav a").forEach((a, k) => a.classList.toggle("on", S.entered && k === navIdx));
}
const easeStop = (p) => { const s = Math.floor(p), f = p - s; return s + mix(f, f * f * f * (f * (6 * f - 15) + 10), 0.8); };
function tintAt(pe) {
  const list = [PLATE_TINT, ...CATS.map((c) => c.tint)];
  const jt = S.catShown >= 0 ? PROJECTS[CATS[S.catShown].jobs[clamp(Math.round(S.slide), 0, CATS[S.catShown].jobs.length - 1)]].tint : PLATE_TINT;
  const i = clamp(Math.floor(pe), 0, N), j = Math.min(N, i + 1), f = sstep(0.15, 0.85, pe - i);
  const pt = PRACTICES[Math.max(0, S.prIdx)].tint;
  const a = Math.floor(S.stS), b = Math.min(4, a + 1), g = S.stS - a;
  const proc = [0, 1, 2].map((k) => mix(PROCESS[a].tint[k], PROCESS[b].tint[k], g));
  const warm = [1.0, 0.78, 0.52], cool = [0.6, 0.8, 1.0], tl = [0, 1, 2].map((k) => mix(cool[k], warm[k], S.tlP));
  return [0, 1, 2].map((k) => mix(mix(mix(mix(mix(list[i][k], list[j][k], f), jt[k], S.catT), pt[k], S.prV), proc[k], S.psV), tl[k], S.tlV));
}

/* per-frame pane pose */
function panePose(i, camZ) {
  const z = -(i + 1) * D, d = camZ - z, side = i % 2 ? -1 : 1;
  if (d < 0.25) return null;
  let x = 0, y = 0.1, ry = 0, alpha = 1, dim = 1, blur = 0, sc = 1;
  if (d >= dockD) {                       // approaching: slides in from the corridor wall
    const u = (d - dockD) / D, e = sstep(0, 1, Math.min(u, 1));
    x = side * (3.5 * e + Math.max(0, u - 1) * 0.9); y = 0.1 + side * 0.35 * e - Math.max(0, u - 1) * 0.25;
    ry = -side * 0.95 * e; dim = mix(1, 0.34, e); blur = Math.min(u, 2.5) * 2.1;
    alpha = sstep(4.2, 2.6, u);
  } else {                                // passing through the glass
    const v = (dockD - d) / (dockD - 0.25);
    alpha = 1 - sstep(0.12, 0.8, v); sc = 1 + v * 0.22; blur = v * 3; x = -side * v * 0.5;
  }
  return { z, d, x, y, ry, alpha, dim, blur, sc };
}

// a job inside an open category: a lateral row of glass panes at the docked plane, the
// current one centred; neighbours recede, turn and blur (they fly out of the category pane)
function jobPose(k, cz) {
  const e = sstep(0, 1, S.catT), dd = k - S.slide, ad = Math.abs(dd), SP = PW * 1.14;
  return { x: dd * SP * mix(0.2, 1, e) + Math.sign(dd) * Math.max(0, ad - 1) * 0.25, y: 0.1, z: cz - (1 - e) * 2.4 - Math.min(ad, 2.5) * 0.85,
    ry: -clamp(dd, -1.4, 1.4) * 0.42, sc: mix(0.72, 1, e) * (1 - Math.min(ad, 1) * 0.1), alpha: e * sstep(3.2, 1.7, ad),
    dim: mix(1, 0.4, Math.min(ad, 1)), blur: Math.min(ad, 2.2) * 1.5 + (1 - e) * 2.2 };
}
function rectOf(VP, pose) {
  const Mm = M.mul(VP, M.mul(M.trans(pose.x, pose.y, pose.z), M.mul(M.rotY(pose.ry), M.scale(PW * pose.sc, PH * pose.sc))));
  const a = M.xf(Mm, -.5, .5), b = M.xf(Mm, .5, -.5);
  return { l: (a[0] * .5 + .5) * innerWidth, t: (1 - (a[1] * .5 + .5)) * innerHeight, r: (b[0] * .5 + .5) * innerWidth, b: (1 - (b[1] * .5 + .5)) * innerHeight };
}
const hit = $("#hit"), cap = $("#cap"), plate = $("#plate"), flankL = $("#flankL"), flankR = $("#flankR");
const waves = createLineWaves({ live: () => S.entered && S.motion && !S.hole });
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, (now - (frame.t || now)) / 1000); frame.t = now;
  // "entered" = tuned in: a category is open (or closing), a case is open, or the page has scrolled past the dial
  const tuned = S.cat >= 0 || S.catT > 0.35 || S.caseOpen || S.past;
  if (tuned !== S.entered) { S.entered = tuned; document.body.classList.toggle("is-gate", !tuned); if (!tuned && knob) knob.set({ press: 0, hover: 0, glow: 0 }); }
  S.pT = (S.cat >= 0 ? S.cat : Math.max(0, gateIdx)) + 1;   // the camera waits at the tuned station
  if (knob) { knobT = S.entered ? knobT + dt : 0; if (knobT < 1.4) knob.frame(dt); }
  const k = 1 - Math.pow(0.001, dt);           // framerate-independent smoothing
  if (S.motion && !S.caseOpen) S.time += dt;
  S.p = S.motion ? mix(S.p, S.pT, clamp(k * (S.entered ? 0.75 : 0.07), 0, 1)) : S.pT;
  S.focusT = S.entered ? 1 : S.gateNear * 0.28;
  S.focus = mix(S.focus, S.focusT, clamp(k * (S.entered ? 0.32 : 0.6), 0, 1));
  S.catT = S.motion ? mix(S.catT, S.cat >= 0 ? 1 : 0, clamp(k * 0.45, 0, 1)) : (S.cat >= 0 ? 1 : 0);
  if (S.cat < 0 && S.catT < 0.004) { S.catT = 0; S.catShown = -1; }
  S.slide = S.motion ? mix(S.slide, S.slideT, clamp(k * 0.6, 0, 1)) : S.slideT;
  S.mx = mix(S.mx, S.mxT, k * 0.5); S.my = mix(S.my, S.myT, k * 0.5); S.hover = mix(S.hover, S.hoverT, k);

  const pe = easeStop(S.p), fo = S.focus, enter = sstep(0, 1, fo), shard = S.entered ? sstep(0.3, 0.95, fo) : 0;
  S.stS = S.motion ? mix(S.stS, S.stF, clamp(k * 0.55, 0, 1)) : S.stF;
  const camZ = dockD - pe * D + (1 - enter) * 7.5 - sstep(0, 1, S.prIn) * 6.5 - S.post * 3.2;
  if (S.prT < 1) S.prT = Math.min(1, S.prT + (S.motion ? dt / 0.95 : 1));
  const tint = tintAt(pe);
  const aspect = W / H;
  const shift = 0;
  const P = M.persp(FOV, aspect, 0.1, 200); P[8] = -shift;
  const V = M.mul(M.mul(M.rotX(S.my * 0.022), M.rotY(-S.mx * 0.034)), M.trans(-S.mx * 0.28, S.my * 0.18, -camZ));
  const VP = M.mul(P, V);

  /* ── DOM sync ── */
  const active = S.entered && !S.past ? Math.round(S.p) - 1 : -2;       // -1 = title plate
  const settle = 1 - Math.min(1, Math.abs(S.p - Math.round(S.p)) * 2.6);  // 1 when resting on a stop
  if (active !== S.active) { S.active = active; onActive(active); }
  const inCat = S.cat >= 0, cur = inCat ? clamp(Math.round(S.slideT), 0, CATS[S.cat].jobs.length - 1) : -1;
  const key = `${active}|${S.cat}|${cur}|${S.lang}`; if (key !== S.capKey) { S.capKey = key; renderCap(active, cur); }
  const slideSettle = inCat ? 1 - Math.min(1, Math.abs(S.slide - S.slideT) * 3) : 0;
  const showCap = inCat ? S.catT > 0.6 && slideSettle > 0.5 : active >= 0 && settle > 0.45 && S.catT < 0.2;
  cap.classList.toggle("on", showCap); hit.classList.toggle("on", inCat ? S.catT > 0.7 && slideSettle > 0.6 : active >= 0 && settle > 0.7 && S.catT < 0.2);
  $("#pager").style.opacity = S.past || S.catT > 0.1 ? 0 : "";
  let rc = null;
  if (inCat || S.catShown >= 0) { if (S.catShown >= 0) rc = rectOf(VP, jobPose(clamp(Math.round(S.slide), 0, CATS[S.catShown].jobs.length - 1), -(S.catShown + 1) * D)); }
  else if (active >= 0) { const pose = panePose(active, camZ); if (pose) rc = rectOf(VP, pose); }
  if (rc) {
    hit.style.transform = `translate(${rc.l}px,${rc.t}px)`; hit.style.width = rc.r - rc.l + "px"; hit.style.height = rc.b - rc.t + "px";
    cap.style.transform = `translate(${Math.max(16, rc.l)}px,${Math.min(innerHeight - 150, rc.b + 20)}px)`;
    // the signature lines frame whatever is docked in front of the lens
    const fh = rc.b - rc.t + 140, ft = rc.t - 70, gap = Math.max(18, (rc.r - rc.l) * 0.035);
    flankL.style.transform = `translate(${rc.l - gap}px,${ft}px)`; flankR.style.transform = `translate(${rc.r + gap}px,${ft}px)`; flankL.style.height = flankR.style.height = fh + "px";
  }
  const flankOn = rc && (inCat ? S.catT > 0.7 : settle > 0.75 && active >= 0) && !S.caseOpen;
  flankL.classList.toggle("on", !!flankOn); flankR.classList.toggle("on", !!flankOn);
  waves.tick(dt);
  updateRail();
  const plateOn = S.abV > 0.2;                            // the "form" word now lives in About
  if (plateOn && !S.caseOpen) { tickForm(dt); if (S.motion) tickAccent(dt); }
  if (!S.entered && S.motion) { gateIdle += dt; if (gateIdle > 2.4) { gateAuto += dt; if (gateAuto > 2.6 || gateIdx < 0) { gateAuto = 0; setGate((gateIdx + 1) % GATE.length, true); } } }
  if (!gl || !R) return;

  /* ── draw ── */
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  const t2 = [tint[2], tint[0] * .8 + .2, tint[1]];
  gl.useProgram(R.bg.p); gl.bindVertexArray(R.bgVao);
  gl.uniform1f(R.bg.u.uShift, shift * aspect * 0.5); gl.uniform1f(R.bg.u.uLines, 1 - S.abV); gl.uniform2f(R.bg.u.uRes, W, H); gl.uniform2f(R.bg.u.uMouse, S.mx, S.my); gl.uniform1f(R.bg.u.uTime, S.time); gl.uniform1f(R.bg.u.uCamZ, camZ);
  gl.uniform1f(R.bg.u.uCore, mix(0.78, 0.55, sstep(0.3, 1, S.p)) * mix(0.5, 1, enter) * mix(1, 0.7, S.prV) * mix(1, 0.5, S.psV) * mix(1, 0.75, S.tlV)); gl.uniform1f(R.bg.u.uFocus, enter);
  gl.uniform3fv(R.bg.u.uTint, tint); gl.uniform3fv(R.bg.u.uTint2, t2);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(R.st.p); gl.bindVertexArray(R.stVao);
  gl.uniformMatrix4fv(R.st.u.uVP, false, VP); gl.uniform1f(R.st.u.uCamZ, camZ); gl.uniform1f(R.st.u.uDefocus, 1 - enter);
  gl.uniform1f(R.st.u.uFocusD, dockD); gl.uniform1f(R.st.u.uPx, H / 900 * clamp(1100 / innerHeight, 0.75, 1)); gl.uniform3fv(R.st.u.uTint, tint);
  gl.drawArrays(gl.POINTS, 0, R.STARS);

  gl.useProgram(R.tr.p); gl.bindVertexArray(R.trVao);
  gl.uniformMatrix4fv(R.tr.u.uVP, false, VP); gl.uniform1f(R.tr.u.uCamZ, camZ); gl.uniform1f(R.tr.u.uTime, S.time);
  gl.uniform1f(R.tr.u.uAspect, aspect); gl.uniform2f(R.tr.u.uRes, W, H); gl.uniform3fv(R.tr.u.uTint, tint);
  gl.uniform1f(R.tr.u.uGain, (1 - S.abV) * mix(.14, 1, enter) * (1 + S.hover * .25));
  for (let i = 0; i < R.TRAILS; i++) gl.drawArrays(gl.TRIANGLE_STRIP, i * R.SEG * 2, R.SEG * 2);
  // panes + ghosts, far → near
  const list = [];
  for (let i = 0; i < N; i++) { const p = panePose(i, camZ); if (p) p.alpha = 0; /* category panes are gone: the dial is the category navigation */ if (p && p.alpha > 0.01 && p.d < 60) list.push({ ...p, i, ghost: 0 }); }
  if (S.catShown >= 0 && S.catT > 0.01) {
    const cz = -(S.catShown + 1) * D;
    CATS[S.catShown].jobs.forEach((ji, kk) => { const p = jobPose(kk, cz); if (p.alpha > 0.01) list.push({ ...p, d: camZ - p.z, i: ji, kk, job: 1, ghost: 0 }); });
  }
  for (const g of R.ghosts) { const d = (((camZ - g.z) % 108) + 108) % 108; if (d > 0.6 && d < 46) list.push({ ...g, z: camZ - d, d, ghost: 1 }); }
  list.sort((a, b) => b.d - a.d);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  idleVideos();
  gl.useProgram(R.pane.p); gl.bindVertexArray(R.paneVao);
  gl.uniform1f(R.pane.u.uTime, S.time); gl.uniform3fv(R.pane.u.uTint, tint); gl.uniform1i(R.pane.u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
  const defocus = (1 - enter) * 4.2;
  gl.uniform1f(R.pane.u.uMix, 0); gl.uniform1f(R.pane.u.uResolve, 0); gl.uniform2f(R.pane.u.uTexScale, 1, 1); gl.uniform1i(R.pane.u.uTex2, 1);
  for (const o of list) {
    let m, w, h;
    if (o.ghost) {
      w = PW * o.s; h = PH * o.s * 1.25;
      m = M.mul(M.trans(o.x, o.y + Math.sin(S.time * .2 + o.seed * 30) * .12, o.z), M.mul(M.rotY(o.ry + Math.sin(S.time * .13 + o.seed * 9) * .06), M.mul(M.rotZ(o.rz), M.scale(w, h))));
      gl.uniform1f(R.pane.u.uGhost, 1); gl.uniform1f(R.pane.u.uAlpha, sstep(46, 30, o.d) * sstep(.6, 3.5, o.d) * shard * mix(1, .32, Math.max(S.psV, S.tlV)) * mix(1, .6, S.prV)); gl.uniform1f(R.pane.u.uBlur, Math.abs(o.d - dockD) * .12 + defocus);
      gl.uniform1f(R.pane.u.uHover, 0); gl.uniform1f(R.pane.u.uDim, 1); gl.uniform2f(R.pane.u.uTexScale, 1, 1);
    } else {
      w = PW * o.sc; h = PH * o.sc;
      const front = o.job ? o.kk === Math.round(S.slide) : o.i === active, isA = front ? S.hover : 0;
      m = M.mul(M.trans(o.x, o.y, o.z), M.mul(M.rotY(o.ry + (front ? S.mx * .05 : 0)), M.mul(M.rotX(front ? -S.my * .035 : 0), M.scale(w, h))));
      gl.uniform1f(R.pane.u.uGhost, 0); gl.uniform1f(R.pane.u.uAlpha, o.alpha); gl.uniform1f(R.pane.u.uBlur, o.blur + defocus);
      gl.uniform1f(R.pane.u.uDim, o.dim * mix(.5, 1, enter)); gl.uniform1f(R.pane.u.uHover, isA);
      const tx0 = o.job ? R.tex[o.i] : R.ctex[o.i], la = w / h, ta = tx0._a || la;
      bindCover(tx0); gl.uniform2f(R.pane.u.uTexScale, la > ta ? 1 : la / ta, la > ta ? ta / la : 1);   // cover-fit, never stretch
    }
    gl.uniform2f(R.pane.u.uSize, w, h); gl.uniform1f(R.pane.u.uSeed, o.ghost ? o.seed : o.i * .137 + (o.job ? .5 : 0));
    gl.uniformMatrix4fv(R.pane.u.uMVP, false, M.mul(VP, m));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // practice lens: a screen-aligned glass pane locked to the DOM rect, resolving between images
  if (S.prV > 0.01) {
    const r = lens.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const iw = innerWidth, ih = innerHeight, la = r.width / r.height, ta = 4 / 3, e = sstep(0, 1, S.prT);
      const m = M.mul(M.trans(((r.left + r.right) / iw) - 1, 1 - ((r.top + r.bottom) / ih), 0), M.scale((r.width / iw) * 2, (r.height / ih) * 2));
      gl.uniformMatrix4fv(R.pane.u.uMVP, false, m); gl.uniform2f(R.pane.u.uSize, la * 2.3, 2.3);
      gl.uniform2f(R.pane.u.uTexScale, la > ta ? 1 : la / ta, la > ta ? ta / la : 1);
      gl.uniform1f(R.pane.u.uGhost, 0); gl.uniform1f(R.pane.u.uAlpha, S.prV); gl.uniform1f(R.pane.u.uDim, 1); gl.uniform1f(R.pane.u.uHover, 0.4);
      gl.uniform1f(R.pane.u.uBlur, (1 - S.prV) * 3.5); gl.uniform1f(R.pane.u.uSeed, 0.31 + S.prTo * 0.17);
      gl.uniform1f(R.pane.u.uMix, e); gl.uniform1f(R.pane.u.uResolve, Math.min(1, Math.sin(Math.PI * S.prT) * 0.95 + (1 - S.prV) * 0.9));
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.ptex[S.prTo]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.ptex[S.prFrom]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  if (S.psV > 0.01) {
    const r = inst.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.height > 20) {
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(R.ps.p); gl.bindVertexArray(R.psVao);
      gl.uniform4f(R.ps.u.uRect, (r.left + r.right) / innerWidth - 1, 1 - (r.top + r.bottom) / innerHeight, r.width / innerWidth, r.height / innerHeight);
      gl.uniform1f(R.ps.u.uAsp, r.width / r.height); gl.uniform1f(R.ps.u.uStage, S.stS); gl.uniform1f(R.ps.u.uTime, S.time);
      gl.uniform1f(R.ps.u.uPx, DPR * clamp(innerHeight / 950, 1, 1.7)); gl.uniform1f(R.ps.u.uAlpha, S.psV); gl.uniform3fv(R.ps.u.uTint, tint);
      gl.drawArrays(gl.POINTS, 0, R.PARTS);
    }
  }
  if (S.hole) {
    const hb = S.hole, t = hb.fix ?? (now - hb.t0) / 1000, u = clamp(t / 1.2, 0, 1), diag = Math.hypot(W, H);
    const grow = sstep(0, 0.62, u), swallow = sstep(0.6, 0.98, u), back = sstep(1.2, 1.75, t);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(R.bh.p); gl.bindVertexArray(R.bgVao);
    gl.uniform2f(R.bh.u.uRes, W, H); gl.uniform2f(R.bh.u.uCenter, hb.x * DPR, hb.y * DPR);
    gl.uniform1f(R.bh.u.uRadius, (grow * Math.min(W, H) * 0.13 + swallow * swallow * diag) * (1 - back));
    gl.uniform1f(R.bh.u.uTime, t); gl.uniform1f(R.bh.u.uIntensity, sstep(0, 0.18, u) * (1 - back));
    gl.uniform1f(R.bh.u.uFlash, Math.exp(-Math.pow((u - 0.66) * 9, 2)) * 0.9); gl.uniform1f(R.bh.u.uDark, sstep(0.25, 0.9, u) * (1 - back));
    gl.uniform3fv(R.bh.u.uTint, tint);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.bindVertexArray(null);
}

/* ───────────── fields of practice ───────────── */
function buildRows() {
  const pt = S.lang === "pt", rows = $("#rows"); rows.innerHTML = "";
  PRACTICES.forEach((p, k) => {
    const li = document.createElement("li"); li.className = "row" + (k === S.prIdx ? " on" : "");
    li.innerHTML = `<button class="row__btn" type="button" aria-expanded="${k === S.prIdx}"><span class="row__i">0${k + 1}</span><span class="row__t">${pt ? p.tp : p.t}</span><span class="row__k">${pt ? p.kp : p.k}</span></button>
      <div class="row__panel"><div class="row__in"><p>${pt ? p.dp : p.d}</p><div class="chips"></div></div></div>`.replace(/&(?!amp;)/g, "&amp;");
    li.querySelector(".row__btn").onclick = () => { const span = pracEl.offsetHeight - innerHeight; scrollTo({ top: pracEl.offsetTop + ((k + 0.35) / 4) * span, behavior: S.motion ? "smooth" : "auto" }); };
    const chips = li.querySelector(".chips");
    (p.rel.length ? p.rel : [-1]).forEach((i) => { const b = document.createElement("button"); b.type = "button";
      if (i < 0) { b.textContent = pt ? "Case placeholder" : "Case placeholder"; b.disabled = true; b.style.opacity = ".5"; }
      else { b.textContent = PROJECTS[i].title.split(" — ").pop(); b.onclick = () => showJob(i); }
      chips.appendChild(b); });
    rows.appendChild(li);
  });
  setLensMeta();
}
function setLensMeta() { const i = Math.max(0, S.prIdx), p = PRACTICES[i];
  $("#lensIdx").textContent = `0${i + 1} / 04`; $("#lensFocus").textContent = S.lang === "pt" ? p.kp : p.k;
  lens.style.setProperty("--cover", p.img ? `url(./${p.img})` : "none"); }
function setPractice(idx) {
  const prev = S.prIdx; S.prIdx = idx;
  document.querySelectorAll(".row").forEach((r, k) => { r.classList.toggle("on", k === idx); r.querySelector(".row__btn").setAttribute("aria-expanded", k === idx); });
  if (idx < 0) return;
  if (prev < 0) { S.prFrom = S.prTo = idx; S.prT = 1; } else { S.prFrom = S.prTo; S.prTo = idx; S.prT = 0; }
  setLensMeta();
}

/* ───────────── process ───────────── */
const railNodes = $("#railNodes"), railBase = $("#railBase"), railLight = $("#railLight"), railHead = $("#railHead");
let railLen = 0, lastOrder = "", lastYr = "";
function buildProcess() {
  const pt = S.lang === "pt"; railNodes.innerHTML = "";
  PROCESS.forEach((p, k) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="node" type="button"><span class="node__dot"></span><span class="node__i">0${k + 1}</span><span class="node__t">${pt ? p.tp : p.t}</span><span class="node__k">${pt ? p.kp : p.k}</span></button>`;
    li.firstChild.onclick = () => { const span = procEl.offsetHeight - innerHeight; scrollTo({ top: procEl.offsetTop + ((k + 0.3) / 5) * span, behavior: S.motion ? "smooth" : "auto" }); };
    railNodes.appendChild(li);
  });
  $("#rdParts").textContent = R ? R.PARTS.toLocaleString("en") : "0";
  const i = Math.max(0, S.psIdx); S.psIdx = -1; setStage(i); layoutRail();
}
function setStage(i) {
  S.psIdx = i; const p = PROCESS[i], pt = S.lang === "pt";
  $("#procIdx").textContent = `0${i + 1} / 05`; $("#procName").textContent = pt ? p.tp : p.t; $("#procText").textContent = pt ? p.dp : p.d;
  const e = p.era; $("#eraYear").textContent = !e.y ? "20··" : /^(now|hoje|atual)$/i.test(e.y) ? (pt ? "Hoje" : "Now") : e.y; $("#eraPh").textContent = e.y ? "" : pt ? "ano · placeholder" : "year · placeholder";
  $("#eraTitle").textContent = pt ? e.tp : e.t; $("#eraWhere").textContent = pt ? e.wp : e.w;
  const now = document.querySelector(".process__now"); now.classList.remove("swap"); void now.offsetWidth; now.classList.add("swap");
}
function layoutRail() {
  const box = railNodes.getBoundingClientRect(); if (!box.width) return;
  const pts = [...railNodes.querySelectorAll(".node__dot")].map((d) => { const r = d.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], mx = (x0 + x1) / 2, w = (k % 2 ? -1 : 1) * 9;
    d += ` C${mx - (x1 - x0) * 0.2},${y0 + w} ${mx + (x1 - x0) * 0.2},${y1 + w} ${x1},${y1}`; }
  railBase.setAttribute("d", d); railLight.setAttribute("d", d); railLen = railBase.getTotalLength();
}
function updateRail() {
  const st = S.stS, prog = st / 4;
  railLight.style.strokeDashoffset = (1 - prog).toFixed(4);
  if (railLen) { const p = railBase.getPointAtLength(railLen * prog); railHead.setAttribute("cx", p.x); railHead.setAttribute("cy", p.y); }
  railNodes.querySelectorAll(".node").forEach((n, k) => { n.classList.toggle("on", k === S.psIdx); n.classList.toggle("past", k < st - 0.02 && k !== S.psIdx); });
  const a = Math.floor(st), b = Math.min(4, a + 1), o = mix(PROCESS[a].order, PROCESS[b].order, st - a).toFixed(2);
  if (o !== lastOrder) { $("#rdOrder").textContent = o; lastOrder = o; }
  const yr = st > 3.96 ? "12+" : String(Math.floor((st / 4) * 12.2)).padStart(2, "0"); if (yr !== lastYr) { $("#yrs").textContent = yr; lastYr = yr; }
}

/* ───────────── about: ID card + black hole exit ───────────── */
const idcard = $("#idcard"), talkBtn = $("#talkBtn"), mainEl = document.querySelector("main");
$("#idwrap").addEventListener("pointermove", (e) => {
  if (!S.motion || e.pointerType === "touch") return;
  const r = idcard.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  idcard.style.setProperty("--ry", ((x - 0.5) * 7).toFixed(2) + "deg"); idcard.style.setProperty("--rx", ((0.5 - y) * 5).toFixed(2) + "deg");
  idcard.style.setProperty("--px", (x * 100).toFixed(1) + "%"); idcard.style.setProperty("--py", (y * 100).toFixed(1) + "%");
});
$("#idwrap").addEventListener("pointerleave", () => { idcard.style.setProperty("--rx", "0deg"); idcard.style.setProperty("--ry", "0deg"); });
// "Get in touch": the page is pulled into a black hole for 1.2 s, then the link does its job (mailto) and the page returns.
talkBtn.addEventListener("click", (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
  if (S.hole) { ev.preventDefault(); return; }
  if (!S.motion || !gl || !R) return;                       // reduced motion / no WebGL: plain link
  ev.preventDefault();
  const r = talkBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, href = talkBtn.href;
  S.hole = { x, y, t0: performance.now() }; document.body.classList.add("is-hole");
  mainEl.style.transformOrigin = `${x}px ${scrollY + y}px`;
  const pull = mainEl.animate([{ transform: "none", filter: "blur(0px)", opacity: 1 }, { transform: "scale(.55) rotate(14deg)", filter: "blur(2px)", opacity: 0.9, offset: 0.45 },
    { transform: "scale(0) rotate(80deg)", filter: "blur(8px)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.5,0,.9,.4)", fill: "forwards" });
  setTimeout(() => { if (!window.__ftNoMail) location.href = href; }, 1200);
  setTimeout(() => { pull.cancel(); mainEl.style.transformOrigin = ""; mainEl.animate([{ opacity: 0, filter: "blur(14px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 600, easing: "ease-out" }); document.body.classList.remove("is-hole"); }, 1250);
  setTimeout(() => { S.hole = null; }, 1800);
});

/* ───────────── DOM behaviour ───────────── */
const pad = (n) => String(n).padStart(2, "0");
function onActive(i) {
  $("#count").textContent = pad(Math.max(0, i + 1));
  document.querySelectorAll("#pager li").forEach((li, k) => li.classList.toggle("on", k === i + 1));
}
const L = () => (S.lang === "pt" ? "pt" : "en"), i18 = (k, en) => (S.lang === "pt" ? I18N.pt[k] : en);
// caption under whatever is docked: a category (corridor) or a job (inside a category)
function renderCap(active, cur) {
  const tools = $("#capTools"), cta = $("#capCta"), tag = hit.querySelector(".hit__tag");
  if (S.cat >= 0) {
    const c = CATS[S.cat], ji = c.jobs[cur], pr = PROJECTS[ji];
    $("#capIdx").textContent = `${pad(cur + 1)} / ${pad(c.jobs.length)}`; $("#capDisc").textContent = pr.disc; $("#capTitle").textContent = pr.title;
    $("#capCtx").textContent = L() === "pt" ? pr.pt : pr.ctx; tools.replaceChildren(toolChips(pr.tools, false)); cta.textContent = "";
    tag.textContent = i18("openCase", "Open case");
    $("#catCount").textContent = `${pad(cur + 1)} / ${pad(c.jobs.length)}`;
    document.querySelectorAll("#catDots button").forEach((d, k) => d.classList.toggle("on", k === cur));
    hit.style.setProperty("--cover", pr.cover ? `url(./${pr.cover})` : "none"); hit.setAttribute("aria-label", pr.title);
    setTint(pr.tint);
  } else if (active >= 0) {
    const c = CATS[active], n = c.jobs.length;
    $("#capIdx").textContent = `${pad(active + 1)} / ${pad(N)}`; $("#capDisc").textContent = i18("catWord", "Category");
    $("#capTitle").textContent = L() === "pt" ? c.nameP : c.name; $("#capCtx").textContent = L() === "pt" ? c.textP : c.text;
    tools.replaceChildren(); cta.textContent = `${n} ${n === 1 ? i18("work", "work") : i18("works", "works")} · ${i18("explore", "Explore")} →`;
    tag.textContent = i18("explore", "Explore");
    hit.style.setProperty("--cover", c.cover ? `url(./${c.cover})` : "none"); hit.setAttribute("aria-label", (L() === "pt" ? c.nameP : c.name) + " — " + i18("explore", "Explore"));
    setTint(c.tint);
  }
}
const setTint = (t) => document.documentElement.style.setProperty("--tint", `rgb(${t.map((v) => Math.round(v * 255)).join(",")})`);

/* ───────────── category carousel ───────────── */
function openCat(k, at = 0) {
  if (!CATS[k]) return;
  const c = CATS[k], sw = S.cat >= 0 && S.cat !== k; S.cat = k; S.catShown = k; S.slideT = clamp(at, 0, c.jobs.length - 1); if (S.catT < 0.05 || sw) S.slide = S.slideT;
  setGate(k, true); if (scrollY > 2) scrollTo(0, 0);
  document.body.classList.add("is-cat");
  $("#catName").textContent = L() === "pt" ? c.nameP : c.name;
  $("#catDots").replaceChildren(...c.jobs.map((ji, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", PROJECTS[ji].title); b.onclick = () => slideTo(i); return b; }));
  S.capKey = "";
  setTimeout(() => { waves.trace(flankL, { strength: 1 }); waves.trace(flankR, { strength: 1, up: true }); }, 420);
}
function closeCat() { if (S.cat < 0) return; S.cat = -1; document.body.classList.remove("is-cat"); S.capKey = ""; }
function slideTo(i) {
  if (S.cat < 0) return; const n = CATS[S.cat].jobs.length, t = clamp(i, 0, n - 1); if (t === Math.round(S.slideT)) return;
  S.slideT = t; setTimeout(() => waves.trace(t > S.slide ? flankR : flankL, { strength: 0.7, up: t < S.slide }), 160);
}
/** jump straight to a job: its category, opened at its slide */
function showJob(ji) {
  const k = CATS.findIndex((c) => c.jobs.includes(ji)); if (k < 0) return;
  scrollTo({ top: 0, behavior: "auto" }); readScroll(); openCat(k, CATS[k].jobs.indexOf(ji)); S.p = S.pT = k + 1; S.slide = S.slideT;
}
// wheel / trackpad: slides sideways; past the last work it carries on to the next category
let snapT = 0, over = 0, overAt = 0;
addEventListener("wheel", (e) => {
  if (S.cat < 0 || S.caseOpen) return;
  e.preventDefault();
  const unitPx = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
  const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unitPx, lim = CATS[S.cat].jobs.length - 1;
  if (performance.now() - overAt > 700) over = 0;
  let t = S.slideT + d / 520;
  if (t > lim + 0.3) { over += t - (lim + 0.3); t = lim + 0.3; overAt = performance.now(); } else if (t < -0.3) { over -= -0.3 - t; t = -0.3; overAt = performance.now(); } else over = 0;
  S.slideT = t;
  if (over > 0.7) { const next = S.cat + 1; over = 0; if (next < N) openCat(next); else closeCat(); return; }   // past the last work: retune to the next station
  if (over < -0.7) { over = 0; closeCat(); return; }
  clearTimeout(snapT); snapT = setTimeout(() => { const r = clamp(Math.round(S.slideT), 0, lim); S.slideT = S.slide; slideTo(r); S.slideT = r; }, 140);
}, { passive: false });
// drag / swipe
let drag = null;
addEventListener("pointerdown", (e) => { if (S.cat < 0 || S.caseOpen || e.button !== 0 || e.target.closest("button:not(#hit),a,.catui")) return; drag = { x: e.clientX, s: S.slideT, moved: false }; });
addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true; if (drag.moved) S.slideT = clamp(drag.s - dx / (innerWidth * 0.32), -0.3, CATS[S.cat].jobs.length - 0.7); });
addEventListener("pointerup", () => { if (!drag) return; const d = drag; drag = null; if (!d.moved) return; hit.dataset.dragged = "1"; setTimeout(() => delete hit.dataset.dragged, 50);
  const r = clamp(Math.round(S.slideT + Math.sign(S.slideT - d.s) * 0.25), 0, CATS[S.cat].jobs.length - 1); S.slideT = S.slide; slideTo(r); S.slideT = r; });
function goTo() { closeCat(); scrollTo({ top: 0, behavior: S.motion ? "smooth" : "auto" }); }

// pager
const pager = $("#pager");
["Intro", ...CATS.map((c) => c.name)].forEach((label, k) => {
  const li = document.createElement("li"), b = document.createElement("button");
  b.type = "button"; b.textContent = label; b.setAttribute("aria-label", label); b.onclick = () => { closeCat(); goTo(k); }; li.appendChild(b); pager.appendChild(li);
});
$("#total").textContent = "/ " + pad(N);


// gate
const gate = $("#gate"), needle = $("#needle");
const knobHit = (e) => Math.hypot(e.clientX - innerWidth / 2, e.clientY - innerHeight / 2) < $("#knob").clientWidth * 0.33;
const stationAt = (e) => { const deg = (((Math.atan2(e.clientY - innerHeight / 2, e.clientX - innerWidth / 2) * 180) / Math.PI + 90) % 360 + 360) % 360; return Math.floor(deg / SEC) % GATE.length; };
function enter() {                                     // press: tune in to the station under the index
  if (S.cat >= 0) return; if (knob) knob.set({ press: 1, glow: 1 });
  const s = stationNote(Math.max(0, gateIdx)); note(s - 12, { gain: 0.08, dur: 0.7 }); note(s + 7, { gain: 0.05, dur: 0.6, when: 0.07 });
  openCat(Math.max(0, gateIdx));
}
// a press anywhere on the dial enters the station it is tuned to
// (on touch there is no hover, so a tap on another station's side of the dial tunes to it first)
gate.addEventListener("click", (e) => { if (e.detail === 0 || knobHit(e) || !$("#knob").clientWidth || stationAt(e) === gateIdx) enter(); else { gateIdle = 0; gateAuto = 0; setGate(stationAt(e), true); } });
// inside a category: a click on empty space returns to the dial; a click beside the centre slide moves to that neighbour
document.addEventListener("click", (e) => {
  if (S.cat < 0 || S.caseOpen || S.catT < 0.6 || hit.dataset.dragged || e.target.closest("button,a,.catui,.cap,.hdr,.dock,.case")) return;
  const r = hit.getBoundingClientRect();
  if (e.clientY > r.top && e.clientY < r.bottom && r.width) { slideTo(Math.round(S.slideT) + (e.clientX > r.right ? 1 : -1)); return; }
  note(stationNote(S.cat) - 12, { gain: 0.05, dur: 0.4 }); closeCat();
});
gate.addEventListener("pointerdown", (e) => knob && knobHit(e) && knob.set({ press: 1 }));
gate.addEventListener("pointerleave", () => knob && !S.entered && knob.set({ press: 0, hover: 0, glow: 0 }));
addEventListener("pointermove", (e) => {
  S.mxT = (e.clientX / innerWidth) * 2 - 1; S.myT = (e.clientY / innerHeight) * 2 - 1;
  if (!S.entered) {
    const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2, r = Math.hypot(dx, dy) / (Math.min(innerWidth, innerHeight) * 0.5);
    S.gateNear = 1 - clamp(r, 0, 1);
    const deg = (((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360 + 360) % 360;
    needle.style.transform = `rotate(${deg}deg)`;
    gateIdle = 0; gateAuto = 0;
    const inside = knob ? knobHit(e) : r < 0.3;
    if (!inside) { setGate(Math.floor(deg / SEC) % GATE.length, false); if (knob) knob.set({ angle: -deg * Math.PI / 180 }); }   // the dial follows the pointer; over the knob the station holds
    if (knob) knob.set({ tiltX: clamp(dx / innerWidth, -.5, .5) * .28, tiltY: .06 + clamp(dy / innerHeight, -.5, .5) * .22, lx: dx / innerWidth * 2, ly: dy / innerHeight * 2, hover: inside ? 1 : 0, glow: inside ? 1 : 0 });
    document.querySelectorAll(".ap").forEach((c, i) => (c.style.transform = `rotate(${i * 47 + S.gateNear * (60 + i * 25)}deg) scale(${1 - S.gateNear * 0.16})`));
  }
});
hit.addEventListener("pointerenter", () => (S.hoverT = 1)); hit.addEventListener("pointerleave", () => (S.hoverT = 0));
hit.addEventListener("focus", () => (S.hoverT = 1)); hit.addEventListener("blur", () => (S.hoverT = 0));

// case study: video (YouTube / Vimeo / file), cover, gallery, Challenge → Outcome, external link
const caseEl = $("#case"), caseIn = $("#caseIn"), caseMedia = $("#caseMedia"), caseThumbs = $("#caseThumbs");
let caseItems = [], caseIdx = -1;
function embedOf(url) {
  const u = (url || "").trim(); if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1` };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/);
  if (m) { const hsh = m[2] || (u.match(/[?&]h=([\da-f]+)/) || [])[1]; return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}?dnt=1${hsh ? "&h=" + hsh : ""}` }; }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { kind: "video", src: /^https?:/.test(u) ? u : "./" + u.replace(/^\.?\//, "") };
  if (/^https:\/\//.test(u)) return { kind: "iframe", src: u };
  return null;
}
function showStage(k) {
  const it = caseItems[k]; if (!it) return;
  let el;
  if (it.kind === "iframe") { el = document.createElement("iframe"); el.src = it.src; el.title = it.alt; el.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; el.allowFullscreen = true; el.referrerPolicy = "strict-origin-when-cross-origin"; }
  else if (it.kind === "video") { el = document.createElement("video"); el.src = it.src; el.controls = true; el.playsInline = true; el.preload = "metadata"; }
  else { el = new Image(); el.src = it.src; el.alt = it.alt; el.decoding = "async"; }
  caseMedia.replaceChildren(el); caseMedia.dataset.kind = it.kind;
  caseThumbs.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === k));
}
function openCase(i) { const pr = PROJECTS[i]; if (!pr) return;
  const j = pr.job || {}, L = S.lang === "pt" ? "pt" : "en"; caseIdx = i; caseItems = [];
  const v = embedOf(j.video); if (v) caseItems.push({ ...v, alt: pr.title + " — video" });
  if (pr.cover) caseItems.push({ kind: /\.(webm|mp4|mov)$/i.test(pr.cover) ? "video" : "img", src: "./" + pr.cover, alt: pr.title + " — cover" });
  (j.gallery || []).forEach((g, k) => { const e = /^https?:/.test(g) && embedOf(g); if (e) caseItems.push({ ...e, alt: `${pr.title} — ${k + 1}` }); else caseItems.push(/\.(mp4|webm|mov)$/i.test(g) ? { kind: "video", src: "./" + g, alt: `${pr.title} — ${k + 1}` } : { kind: "img", src: "./" + g, alt: `${pr.title} — ${k + 1}` }); });
  caseThumbs.replaceChildren(...(caseItems.length > 1 ? caseItems.map((it, k) => {
    const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", it.alt);
    if (it.kind === "img") { const im = new Image(); im.src = it.src; im.alt = ""; im.loading = "lazy"; b.append(im); } else { const sp = document.createElement("span"); sp.className = "play"; sp.textContent = "Video"; b.append(sp); }
    b.onclick = () => showStage(k); return b; }) : []));
  $("#caseDisc").textContent = pr.disc; $("#caseTitle").textContent = pr.title;
  const ck = CATS.find((c) => c.jobs.includes(i)); $("#caseMeta").textContent = [ck && (L === "pt" ? ck.nameP : ck.name), j.client, j.year].filter(Boolean).join(" · ");
  $("#caseCtx").textContent = L === "pt" ? pr.pt : pr.ctx;
  let any = false;
  document.querySelectorAll("#caseDl > div").forEach((row) => { const t = tx(j[row.dataset.k], L); row.hidden = !t; row.lastElementChild.textContent = t; row.lastElementChild.className = ""; if (t) any = true; });
  if (!any) document.querySelectorAll("#caseDl > div").forEach((row) => { row.hidden = false; row.lastElementChild.className = "ph"; });
  const role = document.querySelector('#caseCredits [data-k="role"]'); role.hidden = !j.role; role.lastElementChild.textContent = j.role || "";
  const tl = document.querySelector('#caseCredits [data-k="tools"]'); tl.hidden = !pr.tools.length; tl.lastElementChild.replaceChildren(toolChips(pr.tools, true));
  const link = $("#caseLink"), url = j.link && j.link.url;
  link.hidden = !url; if (url) { link.href = url; link.firstElementChild.textContent = tx(j.link.label, L) || (L === "pt" ? I18N.pt.cMore : "View project"); }
  caseEl.hidden = false; caseIn.scrollTop = 0; showStage(0); setTimeout(() => { waves.trace(caseIn, { edge: "l", strength: 0.8 }); waves.trace(caseIn, { edge: "r", strength: 0.8, up: true }); }, 380); document.body.classList.add("is-case"); S.caseOpen = true; if (window.self === window.top) $("#caseX").focus(); }
function closeCase() { if (caseEl.hidden) return; caseEl.hidden = true; caseMedia.replaceChildren(); document.body.classList.remove("is-case"); S.caseOpen = false; hit.focus({ preventScroll: true }); }
hit.addEventListener("click", () => { if (hit.dataset.dragged) return; if (S.cat >= 0) openCase(CATS[S.cat].jobs[clamp(Math.round(S.slideT), 0, CATS[S.cat].jobs.length - 1)]); else if (S.active >= 0) openCat(S.active); });
$("#catBack").addEventListener("click", closeCat);
$("#catPrev").addEventListener("click", () => slideTo(Math.round(S.slideT) - 1));
$("#catNext").addEventListener("click", () => slideTo(Math.round(S.slideT) + 1));
document.querySelectorAll(".nav a, .talk").forEach((a) => a.addEventListener("click", closeCat));
$("#caseX").addEventListener("click", closeCase);
caseEl.addEventListener("click", (e) => { if (e.target === caseEl) closeCase(); });

addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (S.caseOpen) return closeCase(); return closeCat(); }
  if (S.caseOpen) return;
  if (S.cat >= 0) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); slideTo(Math.round(S.slideT) + 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); slideTo(Math.round(S.slideT) - 1); }
    if (e.key === "Enter" && document.activeElement === document.body) { e.preventDefault(); hit.click(); }
    return;
  }
  if (!S.entered) {                                    // at the dial: ← → tune, Enter presses; ↓ scrolls on as usual
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest("a,button:not(#gate)")) { e.preventDefault(); enter(); }
    if (e.key === "ArrowRight") { e.preventDefault(); gateIdle = 0; gateAuto = 0; setGate((Math.max(0, gateIdx) + 1) % GATE.length, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); gateIdle = 0; gateAuto = 0; setGate((Math.max(0, gateIdx) + GATE.length - 1) % GATE.length, true); }
  }
});

// dock
applyContent();
const EN = {}; document.querySelectorAll("[data-i18n]").forEach((el) => (EN[el.dataset.i18n] = el.textContent));
$("#lang").addEventListener("click", () => {
  S.lang = S.lang === "en" ? "pt" : "en"; document.documentElement.lang = S.lang === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("#lang b").forEach((b) => b.classList.toggle("on", b.dataset.l === S.lang));
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = (S.lang === "pt" && I18N.pt[el.dataset.i18n]) || EN[el.dataset.i18n]));
  if (knob) knob.setLabel(S.lang === "pt" ? I18N.pt.gateCta : "Press to enter");
  buildRing(); { const g = Math.max(0, gateIdx); gateIdx = -2; quietTune = true; setGate(g, false); quietTune = false; }
  setMotionLabel(); buildRows(); buildProcess(); if (S.active >= 0) onActive(S.active); if (S.caseOpen) openCase(caseIdx); S.capKey = ""; if (S.cat >= 0) $("#catName").textContent = L() === "pt" ? CATS[S.cat].nameP : CATS[S.cat].name;
});
const setMotionLabel = () => { $("#motionLbl").textContent = S.lang === "pt" ? (S.motion ? "Movimento on" : "Movimento off") : S.motion ? "Motion on" : "Motion off"; $("#motion").setAttribute("aria-pressed", S.motion); };
$("#motion").addEventListener("click", () => { S.motion = !S.motion; setMotionLabel(); });
setMotionLabel();

addEventListener("scroll", readScroll, { passive: true });
// corridor snap: when scrolling rests between two stops, glide (≈0.7 s, ease-out) to the nearest
// one so a pane is always docked and clickable. Any new wheel / touch / key input cancels it.
let snapIdle = 0, snapRaf = 0, touching = false, snapping = false;
const cancelSnap = () => { cancelAnimationFrame(snapRaf); snapRaf = 0; snapping = false; };
function corridorSnap() {
  return;                                              // no corridor any more: the dial is one screen
  if (!S.entered || S.cat >= 0 || S.caseOpen || touching) return;
  const u = unit(), y = scrollY; if (y > u * (N + 0.45)) return;            // past the corridor: normal page
  const goal = Math.round(y / u) * u + 1, d = goal - y; if (Math.abs(d) < 3) return;
  if (!S.motion) { scrollTo(0, goal); return; }
  const t0 = performance.now(), dur = clamp(380 + Math.abs(d) * 0.9, 420, 760); snapping = true;
  const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); scrollTo(0, y + d * e); if (k < 1) snapRaf = requestAnimationFrame(step); else snapping = false; };
  snapRaf = requestAnimationFrame(step);
}
addEventListener("scroll", () => { if (snapping) return; clearTimeout(snapIdle); snapIdle = setTimeout(corridorSnap, 170); }, { passive: true });
addEventListener("wheel", () => { if (snapping) cancelSnap(); }, { passive: true });
addEventListener("touchstart", () => { touching = true; cancelSnap(); clearTimeout(snapIdle); }, { passive: true });
addEventListener("touchend", () => { touching = false; clearTimeout(snapIdle); snapIdle = setTimeout(corridorSnap, 220); }, { passive: true });
addEventListener("keydown", () => { if (snapping) cancelSnap(); });
addEventListener("resize", () => { resize(); layoutRail(); readScroll(); });
resize(); buildRows();
if (gl) { try { initGL(); } catch (err) { console.error("[FineTune] WebGL init failed:", err); document.documentElement.classList.add("no-gl"); R = null; } }
buildProcess(); readScroll();
if (document.fonts) document.fonts.ready.then(() => { layoutRail(); });
// deep links (used by Portfolio Update's preview): ?skip ?lang=pt ?case=<id> ?at=practice|process|about
if (QS.get("lang") === "pt") $("#lang").click();
const qCase = QS.get("case"), qAt = QS.get("at");
const qCat = QS.get("cat");
if (qCase) { const k = PROJECTS.findIndex((p) => p.slug === qCase); if (k >= 0) { showJob(k); openCase(k); } }
else if (qCat) { const k = CATS.findIndex((c) => c.id === qCat); if (k >= 0) { openCat(k); S.p = S.pT = k + 1; } }
else if (qAt && document.getElementById(qAt)) { const el = document.getElementById(qAt); scrollTo(0, el.offsetTop + (qAt === "about" ? 0 : innerHeight * 0.25)); readScroll(); }
window.__ft = { S, goTo, enter, openCat, closeCat, slideTo, showJob, waves };
quietTune = true; setGate(0, true); quietTune = false;
requestAnimationFrame(frame);
