// Portfolio Update — content editor for the FineTune v4 site (specialist portfolio).
// Reads / writes public/v4/content.json and imports media into the shared library in
// public/v3/ (media/, covers/, portrait/, reel/, tools/) through the dev-server API in
// ./plugin.ts. Run it with portfolio-update.bat. The v4 pages (Diretrizes, Posicionamento,
// Reels, Organizar, Skills, Versões por vaga) live in ./specialist.js.

import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { createSpecialist } from "./specialist.js";

const API = "/__portfolio";
const SITE = "/v4/";            // the site the preview shows
const MEDIA = "/v3/";           // the shared media library (content.json paths are relative to it)
const FORMAT = "finetune-portfolio/2";
const DRAFT_KEY = "portfolio-update:draft";
const DIRTY_KEY = "portfolio-update:dirty";
const WRITE = { "x-portfolio-update": "1" };
const COVER_RATIO = 16 / 10;     // the case cards in v4
const PRACTICE_RATIO = 4 / 3;    // the lens in Fields of practice

/* ───────────── helpers ───────────── */
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value" || k === "checked") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const slug = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const pad = (n) => String(n).padStart(2, "0");
const isVideo = (p) => /\.(mp4|webm|mov)(\?|$)/i.test(p || "");
const T = (o, k) => { if (!o[k] || typeof o[k] !== "object") o[k] = { en: typeof o[k] === "string" ? o[k] : "", pt: "" }; return o[k]; };
const tv = (v, l = "en") => (v == null ? "" : typeof v === "string" ? v : v[l] || v.en || "");
const bust = new Map();
const url = (p) => (/^https?:/.test(p) ? p : MEDIA + p + (bust.has(p) ? "?v=" + bust.get(p) : ""));

function embedOf(u) {
  u = (u || "").trim(); if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`, what: "YouTube" };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/);
  if (m) { const hs = m[2] || (u.match(/[?&]h=([\da-f]+)/) || [])[1]; return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}?dnt=1${hs ? "&h=" + hs : ""}`, what: "Vimeo" }; }
  if (isVideo(u)) return { kind: "video", src: /^https?:/.test(u) ? u : url(u.replace(/^\.?\//, "")), what: "arquivo de vídeo" };
  if (/^https:\/\//.test(u)) return { kind: "iframe", src: u, what: "página incorporada (iframe)" };
  return null;
}

/* ───────────── toasts ───────────── */
function toast(msg, kind = "", ms = 4200) {
  const el = h("div", { class: "toast " + kind }, msg);
  $("#toasts").append(el);
  const kill = () => el.remove();
  if (ms) setTimeout(kill, ms);
  return { set: (m) => (el.textContent = m), done: (m, k = "") => { el.textContent = m; el.className = "toast " + k; setTimeout(kill, 3800); } };
}

/* ───────────── state ───────────── */
const E = { data: null, sel: { type: "job", id: null }, lang: "en", dirty: false, server: false, platform: "" };
const jobs = () => E.data.jobs;
const curJob = () => jobs().find((j) => j.id === E.sel.id);

function blankJob(id) {
  return { id, title: "", client: "", year: String(new Date().getFullYear()), disciplines: "", tint: "#8fd8ff", context: { en: "", pt: "" },
    categories: [], tools: [], cover: "", video: "", gallery: [], challenge: { en: "", pt: "" }, idea: { en: "", pt: "" }, execution: { en: "", pt: "" }, outcome: { en: "", pt: "" },
    role: "", tier: "archive", breakdown: "", link: { label: { en: "View project", pt: "Ver projeto" }, url: "" } };
}
function blankContent() {
  const t = () => ({ en: "", pt: "" });
  return { format: FORMAT, media: "../v3/", updated: "",
    positioning: { specialty: t(), line: t(), secondary: t(), facts: t(), loop: "", poster: "" },
    reels: [{ id: "main", kind: "main", name: t(), video: "", poster: "", duration: "", note: "" }], primaryReel: "main", skills: [], profiles: [], hero: { eyebrow: t(), lead: t() }, gate: Array.from({ length: 8 }, () => ({ name: "", media: "" })),
    categories: [], tools: [], jobs: [], practices: Array.from({ length: 4 }, (_, i) => ({ title: t(), keys: t(), text: t(), image: "", tint: "#8fd8ff", jobs: [] })),
    process: Array.from({ length: 5 }, () => ({ name: t(), keys: t(), text: t(), era: { year: "", title: t(), where: t() } })),
    about: { name: "", role: t(), bio: t(), availability: t(), facts: [0, 1, 2].map(() => ({ label: t(), value: t() })), email: "", linkedin: "", behance: "", portrait: "" } };
}
function uniqueId(base, except) {
  let id = slug(base) || "job", n = 2;
  const taken = (x) => jobs().some((j) => j !== except && j.id === x);
  while (taken(id)) id = `${slug(base) || "job"}-${n++}`;
  return id;
}
/** translatable fields where EN is filled and PT is empty */
function ptMissing(j) {
  return ["context", "challenge", "idea", "execution", "outcome"].filter((k) => j[k] && j[k].en && !j[k].pt).length + (j.link?.label?.en && !j.link.label.pt ? 1 : 0);
}

const cats = () => E.data.categories;
const toolsReg = () => E.data.tools;
const catName = (id) => { const c = cats().find((x) => x.id === id); return c ? tv(c.name) : id; };
/** tool icon tinted like the site (CSS mask), or its monogram */
function toolIcon(t) {
  return t.icon ? h("span", { class: "ticon", style: { "--icon": `url("${url(t.icon)}")` } }) : h("span", { class: "ticon ticon--mono" }, t.mono || (t.label || "?").slice(0, 2));
}
function uniqueCatId(base, except) { let id = slug(base) || "categoria", n = 2; while (cats().some((c) => c !== except && c.id === id)) id = `${slug(base) || "categoria"}-${n++}`; return id; }
function uniqueToolId(base, except) { let id = slug(base) || "ferramenta", n = 2; while (toolsReg().some((t) => t !== except && t.id === id)) id = `${slug(base) || "ferramenta"}-${n++}`; return id; }

/* ───────────── change tracking, draft + preview ───────────── */
const writeDraft = debounce(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(E.data)); localStorage.setItem(DIRTY_KEY, E.dirty ? "1" : "0"); } catch { /* storage full / blocked */ } }, 250);
const autoPreview = debounce(() => { if ($("#autoPv").checked) reloadPreview(); }, 1400);
const navLater = debounce(() => renderNav(), 180);
function changed({ nav = true } = {}) {
  E.dirty = true; renderState(); writeDraft(); autoPreview();
  if (nav) navLater();
}
function renderState() {
  const st = $("#saveState");
  st.textContent = E.dirty ? "● alterações não salvas" : E.savedAt ? "salvo " + E.savedAt : "—";
  st.classList.toggle("dirty", E.dirty);
}

/* ───────────── server ───────────── */
async function api(path, opts = {}) {
  const r = await fetch(API + path, opts);
  let j = {}; try { j = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
async function save() {
  if (!E.server) { toast("Sem servidor local: abra o editor pelo portfolio-update.bat.", "err"); return false; }
  E.data.updated = new Date().toISOString();
  try {
    await api("/content", { method: "PUT", headers: { ...WRITE, "content-type": "application/json" }, body: JSON.stringify(E.data) });
    E.dirty = false; E.savedAt = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    renderState(); writeDraft(); toast("Salvo em public/v4/content.json", "ok");
    return true;
  } catch (e) { toast("Não salvou: " + e.message, "err", 8000); return false; }
}
async function publish() {
  if (E.dirty && !(await save())) return;
  if (E.platform && E.platform !== "win32") { toast("A publicação usa o publish.bat (Windows).", "warn"); return; }
  try { await api("/publish", { method: "POST", headers: WRITE }); toast("Janela do publish.bat aberta. Em 1–2 min o site online atualiza.", "ok", 9000); }
  catch (e) { toast("Não abriu o publish.bat: " + e.message, "err", 8000); }
}

/* ───────────── media import ───────────── */
async function prepare(file, { maxW = 2000, ratio = 0 } = {}) {
  if (isVideo(file.name) || /^video\//.test(file.type)) {
    if (file.size > 6e6) toast(`${file.name}: ${(file.size / 1e6).toFixed(0)} MB — será comprimido para a web ao importar (pode levar alguns segundos).`, "busy", 6000);
    return { blob: file, name: file.name };
  }
  if (/gif|svg/i.test(file.type) || /\.(gif|svg)$/i.test(file.name)) return { blob: file, name: file.name };
  const bmp = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (ratio) { if (sw / sh > ratio) { sw = Math.round(sh * ratio); sx = Math.round((bmp.width - sw) / 2); } else { sh = Math.round(sw / ratio); sy = Math.round((bmp.height - sh) / 2); } }
  const s = Math.min(1, maxW / sw), w = Math.round(sw * s), hh = Math.round(sh * s);
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high"; ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, hh); bmp.close?.();
  const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.86));
  return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".webp" };
}
async function importFiles(files, { dir, maxW = 2000, ratio = 0, videos = true, quiet = false } = {}) {
  const list = [...files]
    .filter((f) => /\.(png|jpe?g|webp|avif|gif|svg|bmp)$/i.test(f.name) || /^image\//.test(f.type) || (videos && isVideo(f.name)))
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true }));
  if (!list.length) { toast("Nenhuma imagem" + (videos ? " ou vídeo" : "") + " encontrada.", "warn"); return []; }
  if (!E.server) { toast("Sem servidor local: abra o editor pelo portfolio-update.bat.", "err"); return []; }
  const out = [], t = quiet ? { set() {}, done() {} } : toast(`Importando 0/${list.length}…`, "busy", 0);
  for (const [i, f] of list.entries()) {
    t.set(`Importando ${i + 1}/${list.length} — ${f.name}`);
    try {
      const { blob, name } = await prepare(f, { maxW, ratio });
      const j = await api(`/upload?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(name)}`, { method: "POST", headers: WRITE, body: blob });
      bust.set(j.path, Date.now()); out.push(j.path);
    } catch (e) { toast(`${f.name}: ${e.message}`, "err", 8000); }
  }
  t.done(`${out.length} arquivo(s) em v3/${dir}/`, out.length ? "ok" : "err");
  return out;
}
/** file picker → File[] ("folder" picks a whole folder) */
function pick({ accept = "image/*", multiple = false, folder = false } = {}) {
  return new Promise((resolve) => {
    const inp = h("input", { type: "file", accept: folder ? null : accept, multiple: multiple || folder, style: { display: "none" } });
    if (folder) inp.webkitdirectory = true;
    inp.addEventListener("change", () => { resolve([...inp.files]); inp.remove(); });
    inp.addEventListener("cancel", () => { resolve([]); inp.remove(); });
    document.body.append(inp); inp.click();
  });
}
/** files + folders dropped on an element */
async function droppedFiles(dt) {
  const items = [...(dt.items || [])].map((it) => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  if (!items.length) return [...dt.files];
  const out = [];
  const walk = (entry, prefix) => new Promise((res) => {
    if (entry.isFile) entry.file((f) => { try { Object.defineProperty(f, "webkitRelativePath", { value: prefix + f.name }); } catch { /* read-only */ } out.push(f); res(); }, () => res());
    else if (entry.isDirectory) {
      const r = entry.createReader(), all = [];
      const read = () => r.readEntries(async (batch) => { if (!batch.length) { for (const e of all) await walk(e, prefix + entry.name + "/"); res(); } else { all.push(...batch); read(); } }, () => res());
      read();
    } else res();
  });
  for (const e of items) await walk(e, "");
  return out;
}
function dropzone(el, onFiles) {
  const has = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  el.addEventListener("dragover", (e) => { if (!has(e)) return; e.preventDefault(); el.classList.add("over"); });
  el.addEventListener("dragleave", (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove("over"); });
  el.addEventListener("drop", async (e) => { if (!has(e)) return; e.preventDefault(); el.classList.remove("over"); onFiles(await droppedFiles(e.dataTransfer)); });
}
function thumb(p, { autoplay = true } = {}) {
  if (!p) return null;
  if (/^https?:/.test(p) && !/\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(p)) return h("div", { class: "thumb-link" }, "▶ " + (/adobe\.io$/.test(new URL(p).hostname) ? "Adobe vídeo" : new URL(p).hostname.replace(/^www\./, "")));
  return isVideo(p) ? h("video", { src: url(p) + "#t=0.4", muted: true, loop: true, playsinline: true, preload: "metadata", autoplay: autoplay || null }) : h("img", { src: url(p), alt: "", loading: "lazy", decoding: "async" });
}

/* ───────────── library ───────────── */
async function library({ multi = false, videos = true, title = "Biblioteca de mídia" } = {}) {
  let files = [];
  try { files = (await api("/files")).files.filter((f) => videos || !isVideo(f.path)); } catch (e) { toast("Biblioteca indisponível: " + e.message, "err"); return []; }
  return new Promise((resolve) => {
    const sel = new Set();
    const q = h("input", { class: "in", placeholder: "Filtrar por nome ou pasta…", style: { maxWidth: "280px" } });
    const body = h("div", { class: "modal__b" });
    const use = h("button", { class: "btn", type: "button", disabled: true, onclick: () => close([...sel]) }, "Usar");
    const close = (val) => { m.remove(); removeEventListener("keydown", esc); resolve(val); };
    const esc = (e) => { if (e.key === "Escape") close([]); };
    const draw = () => {
      const f = q.value.trim().toLowerCase(), groups = new Map();
      files.filter((x) => !f || x.path.toLowerCase().includes(f)).forEach((x) => { const g = x.path.split("/").slice(0, -1).join("/"); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
      body.replaceChildren(...[...groups].flatMap(([g, list]) => [h("p", { class: "lib__grp" }, g + "/"),
        h("div", { class: "lib" }, list.map((x) => h("button", { type: "button", class: sel.has(x.path) ? "sel" : "", title: x.path,
          onclick: () => { if (!multi) return close([x.path]); sel.has(x.path) ? sel.delete(x.path) : sel.add(x.path); use.disabled = !sel.size; use.textContent = `Usar (${sel.size})`; draw(); } },
          thumb(x.path, { autoplay: false }), h("span", {}, x.path.split("/").pop()))))]));
      if (!groups.size) body.append(h("p", { class: "f__h" }, "Nada encontrado."));
    };
    q.addEventListener("input", draw);
    const m = h("div", { class: "modal", onclick: (e) => { if (e.target === m) close([]); } },
      h("div", { class: "modal__in" },
        h("div", { class: "modal__h" }, h("b", {}, title), q, h("button", { class: "mini", type: "button", onclick: () => close([]) }, "Fechar")),
        body, multi && h("div", { class: "modal__f" }, h("button", { class: "btn btn--ghost", type: "button", onclick: () => close([]) }, "Cancelar"), use)));
    document.body.append(m); addEventListener("keydown", esc); draw(); q.focus();
  });
}

/* ───────────── field components ───────────── */
function autoGrow(el) { const fit = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }; el.addEventListener("input", fit); requestAnimationFrame(fit); }
const field = (label, input, hint, cls = "") => h("label", { class: "f " + cls }, h("span", { class: "f__l" }, label), input, hint && h("small", { class: "f__h" }, hint));
const sec = (n, title, note, ...body) => h("section", { class: "sec" }, h("header", { class: "sec__h" }, h("i", {}, n), h("b", {}, title), note && h("small", {}, note)), h("div", { class: "sec__b" }, body));

function txt(obj, key, { multi = false, rows = 3, ph = "", onInput, nav = true } = {}) {
  const el = h(multi ? "textarea" : "input", { class: "in", placeholder: ph, rows: multi ? rows : null, spellcheck: "true" });
  el.value = obj[key] ?? "";
  el.addEventListener("input", () => { obj[key] = el.value; onInput?.(el.value); changed({ nav }); });
  if (multi) autoGrow(el);
  return el;
}
/** translatable text: shows the language picked in the top bar; the other one is the placeholder */
function tr(obj, key, { multi = false, rows = 3, ph = "" } = {}) {
  const v = T(obj, key), L = E.lang, O = L === "en" ? "pt" : "en";
  const el = h(multi ? "textarea" : "input", { class: "in", rows: multi ? rows : null, spellcheck: "true", lang: L === "pt" ? "pt-BR" : "en",
    placeholder: v[O] ? `${O.toUpperCase()}: ${v[O]}` : ph });
  el.value = v[L] || "";
  const tag = h("span", { class: "tr__tag" + (!v[L] && v[O] ? " miss" : ""), title: !v[L] && v[O] ? `Falta a versão ${L.toUpperCase()}` : "" }, L.toUpperCase());
  el.addEventListener("input", () => { v[L] = el.value; tag.classList.toggle("miss", !el.value && !!v[O]); changed(); });
  if (multi) autoGrow(el);
  return h("div", { class: "tr" }, el, tag);
}
function color(obj, key) {
  const hex = h("input", { class: "in", value: obj[key] || "#8fd8ff", maxlength: "7" });
  const pickEl = h("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(obj[key]) ? obj[key] : "#8fd8ff" });
  pickEl.addEventListener("input", () => { obj[key] = hex.value = pickEl.value; changed(); });
  hex.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { obj[key] = pickEl.value = hex.value.toLowerCase(); changed(); } });
  return h("div", { class: "color" }, pickEl, hex);
}
/** single image (or video) slot: drop, import, library, remove */
function media(obj, key, { dir, maxW = 1600, ratio = 0, videos = false, aspect = "16/10", empty = "Arraste uma imagem aqui" } = {}) {
  const box = h("div", { class: "media" });
  const set = (p) => { obj[key] = p; changed(); draw(); };
  const go = async (files) => { const [p] = await importFiles(files.slice(0, 1), { dir: dir(), maxW, ratio, videos }); if (p) set(p); };
  const draw = () => {
    const p = obj[key];
    const drop = h("div", { class: "drop" + (p ? " has" : ""), style: { aspectRatio: aspect }, title: "Clique ou arraste um arquivo",
      onclick: () => pick({ accept: videos ? "image/*,video/mp4,video/webm" : "image/*" }).then((f) => f.length && go(f)) },
      p ? thumb(p) : h("span", { class: "drop__empty" }, h("b", {}, "+ Importar"), empty, videos ? " (imagem ou vídeo)" : ""));
    dropzone(drop, go);
    box.replaceChildren(drop, h("div", { class: "media__bar" },
      h("span", { class: "media__path", title: p || "" }, p ? "v3/" + p : "sem arquivo"),
      h("button", { class: "mini", type: "button", onclick: () => library({ videos }).then((ps) => ps[0] && set(ps[0])) }, "Biblioteca"),
      p && h("button", { class: "mini", type: "button", onclick: () => set("") }, "Remover")));
  };
  draw(); return box;
}
function gallery(j) {
  if (!Array.isArray(j.gallery)) j.gallery = [];
  const grid = h("div", { class: "gal" });
  let from = -1;
  const add = (ps) => { if (!ps.length) return; j.gallery.push(...ps.filter((p) => !j.gallery.includes(p))); changed(); draw(); };
  const imp = async (files) => add(await importFiles(files, { dir: `media/${j.id}`, maxW: 2400 }));
  const draw = () => {
    grid.replaceChildren(...j.gallery.map((p, i) => {
      const it = h("figure", { class: "gal__it", draggable: "true", title: "Arraste para reordenar" }, thumb(p, { autoplay: false }),
        h("figcaption", {}, `${pad(i + 1)} · ${p.split("/").pop()}`),
        h("button", { class: "gal__x", type: "button", title: "Tirar da galeria", onclick: (e) => { e.stopPropagation(); j.gallery.splice(i, 1); changed(); draw(); } }, "×"));
      it.addEventListener("dragstart", (e) => { from = i; e.dataTransfer.setData("text/x-gal", String(i)); e.dataTransfer.effectAllowed = "move"; });
      it.addEventListener("dragover", (e) => { if (from < 0) return; e.preventDefault(); it.classList.add("drag-over"); });
      it.addEventListener("dragleave", () => it.classList.remove("drag-over"));
      it.addEventListener("drop", (e) => { if (from < 0) return; e.preventDefault(); const [x] = j.gallery.splice(from, 1); j.gallery.splice(i, 0, x); from = -1; changed(); draw(); });
      it.addEventListener("dragend", () => { from = -1; });
      return it;
    }), h("div", { class: "gal__add" }, j.gallery.length ? "+ arraste mais imagens ou uma pasta" : "Arraste imagens, vídeos ou uma pasta inteira aqui"));
  };
  dropzone(grid, imp);
  draw();
  return h("div", { class: "media" },
    h("div", { class: "row" },
      h("button", { class: "mini", type: "button", onclick: () => pick({ accept: "image/*,video/mp4,video/webm", multiple: true }).then(imp) }, "Importar imagens"),
      h("button", { class: "mini", type: "button", onclick: () => pick({ folder: true }).then(imp) }, "Importar pasta inteira"),
      h("button", { class: "mini", type: "button", onclick: () => library({ multi: true, title: "Adicionar à galeria" }).then(add) }, "Da biblioteca"),
      h("small", { class: "f__h" }, "Imagens são convertidas para WebP (até 2400 px) em v3/media/" + j.id + "/")),
    grid);
}
/** video slot: YouTube / Vimeo / https link, or an imported .mp4 / .webm (obj[key]) */
function videoField(obj, key, { dir, empty = "Sem vídeo." } = {}) {
  const out = h("div", { class: "vid__pv" }), st = h("small", { class: "f__h" });
  const inp = h("input", { class: "in", value: obj[key] || "", placeholder: "https://youtu.be/…   ·   https://vimeo.com/…   ·   ou importe um .mp4 / .webm" });
  const bar = h("div", { class: "row" });
  const draw = () => {
    const e = embedOf(obj[key]);
    st.replaceChildren(!obj[key] ? empty : e ? h("span", { class: "ok" }, "✓ " + e.what) : h("span", { class: "warn" }, "Link não reconhecido — use YouTube, Vimeo, um https:// ou um arquivo importado."));
    out.replaceChildren(...(e ? [e.kind === "iframe" ? h("iframe", { src: e.src, allow: "fullscreen; picture-in-picture; encrypted-media", allowfullscreen: true, loading: "lazy", title: "Vídeo" }) : h("video", { src: e.src, controls: true, playsinline: true, preload: "metadata" })] : []));
    bar.replaceChildren(st,
      h("button", { class: "mini", type: "button", onclick: async () => { const f = await pick({ accept: "video/mp4,video/webm" }); if (!f.length) return; const [p] = await importFiles(f, { dir: dir() }); if (p) { inp.value = obj[key] = p; changed(); draw(); } } }, "Importar arquivo de vídeo"),
      obj[key] && h("button", { class: "mini", type: "button", onclick: () => { inp.value = obj[key] = ""; changed(); draw(); } }, "Remover"));
  };
  const commit = debounce(() => { obj[key] = inp.value.trim(); changed(); draw(); }, 500);
  inp.addEventListener("input", commit);
  draw();
  return h("div", { class: "vid" }, inp, bar, out);
}
const video = (j) => videoField(j, "video", { dir: () => `media/${j.id}`, empty: "Sem vídeo: o case abre na capa." });

/* ───────────── v4 specialist pages (./specialist.js) ───────────── */
const SP = createSpecialist({ E, h, field, sec, tr, txt, color, media, videoField, toolPicker: (o) => toolPicker(o), select: (s) => select(s), changed, renderMain: () => renderMain(),
  tv, pad, url, isVideo, toast, slug });

/* ───────────── nav ───────────── */
const PAGES = [
  { type: "guide", i: "00", t: "Diretrizes", sub: "Checklist de especialista" },
  { type: "positioning", i: "01", t: "Posicionamento", sub: "Especialidade, frase e hero" },
  { type: "reels", i: "02", t: "Reels", sub: "Principal, versões e breakdown" },
  { type: "organize", i: "03", t: "Organizar", sub: "Cases principais · apoio · lab · arquivo" },
  { type: "skills", i: "04", t: "Skills (knob)", sub: "Estações do knob e suas provas" },
  { type: "profiles", i: "05", t: "Versões por vaga", sub: "Links ?for= por candidatura" },
  { type: "categories", i: "06", t: "Categorias", sub: "Filtros do índice" },
  { type: "about", i: "07", t: "Sobre & Contato", sub: "Cartão, foto e links" },
  { type: "tools", i: "08", t: "Ferramentas", sub: "Ícones disponíveis para os jobs" },
  { type: "import", i: "09", t: "Importar", sub: "Trazer jobs do Adobe Portfolio" },
];
const TIER_TAG = { flagship: "principal", featured: "apoio", lab: "lab" };
function select(sel) { E.sel = sel; renderNav(); renderMain(); reloadPreview(); $("#form").scrollTop = 0; }
function renderNav() {
  let from = -1;
  $("#jobs").replaceChildren(...jobs().map((j, i) => {
    const miss = ptMissing(j), b = h("button", { type: "button", class: "navit" + (E.sel.type === "job" && E.sel.id === j.id ? " on" : ""), draggable: "true", onclick: () => select({ type: "job", id: j.id }) },
      h("span", { class: "navit__grip", "aria-hidden": "true" }, "⋮⋮"),
      h("span", { class: "navit__th", style: { backgroundImage: j.cover && !isVideo(j.cover) ? `url("${url(j.cover)}")` : "none" } }),
      h("span", { class: "navit__t" }, h("b", {}, j.title || "Sem título"), h("small", {}, `${pad(i + 1)} · ${(j.categories || []).map(catName).join(" + ") || "sem categoria"}`)),
      h("span", { class: "navit__f" }, j.hidden && h("span", { class: "flag", title: "Oculto: não aparece no site" }, "oculto"), !j.hidden && TIER_TAG[j.tier] && h("span", { class: "flag flag--" + j.tier, title: "Posição no portfólio" }, TIER_TAG[j.tier]), !j.cover && h("span", { class: "flag", title: "Sem capa" }, "capa"), miss > 0 && h("span", { class: "flag", title: `${miss} texto(s) sem versão PT` }, "PT " + miss)));
    b.addEventListener("dragstart", (e) => { from = i; b.classList.add("dragging"); e.dataTransfer.setData("text/x-job", j.id); e.dataTransfer.effectAllowed = "move"; });
    b.addEventListener("dragend", () => { from = -1; b.classList.remove("dragging"); });
    b.addEventListener("dragover", (e) => { if (from < 0) return; e.preventDefault(); b.classList.add("drag-over"); });
    b.addEventListener("dragleave", () => b.classList.remove("drag-over"));
    b.addEventListener("drop", (e) => { if (from < 0 || from === i) return; e.preventDefault(); const [x] = jobs().splice(from, 1); jobs().splice(i, 0, x); from = -1; changed(); renderNav(); if (E.sel.type === "job") renderMain(); });
    return h("li", {}, b);
  }));
  $("#pages").replaceChildren(...PAGES.map((p) => h("li", {}, h("button", { type: "button", class: "navit" + (E.sel.type === p.type ? " on" : ""), onclick: () => select({ type: p.type }) },
    h("i", {}, p.i), h("span", { class: "navit__t" }, h("b", {}, p.t), h("small", {}, p.sub))))));
}

/* ───────────── forms ───────────── */
function jobForm(j) {
  const i = jobs().indexOf(j);
  let confirmDel = false;
  const idIn = h("input", { class: "in", value: j.id, spellcheck: "false" });
  idIn.addEventListener("change", () => {
    const old = j.id, nid = uniqueId(idIn.value, j); idIn.value = nid; if (nid === old) return;
    j.id = nid; E.sel.id = nid; E.data.practices.forEach((p) => { p.jobs = (p.jobs || []).map((x) => (x === old ? nid : x)); });
    E.data.skills.forEach((s) => { s.jobs = (s.jobs || []).map((x) => (x === old ? nid : x)); }); E.data.profiles.forEach((p) => { p.flagships = (p.flagships || []).map((x) => (x === old ? nid : x)); }); changed();
    toast(`ID alterado para "${nid}". Mídias já importadas continuam em media/${old}/.`, "warn", 7000);
  });
  const syncTitle = (v) => { $("#barTitle").textContent = v || "Sem título"; head.querySelector("h1").textContent = v || "Sem título"; if (/^novo-job/.test(j.id) && v.trim()) { j.id = idIn.value = E.sel.id = uniqueId(v, j); } };
  const del = h("button", { class: "mini warn", type: "button", onclick: () => {
    if (!confirmDel) { confirmDel = true; del.textContent = "Clique de novo para excluir"; setTimeout(() => { confirmDel = false; del.textContent = "Excluir"; }, 3500); return; }
    jobs().splice(i, 1); E.data.practices.forEach((p) => { p.jobs = (p.jobs || []).filter((x) => x !== j.id); });
    E.data.skills.forEach((s) => { s.jobs = (s.jobs || []).filter((x) => x !== j.id); }); E.data.profiles.forEach((p) => { p.flagships = (p.flagships || []).filter((x) => x !== j.id); }); changed();
    toast(`"${j.title || j.id}" removido do site. Os arquivos de mídia continuam na pasta.`, "warn");
    select(jobs()[Math.min(i, jobs().length - 1)] ? { type: "job", id: jobs()[Math.min(i, jobs().length - 1)].id } : { type: "guide" });
  } }, "Excluir");
  const head = h("div", { class: "head" },
    h("span", { class: "head__th", style: { backgroundImage: j.cover && !isVideo(j.cover) ? `url("${url(j.cover)}")` : "none" } }),
    h("div", { class: "head__t" }, h("small", {}, `Job ${pad(i + 1)} de ${pad(jobs().length)}`), h("h1", {}, j.title || "Sem título")),
    h("div", { class: "row" },
      h("button", { class: "mini", type: "button", onclick: () => { const c = structuredClone(j); c.id = uniqueId(j.id + "-copia"); c.title = (j.title || "") + " (cópia)"; jobs().splice(i + 1, 0, c); changed(); select({ type: "job", id: c.id }); } }, "Duplicar"),
      del));
  const lab = { challenge: "Desafio", idea: "Ideia", execution: "Execução", outcome: "Resultado" };
  return [head, SP.jobPosition(j),
    sec("01", "Identificação", "aparece nos cards e no topo do case",
      h("div", { class: "grid2" },
        field("Título", txt(j, "title", { onInput: syncTitle })),
        field("ID / pasta", idIn, "Usado em v3/media/<id>/ e no link ?case=<id>."),
        field("Cliente", txt(j, "client", { ph: "HBO Max" })),
        field("Ano", txt(j, "year", { ph: "2025" })),
        field("Disciplinas", txt(j, "disciplines", { ph: "VFX · 3D · Compositing" }), "Separe com ·"),
        field("Cor da luz", color(j, "tint"), "Tinge a galáxia quando o card está em foco."),
        field("Contexto — uma linha", tr(j, "context", { multi: true, rows: 2 }), null, "full"),
        h("div", { class: "f full" }, h("span", { class: "f__l" }, "Categorias"),
          h("div", { class: "chips" }, cats().map((c) => {
            const cb = h("input", { type: "checkbox", checked: (j.categories || []).includes(c.id) });
            cb.addEventListener("change", () => { j.categories = (j.categories || []).filter((x) => x !== c.id); if (cb.checked) j.categories.push(c.id); changed(); });
            return h("label", { class: "chk" }, cb, tv(c.name) || c.id);
          }), h("button", { class: "mini", type: "button", onclick: () => select({ type: "categories" }) }, "Gerenciar categorias")),
          h("small", { class: "f__h" }, "Filtros do índice (Index). Um job pode estar em mais de uma.")),
        h("label", { class: "chk full" }, (() => { const cb = h("input", { type: "checkbox", checked: !j.hidden }); cb.addEventListener("change", () => { if (cb.checked) delete j.hidden; else j.hidden = true; changed(); }); return cb; })(), "Visível no site"))),
    sec("02", "Capa", "o card do job (16 : 10; o case principal grande usa 16 : 9)",
      media(j, "cover", { dir: () => `media/${j.id}`, maxW: 1920, ratio: COVER_RATIO, videos: true, aspect: "16/10", empty: "Imagem é recortada em 16 : 10. Vídeo: WebM/MP4 1280–1920 px, 4–8 s em loop, sem áudio, até ~4 MB — toca no card." })),
    sec("03", "Vídeo", "o primeiro item do case", video(j)),
    sec("04", "Galeria", "imagens e vídeos do case, na ordem abaixo", gallery(j)),
    sec("05", "Case", "Desafio → Ideia → Execução → Resultado",
      h("div", { class: "grid2" },
        ...Object.entries(lab).map(([k, l]) => field(l, tr(j, k, { multi: true, rows: 3 }))))),
    sec("06", "Ferramentas", "ícones no slide e no case", toolPicker(j)),
    sec("07", "Link externo", "botão no final do case",
      h("div", { class: "grid2" },
        field("Texto do botão", tr(j.link || (j.link = { label: { en: "", pt: "" }, url: "" }), "label", { ph: "View on Behance" })),
        field("URL", h("div", { class: "row", style: { flexWrap: "nowrap" } }, txt(j.link, "url", { ph: "https://www.behance.net/gallery/…" }),
          h("button", { class: "mini", type: "button", onclick: () => j.link.url && window.open(j.link.url, "_blank", "noopener") }, "Testar ↗")),
          "Behance, Vimeo, site do cliente… Deixe vazio para esconder o botão."))),
  ];
}

function toolPicker(j) {
  if (!Array.isArray(j.tools)) j.tools = [];
  const box = h("div", { class: "tpick" });
  const draw = () => {
    const chosen = j.tools.map((id) => toolsReg().find((t) => t.id === id)).filter(Boolean);
    box.replaceChildren(
      h("div", { class: "tpick__sel" }, chosen.length ? chosen.map((t) => h("span", { class: "tchip on" }, toolIcon(t), t.label)) : h("small", { class: "f__h" }, "Nenhuma ferramenta marcada.")),
      h("div", { class: "tpick__all" }, toolsReg().map((t) => h("button", { type: "button", class: "tchip" + (j.tools.includes(t.id) ? " on" : ""), title: t.label,
        onclick: () => { j.tools = j.tools.includes(t.id) ? j.tools.filter((x) => x !== t.id) : [...j.tools, t.id]; changed(); draw(); } }, toolIcon(t), t.label))),
      h("div", { class: "row" }, h("small", { class: "f__h" }, "A ordem segue a ordem dos cliques. Falta alguma?"), h("button", { class: "mini", type: "button", onclick: () => select({ type: "tools" }) }, "Gerenciar ferramentas")));
  };
  draw(); return box;
}
function categoriesForm() {
  const list = cats();
  const move = (i, d) => { const k = i + d; if (k < 0 || k >= list.length) return; [list[i], list[k]] = [list[k], list[i]]; changed(); renderMain(); };
  return [h("p", { class: "intro" }, "Na v4 as categorias são os filtros do índice (Index). Principais aparecem primeiro; secundárias ficam com borda tracejada. Categorias sem jobs visíveis somem do site."),
    h("div", { class: "row", style: { marginBottom: "14px" } }, h("button", { class: "btn", type: "button", onclick: () => {
      list.push({ id: uniqueCatId("nova-categoria"), name: { en: "", pt: "" }, text: { en: "", pt: "" }, cover: "", tint: "#8fd8ff" }); changed(); renderMain();
      setTimeout(() => { const f = $("#form"); f.scrollTop = f.scrollHeight; }, 30); } }, "+ Nova categoria")),
    ...list.map((c, i) => {
      const members = jobs().filter((j) => (j.categories || []).includes(c.id));
      let armed = false;
      const del = h("button", { class: "mini warn", type: "button", onclick: () => {
        if (!armed) { armed = true; del.textContent = "Clique de novo"; setTimeout(() => { armed = false; del.textContent = "Excluir"; }, 3000); return; }
        list.splice(i, 1); jobs().forEach((j) => { j.categories = (j.categories || []).filter((x) => x !== c.id); }); changed(); renderMain(); } }, "Excluir");
      const idIn = h("input", { class: "in", value: c.id, spellcheck: "false" });
      idIn.addEventListener("change", () => { const old = c.id, nid = uniqueCatId(idIn.value, c); idIn.value = nid; if (nid === old) return; c.id = nid; jobs().forEach((j) => { j.categories = (j.categories || []).map((x) => (x === old ? nid : x)); }); changed(); });
      return h("section", { class: "sec" },
        h("header", { class: "sec__h" }, h("i", {}, pad(i + 1)), h("b", {}, tv(c.name) || "Nova categoria"), h("small", {}, `${members.length} job(s)`),
          h("button", { class: "mini", type: "button", title: "Subir", onclick: () => move(i, -1) }, "↑"), h("button", { class: "mini", type: "button", title: "Descer", onclick: () => move(i, 1) }, "↓"), del),
        h("div", { class: "sec__b" },
          h("div", { class: "grid2" },
            h("div", { class: "f", style: { alignContent: "start", gap: "12px" } },
              field("Nome", tr(c, "name", { ph: "Motion Design" })),
              field("Frase", tr(c, "text", { multi: true, rows: 2 })),
              h("div", { class: "grid2" }, field("ID", idIn), field("Cor da luz", color(c, "tint"))),
              h("div", { class: "f" }, h("span", { class: "f__l" }, "Peso"), (() => { const b = h("div", { class: "seg seg--pick" }); const draw = () => b.replaceChildren(...[["primary", "Principal"], ["secondary", "Secundária"]].map(([v, l]) => h("button", { type: "button", class: (c.tier || "secondary") === v ? "on" : "", onclick: () => { c.tier = v; changed(); draw(); } }, l))); draw(); return b; })())),
            field("Capa da categoria", media(c, "cover", { dir: () => "media/categories", maxW: 1600, ratio: COVER_RATIO, videos: true, aspect: "404/316", empty: "Vazia: usa a capa do primeiro job. Aceita WebM animado (1280×1000, loop curto, sem áudio)." }))),
          h("div", { class: "f" }, h("span", { class: "f__l" }, "Jobs nesta categoria"),
            h("div", { class: "chips" }, jobs().map((j) => {
              const cb = h("input", { type: "checkbox", checked: (j.categories || []).includes(c.id) });
              cb.addEventListener("change", () => { j.categories = (j.categories || []).filter((x) => x !== c.id); if (cb.checked) j.categories.push(c.id); changed(); });
              return h("label", { class: "chk" }, cb, j.title || j.id);
            })),
            h("small", { class: "f__h" }, "A ordem dos slides segue a ordem da lista de jobs (arraste na barra lateral)."))));
    })];
}
function toolsForm() {
  const list = toolsReg();
  return [h("p", { class: "intro" }, "Biblioteca de ferramentas que aparecem como ícones nos jobs. Sem ícone, o site mostra o monograma (como no portfólio anterior). Ícones de uma cor só (SVG ou PNG transparente) ficam melhores: o site os pinta na cor da interface."),
    h("div", { class: "row", style: { marginBottom: "14px" } }, h("button", { class: "btn", type: "button", onclick: () => {
      list.push({ id: uniqueToolId("nova-ferramenta"), label: "", mono: "", icon: "" }); changed(); renderMain(); setTimeout(() => { const f = $("#form"); f.scrollTop = f.scrollHeight; }, 30); } }, "+ Nova ferramenta")),
    h("div", { class: "tgrid" }, list.map((t, i) => {
      const used = jobs().filter((j) => (j.tools || []).includes(t.id)).length;
      const prev = h("span", { class: "tgrid__pv" }, toolIcon(t));
      const redraw = () => prev.replaceChildren(toolIcon(t));
      let armed = false;
      const del = h("button", { class: "mini warn", type: "button", onclick: () => {
        if (!armed) { armed = true; del.textContent = "Confirmar"; setTimeout(() => { armed = false; del.textContent = "Excluir"; }, 3000); return; }
        list.splice(i, 1); jobs().forEach((j) => { j.tools = (j.tools || []).filter((x) => x !== t.id); }); changed(); renderMain(); } }, "Excluir");
      const icon = h("div", { class: "row" },
        h("button", { class: "mini", type: "button", onclick: async () => { const f = await pick({ accept: "image/svg+xml,image/png,image/webp" }); if (!f.length) return;
          const [p] = await importFiles(f, { dir: "tools", maxW: 256, videos: false }); if (p) { t.icon = p; changed(); redraw(); } } }, t.icon ? "Trocar ícone" : "Importar ícone"),
        h("button", { class: "mini", type: "button", onclick: () => { t.icon = ""; changed(); redraw(); } }, "Sem ícone"));
      return h("div", { class: "card" },
        h("div", { class: "card__h" }, prev, h("span", { style: { flex: "1" } }, t.label || "Nova ferramenta"), h("small", { class: "f__h" }, used ? `${used} job(s)` : ""), del),
        h("div", { class: "grid2" },
          field("Nome", txt(t, "label", { ph: "After Effects", onInput: (v) => { if (/^nova-ferramenta/.test(t.id) && v.trim()) t.id = uniqueToolId(v, t); } })),
          field("Monograma", txt(t, "mono", { ph: "Ae", onInput: redraw }))),
        icon);
    }))];
}
function heroForm() {
  const d = E.data;
  return [
    h("p", { class: "intro" }, "Textos da abertura e as prévias que aparecem no anel antes do clique. O título “Where ideas take form.” e a palavra mutável são fixos."),
    sec("01", "Hero", "texto sobre a galáxia",
      h("div", { class: "grid2" },
        field("Linha de cima (eyebrow)", tr(d.hero, "eyebrow")),
        field("Frase de apoio", tr(d.hero, "lead", { multi: true, rows: 2 })))),
    sec("02", "Gate — anel de foco", "8 posições, em sentido horário a partir do topo",
      h("div", { class: "grid3" }, d.gate.map((g, k) => h("div", { class: "card" },
        h("div", { class: "card__h" }, h("i", {}, pad(k + 1)), "Posição " + (k + 1)),
        field("Nome no anel", txt(g, "name", { ph: "Motion" })),
        media(g, "media", { dir: () => "media/gate", maxW: 1600, videos: true, aspect: "16/9", empty: "Prévia em baixa opacidade." }))))),
  ];
}
function practicesForm() {
  return [h("p", { class: "intro" }, "As quatro linhas de “Four disciplines. One system.” A imagem aparece na lente de vidro (recortada em 4 : 3)."),
    ...E.data.practices.map((p, k) => sec(pad(k + 1), tv(p.title) || "Prática " + (k + 1), null,
      h("div", { class: "grid2" },
        field("Nome", tr(p, "title")),
        field("Palavras-chave", tr(p, "keys", { ph: "Concept · Key visuals · Systems" })),
        field("Descrição", tr(p, "text", { multi: true, rows: 3 }), null, "full"),
        field("Imagem da lente", media(p, "image", { dir: () => "media/practice", maxW: 1600, ratio: PRACTICE_RATIO, aspect: "4/3" })),
        h("div", { class: "f" },
          field("Cor da luz", color(p, "tint")),
          h("span", { class: "f__l", style: { marginTop: "6px" } }, "Jobs relacionados"),
          h("div", { class: "chips" }, jobs().map((j) => {
            const cb = h("input", { type: "checkbox", checked: (p.jobs || []).includes(j.id) });
            cb.addEventListener("change", () => { p.jobs = (p.jobs || []).filter((x) => x !== j.id); if (cb.checked) p.jobs.push(j.id); changed(); });
            return h("label", { class: "chk" }, cb, j.title || j.id);
          })))))),
  ];
}
function processForm() {
  return [h("p", { class: "intro" }, "Cada fase do processo vem pareada com uma fase da carreira. O contador “years of practice” sobe junto com o scroll. Ano: “2012”, “2014–2018” ou “now”."),
    ...E.data.process.map((p, k) => sec(pad(k + 1), tv(p.name) || "Fase " + (k + 1), null,
      h("div", { class: "grid2" },
        field("Fase", tr(p, "name")),
        field("Palavras-chave", tr(p, "keys")),
        field("Texto", tr(p, "text", { multi: true, rows: 2 }), null, "full")),
      h("div", { class: "card" }, h("div", { class: "card__h" }, h("i", {}, "Carreira"), "Cartão da trajetória"),
        h("div", { class: "grid3" },
          field("Ano / período", txt(p.era || (p.era = { year: "", title: { en: "", pt: "" }, where: { en: "", pt: "" } }), "year", { ph: "2014–2018" })),
          field("Título", tr(p.era, "title")),
          field("Onde / detalhe", tr(p.era, "where"))))))];
}
function aboutForm() {
  const a = E.data.about;
  while (a.facts.length < 3) a.facts.push({ label: { en: "", pt: "" }, value: { en: "", pt: "" } });
  return [h("p", { class: "intro" }, "O cartão de assinatura no fim do site. O botão “Get in touch” usa o e-mail e dispara o buraco negro."),
    sec("01", "Cartão", null,
      h("div", { class: "grid2" },
        h("div", { class: "f" }, h("span", { class: "f__l" }, "Foto"), media(a, "portrait", { dir: () => "portrait", maxW: 1200, aspect: "4/5" })),
        h("div", { class: "f", style: { alignContent: "start", gap: "12px" } },
          field("Nome", txt(a, "name"), "A última palavra vai para a segunda linha."),
          field("Função", tr(a, "role")),
          field("Disponibilidade", tr(a, "availability", { ph: "Available · Remote" })),
          field("Bio", tr(a, "bio", { multi: true, rows: 3 }))))),
    sec("02", "Dados", "três colunas no cartão",
      h("div", { class: "grid3" }, a.facts.slice(0, 3).map((f, k) => h("div", { class: "card" },
        h("div", { class: "card__h" }, h("i", {}, pad(k + 1))), field("Rótulo", tr(f, "label")), field("Valor", tr(f, "value")))))),
    sec("03", "Contato", null,
      h("div", { class: "grid3" },
        field("E-mail", txt(a, "email", { ph: "voce@email.com" })),
        field("LinkedIn", txt(a, "linkedin", { ph: "https://www.linkedin.com/in/…" })),
        field("Behance", txt(a, "behance", { ph: "https://www.behance.net/…" })))),
  ];
}
function renderMain() {
  const form = $("#form"), sel = E.sel;
  let title = "", crumb = "";
  if (sel.type === "job") {
    const j = curJob();
    if (!j) { E.sel = jobs()[0] ? { type: "job", id: jobs()[0].id } : { type: "hero" }; return renderMain(); }
    title = j.title || "Sem título"; crumb = "Jobs"; form.replaceChildren(...jobForm(j));
  } else {
    const p = PAGES.find((x) => x.type === sel.type) || { t: sel.type }; title = p.t; crumb = "Site";
    form.replaceChildren(...({ guide: SP.guideForm, positioning: SP.positioningForm, reels: SP.reelsForm, organize: SP.organizeForm, skills: SP.skillsForm, profiles: SP.profilesForm,
      categories: categoriesForm, tools: toolsForm, hero: heroForm, practices: practicesForm, process: processForm, about: aboutForm, import: importForm })[sel.type]());
  }
  $("#barTitle").textContent = title; $("#crumb").textContent = crumb + " · textos em " + E.lang.toUpperCase();
}

/* ───────────── preview ───────────── */
function previewURL() {
  const q = ["draft"]; if (E.lang === "pt") q.push("lang=pt");
  const s = E.sel;
  if (s.type === "job") q.push("case=" + encodeURIComponent(s.id));
  else if (s.type === "guide" || s.type === "positioning") { /* the hero */ }
  else if (s.type === "reels") q.push("reel");
  else if (s.type === "profiles") { const p = E.data.profiles[0]; if (p) q.push("for=" + encodeURIComponent(p.id)); }
  else q.push("at=" + ({ organize: "work", skills: "skills", categories: "index", tools: "work", about: "about", import: "index" })[s.type] || "work");
  return SITE + "index.html?" + q.join("&");
}
function reloadPreview() {
  if ($("#app").classList.contains("pv-off")) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(E.data)); } catch { /* ignore */ }
  // keep the cursor in the editor: the reloading preview must never take focus
  const u = previewURL(), fr = $("#pvFrame"), keep = document.activeElement;
  fr.onload = () => { if (document.activeElement === fr && keep && keep !== document.body && keep !== fr) keep.focus({ preventScroll: true }); };
  fr.src = u + "&t=" + Date.now(); $("#pvOpen").href = u;
}

/* ───────────── boot ───────────── */
function bindChrome() {
  $("#addJob").onclick = () => { const id = uniqueId("novo-job"); const j = blankJob(id); jobs().push(j); changed(); select({ type: "job", id }); setTimeout(() => $("#form input")?.focus(), 50); };
  $("#langSeg").querySelectorAll("button").forEach((b) => (b.onclick = () => { E.lang = b.dataset.l; $("#langSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); renderMain(); reloadPreview(); }));
  $("#devSeg").querySelectorAll("button").forEach((b) => (b.onclick = () => { $("#pv").classList.toggle("mobile", b.dataset.d === "mobile"); $("#devSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); }));
  $("#pvReload").onclick = reloadPreview;
  $("#pvToggle").onclick = () => { $("#app").classList.toggle("pv-off"); reloadPreview(); };
  $("#saveBtn").onclick = save;
  $("#pubBtn").onclick = publish;
  addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });
  addEventListener("beforeunload", (e) => { if (E.dirty) { e.preventDefault(); e.returnValue = ""; } });
}
function normalize(d) {
  const b = blankContent();
  d.format = FORMAT; if (typeof d.media !== "string") d.media = "../v3/";
  for (const k of ["hero", "about", "positioning"]) d[k] = { ...b[k], ...(d[k] || {}) };
  for (const k of ["reels", "skills", "profiles"]) d[k] = Array.isArray(d[k]) ? d[k] : b[k];
  if (typeof d.primaryReel !== "string") d.primaryReel = (d.reels[0] || {}).id || "";
  d.skills.forEach((s) => { s.jobs = Array.isArray(s.jobs) ? s.jobs : []; s.tools = Array.isArray(s.tools) ? s.tools : []; if (!["core", "adjacent", "edge"].includes(s.ring)) s.ring = "adjacent"; });
  d.profiles.forEach((p) => { p.flagships = Array.isArray(p.flagships) ? p.flagships : []; });
  for (const k of ["gate", "practices", "process"]) { const arr = Array.isArray(d[k]) ? d[k] : []; d[k] = b[k].map((x, i) => ({ ...x, ...(arr[i] || {}) })); }
  d.categories = Array.isArray(d.categories) ? d.categories : [];
  d.tools = Array.isArray(d.tools) ? d.tools : [];
  const byLabel = (name) => d.tools.find((t) => t.label.toLowerCase() === name.trim().toLowerCase());
  d.jobs = (Array.isArray(d.jobs) ? d.jobs : []).map((j) => ({ ...blankJob(j.id || "job"), ...j, gallery: Array.isArray(j.gallery) ? j.gallery : [],
    categories: Array.isArray(j.categories) ? j.categories : [], tier: ["flagship", "featured", "lab", "archive"].includes(j.tier) ? j.tier : "archive",
    // older drafts kept tools as free text: map the names that exist in the registry
    tools: Array.isArray(j.tools) ? j.tools : String(j.tools || "").split(/[,·;]/).map(byLabel).filter(Boolean).map((t) => t.id) }));
  return d;
}
async function boot() {
  bindChrome();
  const conn = $("#conn");
  let data = null;
  try {
    const st = await api("/status"); E.server = true; E.platform = st.platform;
    conn.className = "side__status ok"; conn.lastChild.textContent = "servidor local · v4/content.json";
    data = st.content ? await api("/content") : blankContent();
  } catch {
    conn.className = "side__status err"; conn.lastChild.textContent = "sem servidor local";
    const b = $("#banner"); b.hidden = false;
    b.replaceChildren(h("b", {}, "Modo somente leitura."), " Abra o editor pelo ", h("code", {}, "portfolio-update.bat"), " para salvar e importar mídia.");
    try { const r = await fetch(SITE + "content.json", { cache: "no-cache" }); data = r.ok ? await r.json() : blankContent(); } catch { data = blankContent(); }
  }
  E.data = normalize(data);
  // unsaved work from a previous session?
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (localStorage.getItem(DIRTY_KEY) === "1" && draft && draft !== JSON.stringify(E.data)) {
      const b = $("#banner"); b.hidden = false;
      b.replaceChildren(h("b", {}, "Há alterações não salvas da última sessão."),
        h("button", { class: "mini", type: "button", onclick: () => { E.data = normalize(JSON.parse(draft)); b.hidden = true; changed(); renderNav(); renderMain(); reloadPreview(); } }, "Restaurar"),
        h("button", { class: "mini", type: "button", onclick: () => { localStorage.setItem(DIRTY_KEY, "0"); b.hidden = true; } }, "Descartar"));
    }
  } catch { /* ignore */ }
  E.sel = { type: "guide" };
  renderNav(); renderMain(); renderState(); reloadPreview();
  try { if (localStorage.getItem(DIRTY_KEY) !== "1") localStorage.setItem(DRAFT_KEY, JSON.stringify(E.data)); } catch { /* ignore */ }
}
boot();

/* ───────────── Importar: jobs from an Adobe Portfolio site (myportfolio.com) ─────────────
   The dev server fetches the pages (/__portfolio/remote); parsing happens here with DOMParser.
   Images go through the same WebP pipeline as a manual import; embeds become the job video
   (first) and gallery links (rest). New jobs arrive hidden so the live site never fills up
   with half-finished entries; matched jobs only get the fields that are still empty. */
const IM = { site: "https://finetunemotion.myportfolio.com", list: null, busy: false };
const remote = (u) => `${API}/remote?url=${encodeURIComponent(u)}`;
async function remoteDoc(u) { const r = await fetch(remote(u)); if (!r.ok) throw new Error(`${r.status} em ${u}`); return new DOMParser().parseFromString(await r.text(), "text/html"); }
function bestSrc(img, base) {
  const set = img.getAttribute("data-srcset") || img.getAttribute("srcset");
  let u = img.getAttribute("data-src") || img.getAttribute("src") || "";
  if (set) { const c = set.split(",").map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map(([a, w]) => [a, parseInt(w) || 0]).sort((a, b) => b[1] - a[1]); const pick = c.find((x) => x[1] <= 2400) || c[0]; if (pick) u = pick[0]; }
  try { return u && !u.startsWith("data:") ? new URL(u, base).href : ""; } catch { return ""; }
}
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOP = new Set(["abertura", "vfx", "video", "videos", "animacao", "animation", "the", "das", "dos", "nossas", "nosas", "para", "and", "lyric", "direcao", "projeto", "vinheta", "com"]);
const toks = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t)));
function guessTargets(list) {
  const pairs = [];
  jobs().forEach((j) => { const a = toks(j.id + " " + j.title); list.forEach((p, k) => { const b = toks(p.path + " " + p.title); let n = 0; a.forEach((t) => b.has(t) && n++); if (n) pairs.push([n, j.id, k]); }); });
  pairs.sort((x, y) => y[0] - x[0]);
  const usedJ = new Set(), usedP = new Set();
  pairs.forEach(([, id, k]) => { if (usedJ.has(id) || usedP.has(k)) return; usedJ.add(id); usedP.add(k); list[k].target = id; });
}
async function scanPortfolio(status) {
  const site = IM.site.replace(/\/+$/, ""), home = await remoteDoc(site + "/projects");
  const covers = new Map();
  home.querySelectorAll("a.project-cover").forEach((a) => { const p = new URL(a.getAttribute("href"), site).pathname; const im = a.querySelector("img"); if (im) covers.set(p, bestSrc(im, site)); });
  const paths = covers.size ? [...covers.keys()] : [...new Set([...home.querySelectorAll("a[href]")].map((a) => new URL(a.getAttribute("href"), site)).filter((u) => u.origin === new URL(site).origin && !/^\/(projects|contact|about)?\/?$/.test(u.pathname)).map((u) => u.pathname))];
  const list = [];
  for (const [i, p] of paths.entries()) {
    status(`Lendo ${i + 1}/${paths.length}…`);
    try {
      const d = await remoteDoc(site + p), m = d.querySelector(".page-content") || d.body;
      const text = [...m.querySelectorAll(".project-module-text, .rich-text")].map((x) => x.textContent.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()).filter(Boolean).join("\n\n");
      list.push({ path: p, url: site + p, on: true, target: "",
        title: (d.querySelector("h1.title, .project-title, h1")?.textContent || p.slice(1)).replace(/\s+/g, " ").trim(),
        desc: (d.querySelector(".page-header .description, p.description")?.textContent || "").trim(), text,
        cover: covers.get(p) || d.querySelector('meta[property="og:image"]')?.content || "",
        imgs: [...new Set([...m.querySelectorAll(".project-module-image img, .grid__item img, .js-lightbox img")].map((im) => bestSrc(im, site)).filter(Boolean))],
        embeds: [...new Set([...m.querySelectorAll("iframe")].map((f) => f.getAttribute("data-src") || f.getAttribute("src")).filter((u) => /^https?:/.test(u || "") && !/linkedin\.com/.test(u)))],
        links: [...new Set([...m.querySelectorAll(".project-module a[href]")].map((a) => a.href).filter((u) => /^https?:/.test(u) && !u.startsWith(site)))] });
    } catch (e) { toast(`${p}: ${e.message}`, "err", 8000); }
  }
  guessTargets(list);
  list.forEach((p) => { const j = jobs().find((x) => x.imported === p.url || (Array.isArray(x.mergedFrom) && x.mergedFrom.includes(p.url))); if (j) { p.target = j.id; p.done = true; p.on = false; } });
  return list;
}
async function fetchFile(u, k) {
  const r = await fetch(remote(u)); if (!r.ok) throw new Error(`${r.status}`);
  const b = await r.blob(), last = decodeURIComponent(new URL(u).pathname.split("/").pop() || "img");
  return new File([b], `${pad(k + 1)}-${last}`.replace(/[^\w.-]+/g, "_"), { type: b.type });
}
const firstLine = (s) => { s = (s || "").replace(/\s+/g, " ").trim(); if (s.length <= 200) return s; const cut = s.slice(0, 200); const dot = cut.lastIndexOf(". "); return (dot > 60 ? cut.slice(0, dot + 1) : cut.replace(/\s\S*$/, "") + "…"); };
async function importOne(p, status) {
  let j = p.target ? jobs().find((x) => x.id === p.target) : null;
  const fresh = !j;
  if (fresh) { j = blankJob(uniqueId(p.path.replace(/^\//, "").slice(0, 40))); j.year = ""; j.title = p.title; j.hidden = true; jobs().push(j); }
  const body = [p.desc, p.text].filter(Boolean).join("\n\n");
  if (!tv(j.context, "pt") && body && fresh) T(j, "context").pt = firstLine(p.desc || p.text);
  if (body && !T(j, "execution").pt) T(j, "execution").pt = body;
  if (!j.cover && p.cover) { try { const [c] = await importFiles([await fetchFile(p.cover, -1)], { dir: `media/${j.id}`, maxW: 1600, ratio: COVER_RATIO, quiet: true }); if (c) j.cover = c; } catch (e) { toast(`${p.title} — capa: ${e.message}`, "warn"); } }
  const files = [];
  for (const [k, u] of p.imgs.entries()) { status(`${p.title} — imagem ${k + 1}/${p.imgs.length}`); try { files.push(await fetchFile(u, k)); } catch (e) { toast(`${p.title} — imagem ${k + 1}: ${e.message}`, "warn"); } }
  if (files.length) { const got = await importFiles(files, { dir: `media/${j.id}`, maxW: 2400, quiet: true }); if (!Array.isArray(j.gallery)) j.gallery = []; j.gallery.push(...got.filter((g) => !j.gallery.includes(g))); }
  const emb = [...p.embeds];
  if (!j.video && emb.length) j.video = emb.shift();
  emb.forEach((u) => { if (u !== j.video && !j.gallery.includes(u)) j.gallery.push(u); });
  const be = p.links.find((u) => /behance\.net/.test(u));
  if (!j.link?.url && be) { if (!j.link) j.link = { label: { en: "View on Behance", pt: "Ver no Behance" }, url: "" }; j.link.url = be; }
  j.imported = p.url; p.done = true; p.on = false; p.target = j.id;
}
function importForm() {
  const box = h("div", { class: "imp" });
  const draw = () => {
    if (!IM.list) { box.replaceChildren(h("p", { class: "f__h" }, "Lê a página /projects do seu Adobe Portfolio e cada projeto: título, textos, imagens, vídeos incorporados e links.")); return; }
    const sel = IM.list.filter((p) => p.on).length;
    box.replaceChildren(
      h("div", { class: "imp__bar" }, h("span", {}, `${IM.list.length} projetos · ${sel} marcados`),
        h("button", { class: "mini", type: "button", onclick: () => { IM.list.forEach((p) => !p.done && (p.on = true)); draw(); } }, "Marcar todos"),
        h("button", { class: "mini", type: "button", onclick: () => { IM.list.forEach((p) => (p.on = false)); draw(); } }, "Desmarcar"),
        h("button", { class: "btn", type: "button", disabled: !sel || IM.busy || null, onclick: run }, `Importar ${sel}`)),
      h("ul", { class: "imp__list" }, IM.list.map((p) => {
        const cb = h("input", { type: "checkbox", checked: p.on, disabled: IM.busy || null }); cb.addEventListener("change", () => { p.on = cb.checked; draw(); });
        const tg = h("select", { disabled: IM.busy || null }, h("option", { value: "" }, "→ novo job (oculto)"), ...jobs().map((j) => h("option", { value: j.id, selected: p.target === j.id || null }, "→ completar: " + (j.title || j.id))));
        tg.addEventListener("change", () => { p.target = tg.value; });
        const n = [p.imgs.length && `${p.imgs.length} img`, p.embeds.length && `${p.embeds.length} vídeo`, (p.desc || p.text) && "texto", p.links.length && `${p.links.length} link`].filter(Boolean).join(" · ");
        return h("li", { class: "imp__it" + (p.done ? " done" : "") }, cb, h("img", { src: p.cover || "", alt: "", loading: "lazy" }),
          h("div", { class: "imp__t" }, h("b", {}, p.title), h("small", {}, (p.done ? "✓ importado · " : "") + (n || "sem mídia"))), tg);
      })));
  };
  const scan = async () => {
    if (!E.server) { toast("Sem servidor local: abra o editor pelo portfolio-update.bat.", "err"); return; }
    IM.busy = true; const t = toast("Lendo o portfolio…", "busy", 0);
    try { IM.list = await scanPortfolio((m) => t.set(m)); t.done(`${IM.list.length} projetos encontrados`, "ok"); }
    catch (e) { t.done("Não leu: " + e.message, "err"); }
    IM.busy = false; draw();
  };
  const run = async () => {
    IM.busy = true; draw(); const todo = IM.list.filter((p) => p.on), t = toast("Importando…", "busy", 0);
    for (const [i, p] of todo.entries()) { try { await importOne(p, (m) => t.set(`${i + 1}/${todo.length} · ${m}`)); } catch (e) { toast(`${p.title}: ${e.message}`, "err", 8000); } }
    IM.busy = false; changed(); renderNav(); draw();
    t.done(`${todo.filter((p) => p.done).length} projeto(s) importado(s). Novos jobs entram ocultos: revise e marque “Visível no site”.`, "ok");
    await save();
  };
  const site = h("input", { type: "url", value: IM.site }); site.addEventListener("input", () => (IM.site = site.value.trim()));
  draw();
  return [sec("01", "Adobe Portfolio", "de onde vêm os projetos",
      h("div", { class: "row", style: { flexWrap: "nowrap" } }, site, h("button", { class: "btn", type: "button", onclick: scan }, IM.list ? "Ler de novo" : "Ler projetos"))),
    sec("02", "Projetos", "marque o que importar e para qual job vai", box)];
}
