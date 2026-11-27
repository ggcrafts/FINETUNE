// FineTune v4 — specialist portfolio.
//
// Order of the page (what a recruiter needs, in the order they need it):
//   hero      one specialty, one line, the reel one click away
//   work      the flagship cases (big), then the supporting ones
//   skills    the knob, in the middle: skills as stations, each with its proof
//   index     everything else, filterable by category
//   lab       the differentiator: making-ofs, pipelines, creative tech
//   about     ID card + "Get in touch" (black hole)
// Content: content.json (Portfolio Update). Media: the shared library in ../v3/.

import { QS, tx, isVideo, loadContent, buildModel, embedOf, clock } from "./model.js";
import { createGalaxy } from "./galaxy.js";
import { createSkills } from "./skills.js";
import { createLineWaves } from "./lines.js";
import { setSoundGate } from "./sound.js";

const C = await loadContent();
const M = buildModel(C);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const pad = (n) => String(n).padStart(2, "0");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const LITE = matchMedia("(pointer:coarse)").matches && Math.min(screen.width, screen.height) < 900;
if (LITE) document.documentElement.classList.add("lite");

const S = { lang: "en", motion: !matchMedia("(prefers-reduced-motion: reduce)").matches, time: 0, mx: 0, my: 0, mxT: 0, myT: 0,
  tint: [0.56, 0.85, 1], hoverTint: null, caseOpen: false, theaterOpen: false, hole: false, core: 1, trails: 1, lines: 1, shift: 0 };
setSoundGate(() => S.motion);

/* ───────────── i18n ───────────── */
const PT = {
  navWork: "Trabalhos", navSkills: "Skills", navIndex: "Índice", navLab: "Lab", navAbout: "Sobre", reel: "Reel", playReel: "Ver reel", seeWork: "Trabalhos selecionados",
  workEyebrow: "Trabalhos selecionados", workT1: "Cases selecionados.", workT2: "O que me contratam para fazer.", featuredH: "Também no quadro",
  skEyebrow: "Skills · sintonizadas", skT1: "Uma especialidade.", skT2: "Todas as frequências em volta.", proofH: "Prova",
  lgCore: "Núcleo — o que me contratam para fazer", lgAdj: "Adjacente — entrego em nível sênior", lgEdge: "Diferencial — acelera o pipeline",
  ring_core: "Núcleo — o que me contratam para fazer", ring_adjacent: "Adjacente — entrego em nível sênior", ring_edge: "Diferencial — acelera o pipeline",
  knobLabel: "Pressione · veja o trabalho",
  idxEyebrow: "Índice", idxT1: "Todos os trabalhos.", idxT2: "Filtrados por ofício.", all: "Todos", showAll: "Mostrar todos", showLess: "Mostrar menos",
  labEyebrow: "Lab · Bastidores", labT1: "Além das ferramentas.", labT2: "Como o trabalho é feito.",
  labNote: "Pipelines, automações e workflows com IA que eu dirijo e construo — para o frame ficar com mais tempo.", watch: "Ver o making-of",
  abEyebrow: "Sobre · Contato", idAvail: "Disponível · Remoto", idCta: "Entrar em contato", talk: "Vamos conversar", close: "Fechar",
  idF1: "Experiência", idF1v: "12+ anos", idF2: "Base", idF2v: "Curitiba, Brasil", idF3: "Atuação", idF3v: "Remoto · Internacional",
  cRole: "Meu papel", cChallenge: "Desafio", cIdea: "Ideia", cExec: "Execução", cOutcome: "Resultado", cSkills: "Skills", cTools: "Ferramentas", cMore: "Ver projeto",
  openCase: "Abrir case", breakdown: "Breakdown", video: "Vídeo", motionOn: "Movimento on", motionOff: "Movimento off", flagships: "cases principais",
};
const EN = {};
const i18n = (k, en) => (S.lang === "pt" && PT[k]) || en;

/* ───────────── shared bits ───────────── */
function toolChips(ids, labels) {
  const frag = document.createDocumentFragment();
  ids.forEach((id) => {
    const t = M.tools.get(id); if (!t) return;
    const chip = el("span", "tool" + (labels ? " tool--l" : "")), ic = el("span", "tool__ic");
    chip.title = t.label;
    if (t.icon) { ic.style.setProperty("--icon", `url("${M.src(t.icon)}")`); chip.classList.add("has-icon"); } else ic.textContent = t.mono || t.label.slice(0, 2);
    chip.append(ic);
    if (labels) chip.append(el("span", "tool__l", t.label)); else chip.setAttribute("aria-label", t.label);
    frag.append(chip);
  });
  return frag;
}
/** cover image, or a muted looping video that plays only while it is on screen (and Motion is on) */
const loops = new Set();
const io = new IntersectionObserver((es) => es.forEach((e) => { e.target._vis = e.isIntersecting; syncLoop(e.target); }), { rootMargin: "120px" });
function syncLoop(v) { if (v._vis && S.motion && !S.caseOpen && !S.theaterOpen && (!v._hoverOnly || v._hover)) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }
function coverEl(path, { hoverOnly = false, alt = "" } = {}) {
  const p = M.src(path);
  if (!p) return el("span", "noimg");
  if (isVideo(p)) {
    const v = el("video"); v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata"; v.dataset.src = p; v.src = p + "#t=0.5"; v.setAttribute("aria-hidden", "true");
    v._hoverOnly = hoverOnly; loops.add(v); io.observe(v); return v;
  }
  const im = new Image(); im.src = p; im.alt = alt; im.loading = "lazy"; im.decoding = "async"; return im;
}
const corners = () => [1, 2, 3, 4].map((k) => el("i", "c c" + k));
const metaLine = (j) => [j.client, j.year].filter(Boolean).join(" · ");

/* ───────────── hero ───────────── */
function renderHero() {
  const L = S.lang, P = M.positioning;
  $("#heroName").textContent = M.about.name || "Luiz Gustavo Czaika";
  $("#heroTitle").textContent = P.specialty(L);
  $("#brandRole").textContent = P.specialty(L);
  $("#heroLine").textContent = P.line(L);
  $("#heroSec").textContent = P.secondary(L);
  $("#heroFacts").textContent = P.facts(L);
  document.title = `${M.about.name || "Luiz Gustavo Czaika"} — ${P.specialty("en")}`;
  const dur = M.reel ? clock(M.reel.dur) : "";
  $$(".reel-dur").forEach((e) => (e.textContent = dur));
  $("#viewerName").textContent = M.reel ? M.reel.name(L) : "";
  document.documentElement.classList.toggle("no-reel", !M.reel);
}
let heroLoop = null;
function buildViewer() {
  const box = $("#viewerMedia"), loop = M.positioning.loop || (M.reel && M.reel.poster) || M.positioning.poster || (M.flagships[0] && M.flagships[0].cover);
  const media = coverEl(loop, { alt: "" });
  if (media.tagName === "VIDEO") { media.poster = M.src(M.positioning.poster) || ""; heroLoop = media; }
  box.replaceChildren(media);
}
function timecode() {
  const t = heroLoop && heroLoop.readyState >= 2 ? heroLoop.currentTime : S.time, f = Math.floor((t % 1) * 24);
  const s = Math.floor(t), str = `00:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
  if (str !== timecode.last) { $("#tc").textContent = str; timecode.last = str; }
}

/* ───────────── selected work ───────────── */
function caseCard(j, k, big) {
  const L = S.lang, li = el("li", "cc" + (big ? " cc--big" : "")), b = el("button", "cc__btn");
  li.style.setProperty("--c", j.tintHex); b.type = "button"; b.setAttribute("aria-label", `${i18n("openCase", "Open case")}: ${j.title}`);
  const media = el("span", "cc__media"), cov = coverEl(j.cover, { hoverOnly: !big, alt: "" });
  media.append(cov, ...corners());
  if (j.raw.breakdown) media.append(el("span", "cc__badge", i18n("breakdown", "Breakdown")));
  const meta = el("span", "cc__meta"); meta.append(el("span", "cc__i", pad(k + 1)), el("span", "cc__bar"), el("span", "cc__disc", j.disc));
  const body = el("span", "cc__body");
  body.append(meta, el("span", "cc__t", j.title));
  if (metaLine(j)) body.append(el("span", "cc__cl", metaLine(j)));
  if (j.role) { const r = el("span", "cc__role"); r.append(el("b", null, i18n("cRole", "My role")), el("span", null, j.role)); body.append(r); }
  if (j.ctx(L)) body.append(el("span", "cc__ctx", j.ctx(L)));
  const foot = el("span", "cc__foot"), tl = el("span", "tools"); tl.append(toolChips(j.tools.slice(0, 6), false));
  foot.append(tl, el("span", "cc__cta", i18n("openCase", "Open case") + " →"));
  body.append(foot);
  b.append(media, body);
  b.onclick = () => openCase(j);
  const v = cov.tagName === "VIDEO" ? cov : null;
  b.addEventListener("pointerenter", () => { S.hoverTint = j.tint; if (v) { v._hover = true; syncLoop(v); } });
  b.addEventListener("pointerleave", () => { S.hoverTint = null; if (v) { v._hover = false; syncLoop(v); } });
  li.append(b);
  return li;
}
function renderWork() {
  const fl = M.flagships, rest = fl.length - 1, span = rest >= 3 ? 2 : rest === 2 ? 3 : 6;
  $("#cases").replaceChildren(...fl.map((j, k) => { const c = caseCard(j, k, k === 0); if (k) c.style.gridColumn = `span ${span}`; return c; }));
  const L = S.lang, n = fl.length;
  $("#workNote").textContent = n ? (L === "pt" ? `${pad(n)} ${PT.flagships} · ${M.positioning.specialty(L)}` : `${pad(n)} flagship cases · ${M.positioning.specialty(L)}`) : "";
  const fe = M.featured;
  $("#featuredWrap").hidden = !fe.length;
  $("#featured").replaceChildren(...fe.map((j) => {
    const li = el("li", "fc"), b = el("button", "fc__btn"); b.type = "button"; li.style.setProperty("--c", j.tintHex);
    const m = el("span", "fc__media"), cov = coverEl(j.cover, { hoverOnly: true }); m.append(cov);
    const t = el("span", "fc__t"); t.append(el("b", null, j.title), el("small", null, j.disc));
    b.append(m, t); b.onclick = () => openCase(j);
    b.addEventListener("pointerenter", () => { S.hoverTint = j.tint; if (cov.tagName === "VIDEO") { cov._hover = true; syncLoop(cov); } });
    b.addEventListener("pointerleave", () => { S.hoverTint = null; if (cov.tagName === "VIDEO") { cov._hover = false; syncLoop(cov); } });
    li.append(b); return li;
  }));
}

/* ───────────── index ───────────── */
const IX = { cat: "all", open: false, LIMIT: 12 };
function renderIndex() {
  const L = S.lang, f = $("#filters");
  const tabs = [{ id: "all", name: i18n("all", "All"), n: M.jobs.length, tier: "primary" }, ...M.cats.map((c) => ({ id: c.id, name: c.name(L), n: c.jobs.length, tier: c.tier }))];
  f.replaceChildren(...tabs.map((t) => { const b = el("button", "flt" + (t.tier === "secondary" ? " flt--sec" : "")); b.type = "button"; b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", t.id === IX.cat); b.append(el("span", null, t.name), el("i", null, pad(t.n))); b.onclick = () => { IX.cat = t.id; IX.open = false; renderIndex(); }; return b; }));
  const cat = M.cats.find((c) => c.id === IX.cat), list = cat ? cat.jobs : M.jobs, shown = IX.open ? list : list.slice(0, IX.LIMIT);
  $("#rows").replaceChildren(...shown.map((j, k) => {
    const li = el("li"), b = el("button", "ix"); b.type = "button"; li.style.setProperty("--c", j.tintHex);
    const cn = M.cats.find((c) => j.cats.includes(c.id));
    b.append(el("span", "ix__i", pad(k + 1)), el("span", "ix__t", j.title), el("span", "ix__c", j.client || "—"), el("span", "ix__d", j.disc || (cn ? cn.name(L) : "")), el("span", "ix__y", j.year || "—"), el("i", "ix__a", "→"));
    if (j.tier === "flagship") b.classList.add("ix--flag");
    b.onclick = () => openCase(j);
    b.addEventListener("pointerenter", () => peek(j)); b.addEventListener("pointerleave", () => peek(null));
    li.append(b); return li;
  }));
  const more = $("#rowsMore"); more.hidden = list.length <= IX.LIMIT;
  more.textContent = IX.open ? i18n("showLess", "Show less") + " ↑" : `${i18n("showAll", "Show all")} (${list.length}) ↓`;
  more.onclick = () => { IX.open = !IX.open; renderIndex(); };
}
const peekEl = $("#peek");
function peek(j) {
  if (!j || LITE) { peekEl.classList.remove("on"); S.hoverTint = null; return; }
  const p = M.src(j.cover); if (!p || isVideo(p)) { peekEl.classList.remove("on"); return; }
  peekEl.style.backgroundImage = `url("${p}")`; peekEl.classList.add("on"); S.hoverTint = j.tint;
}
$("#index").addEventListener("pointermove", (e) => { peekEl.style.transform = `translate(${e.clientX + 24}px,${e.clientY - 70}px)`; });

/* ───────────── lab ───────────── */
function renderLab() {
  const L = S.lang, list = M.lab;
  $("#lab").hidden = !list.length;
  $("#labList").replaceChildren(...list.map((j, k) => {
    const li = el("li", "lc"), b = el("button", "lc__btn"); b.type = "button"; li.style.setProperty("--c", j.tintHex);
    const m = el("span", "lc__media"), cov = coverEl(j.cover, { hoverOnly: true }); m.append(cov, ...corners(), el("span", "lc__play", "▶"));
    const t = el("span", "lc__body"), meta = el("span", "cc__meta");
    meta.append(el("span", "cc__i", "R&D " + pad(k + 1)), el("span", "cc__bar"), el("span", "cc__disc", j.disc));
    const tl = el("span", "tools"); tl.append(toolChips(j.tools, false));
    t.append(meta, el("span", "lc__t", j.title), el("span", "lc__ctx", j.ctx(L)), tl, el("span", "cc__cta", i18n("watch", "Watch the making-of") + " →"));
    b.append(m, t); b.onclick = () => openCase(j);
    li.append(b); return li;
  }));
}

/* ───────────── about ───────────── */
function renderAbout() {
  const a = M.about, L = S.lang, set = (k, v) => { const t = tx(v, L); if (!t) return; $$(`[data-i18n="${k}"]`).forEach((e) => (e.textContent = t)); };
  set("idRole", a.role); set("idBio", a.bio); set("idAvail", a.availability);
  (a.facts || []).slice(0, 3).forEach((f, i) => { set("idF" + (i + 1), f.label); set("idF" + (i + 1) + "v", f.value); });
  if (a.name) { const parts = a.name.trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : "", h3 = $(".idcard__body h3"); h3.replaceChildren(parts.join(" ")); if (last) h3.append(el("br"), last); }
  const img = $(".idcard__photo img"); img.src = M.src(a.portrait || "portrait/luiz-czaika.webp"); img.alt = "Portrait of " + (a.name || "Luiz Gustavo Czaika");
  const li = $$(".idcard__links li"), show = (k, href, text) => { li[k].hidden = !href; if (href) { li[k].firstElementChild.href = href; li[k].firstElementChild.textContent = text; } };
  if (a.email) $("#talkBtn").href = "mailto:" + a.email;
  show(0, a.email && "mailto:" + a.email, a.email);
  show(1, a.linkedin, (a.linkedin || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") + " ↗");
  show(2, a.behance, (a.behance || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") + " ↗");
}
const idcard = $("#idcard");
$("#idwrap").addEventListener("pointermove", (e) => {
  if (!S.motion || e.pointerType === "touch") return;
  const r = idcard.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  idcard.style.setProperty("--ry", ((x - 0.5) * 7).toFixed(2) + "deg"); idcard.style.setProperty("--rx", ((0.5 - y) * 5).toFixed(2) + "deg");
  idcard.style.setProperty("--px", (x * 100).toFixed(1) + "%"); idcard.style.setProperty("--py", (y * 100).toFixed(1) + "%");
});
$("#idwrap").addEventListener("pointerleave", () => { idcard.style.setProperty("--rx", "0deg"); idcard.style.setProperty("--ry", "0deg"); });

/* ───────────── history: Back closes a case / the reel before leaving the site ───────────── */
const histTag = () => (history.state && history.state.ft) || "";
const pushHist = (tag) => { try { history.pushState({ ft: tag }, ""); } catch { /* sandboxed frame */ } };
addEventListener("popstate", () => { if (S.caseOpen) closeCaseNow(); else if (S.theaterOpen) closeReelNow(); });

/* ───────────── reel theater ───────────── */
const theater = $("#theater");
let reelOpener = null;
function openReel(which) {
  const list = [M.reel, M.breakdown].filter(Boolean); if (!list.length) { document.getElementById("work").scrollIntoView({ behavior: S.motion ? "smooth" : "auto" }); return; }
  const r = which || list[0];
  if (!S.theaterOpen) { pushHist("reel"); reelOpener = document.activeElement; }
  const L = S.lang, e = embedOf(r.video, M.src);
  $("#thName").textContent = r.name(L); $("#thDur").textContent = clock(r.dur);
  $("#thTabs").replaceChildren(...(list.length > 1 ? list.map((x) => { const b = el("button", "tab" + (x === r ? " on" : ""), x.kind === "breakdown" ? i18n("breakdown", "Breakdown") : x.name(L)); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", x === r); b.onclick = () => openReel(x); return b; }) : []));
  let m;
  if (!e) m = el("p", "theater__none", r.video);
  else if (e.kind === "iframe") { m = el("iframe"); m.src = e.src; m.title = r.name(L); m.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; m.allowFullscreen = true; m.referrerPolicy = "strict-origin-when-cross-origin"; }
  else { m = el("video"); m.src = e.src; m.controls = true; m.playsInline = true; m.autoplay = true; if (r.poster) m.poster = M.src(r.poster); }
  $("#thMedia").replaceChildren(m);
  theater.hidden = false; S.theaterOpen = true; document.body.classList.add("is-modal"); loops.forEach(syncLoop);
  $("#thX").focus({ preventScroll: true });
}
function closeReel() { if (theater.hidden) return; if (histTag() === "reel") history.back(); else closeReelNow(); }
function closeReelNow() { if (theater.hidden) return; theater.hidden = true; $("#thMedia").replaceChildren(); S.theaterOpen = false; document.body.classList.remove("is-modal"); loops.forEach(syncLoop); reelOpener && reelOpener.focus && reelOpener.focus({ preventScroll: true }); }
$$("[data-reel]").forEach((b) => b.addEventListener("click", () => openReel()));
$("#thX").addEventListener("click", closeReel);
theater.addEventListener("click", (e) => { if (e.target === theater) closeReel(); });

/* ───────────── case study ───────────── */
const caseEl = $("#case"), caseIn = $("#caseIn"), caseMedia = $("#caseMedia"), caseThumbs = $("#caseThumbs");
let caseItems = [], caseJob = null, caseOpener = null;
function showStage(k) {
  const it = caseItems[k]; if (!it) return;
  let m;
  if (it.kind === "iframe") { m = el("iframe"); m.src = it.src.replace(/([?&])autoplay=1&?/, "$1").replace(/[?&]$/, ""); m.title = it.alt; m.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; m.allowFullscreen = true; m.referrerPolicy = "strict-origin-when-cross-origin"; }
  else if (it.kind === "video") { m = el("video"); m.src = it.src; m.controls = true; m.playsInline = true; m.preload = "metadata"; }
  else { m = new Image(); m.src = it.src; m.alt = it.alt; m.decoding = "async"; }
  caseMedia.replaceChildren(m); caseMedia.dataset.kind = it.kind;
  $$("button", caseThumbs).forEach((b, i) => b.classList.toggle("on", i === k));
}
function openCase(j) {
  if (!j) return; const r = j.raw, L = S.lang;
  if (!S.caseOpen) { pushHist("case"); caseOpener = document.activeElement; }
  caseJob = j; caseItems = [];
  const v = embedOf(r.video, M.src); if (v) caseItems.push({ ...v, alt: j.title + " — video", label: i18n("video", "Video") });
  const bd = embedOf(r.breakdown, M.src); if (bd) caseItems.push({ ...bd, alt: j.title + " — breakdown", label: i18n("breakdown", "Breakdown") });
  if (j.cover) caseItems.push({ kind: isVideo(j.cover) ? "video" : "img", src: M.src(j.cover), alt: j.title + " — cover" });
  (r.gallery || []).forEach((g, k) => { const e = /^https?:/.test(g) && embedOf(g, M.src); caseItems.push(e ? { ...e, alt: `${j.title} — ${k + 1}`, label: i18n("video", "Video") } : { kind: isVideo(g) ? "video" : "img", src: M.src(g), alt: `${j.title} — ${k + 1}` }); });
  caseThumbs.replaceChildren(...(caseItems.length > 1 ? caseItems.map((it, k) => {
    const b = el("button"); b.type = "button"; b.setAttribute("aria-label", it.alt);
    if (it.kind === "img") { const im = new Image(); im.src = it.src; im.alt = ""; im.loading = "lazy"; b.append(im); } else b.append(el("span", "play", it.label || i18n("video", "Video")));
    b.onclick = () => showStage(k); return b;
  }) : []));
  $("#caseDisc").textContent = j.disc; $("#caseTitle").textContent = j.title;
  $("#caseMeta").textContent = metaLine(j);
  const role = $("#caseRole"); role.hidden = !j.role; role.lastElementChild.textContent = j.role;
  $("#caseCtx").textContent = j.ctx(L);
  let any = false;
  $$("#caseDl > div").forEach((row) => { const t = tx(r[row.dataset.k], L); row.hidden = !t; row.lastElementChild.textContent = t; if (t) any = true; });
  $("#caseDl").hidden = !any;
  const sk = $('#caseCredits [data-k="skills"]'), skl = M.skillsOf(j); sk.hidden = !skl.length; sk.lastElementChild.textContent = skl.map((s) => s.name(L)).join(" · ");
  const tl = $('#caseCredits [data-k="tools"]'); tl.hidden = !j.tools.length; tl.lastElementChild.replaceChildren(toolChips(j.tools, true));
  const link = $("#caseLink"), url = r.link && r.link.url;
  link.hidden = !url; if (url) { link.href = url; link.firstElementChild.textContent = tx(r.link.label, L) || i18n("cMore", "View project"); }
  caseEl.hidden = false; caseIn.scrollTop = 0; showStage(0); document.body.classList.add("is-modal"); S.caseOpen = true; S.hoverTint = j.tint; loops.forEach(syncLoop);
  setTimeout(() => { waves.trace(caseIn, { edge: "l", strength: 0.8 }); waves.trace(caseIn, { edge: "r", strength: 0.8, up: true }); }, 380);
  if (window.self === window.top) $("#caseX").focus({ preventScroll: true });
}
function closeCase() { if (caseEl.hidden) return; if (histTag() === "case") history.back(); else closeCaseNow(); }
function closeCaseNow() { if (caseEl.hidden) return; caseEl.hidden = true; caseMedia.replaceChildren(); document.body.classList.remove("is-modal"); S.caseOpen = false; S.hoverTint = null; loops.forEach(syncLoop); caseOpener && caseOpener.focus && caseOpener.focus({ preventScroll: true }); }
$("#caseX").addEventListener("click", closeCase);
caseEl.addEventListener("click", (e) => { if (e.target === caseEl) closeCase(); });
addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (S.caseOpen) closeCase(); else if (S.theaterOpen) closeReel(); }
  if (S.caseOpen && (e.key === "ArrowRight" || e.key === "ArrowLeft") && caseItems.length > 1) {
    const k = $$("button", caseThumbs).findIndex((b) => b.classList.contains("on")); showStage((k + (e.key === "ArrowRight" ? 1 : -1) + caseItems.length) % caseItems.length);
  }
});

/* ───────────── "Get in touch": the page falls into a black hole for 1.2 s, then the mail link opens ───────────── */
const talkBtn = $("#talkBtn"), mainEl = $("main");
talkBtn.addEventListener("click", (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
  if (S.hole) { ev.preventDefault(); return; }
  if (!S.motion || !galaxy) return;
  ev.preventDefault();
  const r = talkBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, href = talkBtn.href;
  S.hole = true; galaxy.hole(x, y); document.body.classList.add("is-hole");
  mainEl.style.transformOrigin = `${x}px ${scrollY + y}px`;
  const pull = mainEl.animate([{ transform: "none", filter: "blur(0px)", opacity: 1 }, { transform: "scale(.55) rotate(14deg)", filter: "blur(2px)", opacity: 0.9, offset: 0.45 },
    { transform: "scale(0) rotate(80deg)", filter: "blur(8px)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.5,0,.9,.4)", fill: "forwards" });
  setTimeout(() => { if (!window.__ftNoMail) location.href = href; }, 1200);
  setTimeout(() => { pull.cancel(); mainEl.style.transformOrigin = ""; mainEl.animate([{ opacity: 0, filter: "blur(14px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 600, easing: "ease-out" }); document.body.classList.remove("is-hole"); }, 1250);
  setTimeout(() => { S.hole = false; }, 1800);
});

/* ───────────── language + motion ───────────── */
$$("[data-i18n]").forEach((e) => (EN[e.dataset.i18n] = e.textContent));
function applyLang() {
  document.documentElement.lang = S.lang === "pt" ? "pt-BR" : "en";
  $$("#lang b").forEach((b) => b.classList.toggle("on", b.dataset.l === S.lang));
  $$("[data-i18n]").forEach((e) => (e.textContent = (S.lang === "pt" && PT[e.dataset.i18n]) || EN[e.dataset.i18n]));
  renderHero(); renderWork(); renderIndex(); renderLab(); renderAbout(); setMotionLabel();
  skills.render();
  if (S.caseOpen) openCase(caseJob);
}
$("#lang").addEventListener("click", () => { S.lang = S.lang === "en" ? "pt" : "en"; applyLang(); });
const setMotionLabel = () => { $("#motionLbl").textContent = S.motion ? i18n("motionOn", "Motion on") : i18n("motionOff", "Motion off"); $("#motion").setAttribute("aria-pressed", S.motion); };
$("#motion").addEventListener("click", () => { S.motion = !S.motion; setMotionLabel(); loops.forEach(syncLoop); document.documentElement.classList.toggle("still", !S.motion); });

/* ───────────── build ───────────── */
const waves = createLineWaves({ live: () => S.motion && !S.hole });
let galaxy = null;
try { galaxy = createGalaxy($("#gl"), { lite: LITE }); } catch (e) { console.error("[FineTune] WebGL:", e); }
if (!galaxy) document.documentElement.classList.add("no-gl");
const skills = createSkills({ M, lang: () => S.lang, motion: () => S.motion, lite: LITE, openCase, toolChips, i18n });
renderHero(); buildViewer(); renderWork(); renderIndex(); renderLab(); renderAbout(); setMotionLabel();
if (!S.motion) document.documentElement.classList.add("still");

/* ───────────── scroll: active nav, galaxy mood per section ───────────── */
const SECTIONS = ["top", "work", "skills", "index", "lab", "about"].map((id) => document.getElementById(id));
let active = "top";
function readScroll() {
  skills.update();
  const mid = innerHeight * 0.45;
  for (const s of SECTIONS) { if (s.hidden) continue; const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { active = s.id; break; } }
  $$(".nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + active));
  document.body.classList.toggle("in-about", active === "about");
  document.body.classList.toggle("scrolled", scrollY > 40);
}
addEventListener("scroll", readScroll, { passive: true });
addEventListener("resize", readScroll);
addEventListener("pointermove", (e) => { S.mxT = (e.clientX / innerWidth) * 2 - 1; S.myT = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

const MOOD = { top: [0.56, 0.85, 1], work: null, skills: null, index: [0.62, 0.72, 0.95], lab: [0.47, 0.85, 0.54], about: [1, 0.78, 0.52] };
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, (now - (frame.t || now)) / 1000); frame.t = now;
  const k = 1 - Math.pow(0.001, dt);
  if (S.motion && !S.caseOpen && !S.theaterOpen) S.time += dt;
  S.mx = mix(S.mx, S.motion ? S.mxT : 0, k * 0.5); S.my = mix(S.my, S.motion ? S.myT : 0, k * 0.5);
  skills.frame(dt); waves.tick(dt); timecode();
  if (!galaxy) return;
  if (LITE && (frame.n = (frame.n || 0) + 1) & 1) return;           // phones: the galaxy runs at half rate
  const want = S.hoverTint || (active === "skills" ? skills.tint : active === "work" ? (M.flagships[0] ? M.flagships[0].tint : MOOD.top) : MOOD[active]) || MOOD.top;
  S.tint = S.tint.map((v, i) => mix(v, want[i], clamp(k * 0.35, 0, 1)));
  const vh = innerHeight, y = scrollY, hero = clamp(1 - y / vh, 0, 1), about = active === "about" ? 1 : 0;
  S.core = mix(S.core, mix(active === "skills" ? 0.5 : 0.2, 0.95, hero) * (about ? 0.7 : 1) * (S.caseOpen || S.theaterOpen ? 0.5 : 1), k * 0.4);
  S.trails = mix(S.trails, (1 - about) * mix(0.45, 1, hero) * (1 + skills.weight * 0.4), k * 0.4);
  S.lines = mix(S.lines, 1 - about, k * 0.3);
  S.shift = mix(S.shift, innerWidth > 900 ? hero * 0.42 : 0, k * 0.5);
  galaxy.frame({ time: S.time, mx: S.mx, my: S.my, camZ: -y / vh * 2.4 - S.time * 0.12, tint: S.tint, core: S.core, focus: 1, trails: S.trails, lines: S.lines, shift: S.shift * (innerWidth / innerHeight) * 0.5 });
}
readScroll();
requestAnimationFrame(frame);

/* ───────────── deep links (used by Portfolio Update's preview) ─────────────
   ?lang=pt  ?case=<job id>  ?at=work|skills|index|lab|about  ?skill=<id>  ?reel  ?for=<profile id> */
if (QS.get("lang") === "pt") { S.lang = "pt"; applyLang(); }
const qAt = QS.get("at"), qCase = QS.get("case"), qSkill = QS.get("skill");
if (qSkill) { const i = M.skills.findIndex((s) => s.id === qSkill); if (i >= 0) { const sec = $("#skills"); scrollTo(0, sec.offsetTop + ((i + 0.5) / M.skills.length) * (sec.offsetHeight - innerHeight)); readScroll(); } }
else if (qAt && document.getElementById(qAt)) { scrollTo(0, document.getElementById(qAt).offsetTop - (qAt === "skills" ? 0 : 60)); readScroll(); }
if (qCase) { const j = M.byId.get(qCase); if (j) openCase(j); }
else if (QS.has("reel")) openReel();
window.__ft = { M, S, openCase, openReel, skills };
