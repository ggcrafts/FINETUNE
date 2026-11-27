// FineTune v4 — content model.
// Reads content.json (format finetune-portfolio/2, written by Portfolio Update) and resolves it
// into what the page renders: the positioning, the reel, the flagship cases, the skill stations
// of the knob, the index and the lab. `?draft` (the editor's live preview) reads the unsaved
// draft from localStorage; `?for=<profile>` applies a tailored version (headline line, reel,
// flagship order).

export const QS = new URLSearchParams(location.search);
export const DRAFT_KEY = "portfolio-update:draft";

/** a field filled in only one language shows that language in the other one too */
export const tx = (v, lang) => (v == null ? "" : typeof v === "string" ? v.trim() : ((v[lang] || "").trim() || (v.en || "").trim() || (v.pt || "").trim()));
export const hex3 = (h, d = [0.56, 0.85, 1]) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255) : d; };
export const isVideo = (p) => /\.(mp4|webm|mov)(\?|$)/i.test(p || "");
export const RINGS = ["core", "adjacent", "edge"];
export const TIERS = ["flagship", "featured", "lab", "archive"];

export async function loadContent() {
  let C = null;
  if (QS.has("draft")) { try { C = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { C = null; } }
  if (!C) { try { const r = await fetch("./content.json", { cache: "no-cache" }); if (r.ok) C = await r.json(); } catch { C = null; } }
  return C || {};
}

/** "1:02", "62", "62s", "0:58" → seconds (0 when unknown) */
export function seconds(v) {
  const s = String(v || "").trim(); if (!s) return 0;
  const m = s.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1] * 60 + +m[2];
  const n = parseFloat(s); return Number.isFinite(n) ? n : 0;
}
export const clock = (sec) => (sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : "");

export function buildModel(C) {
  const base = typeof C.media === "string" ? C.media : "../v3/";
  const src = (p) => (!p ? "" : /^(https?:|data:|blob:)/.test(p) ? p : base + p.replace(/^\.?\//, ""));
  const draftCase = QS.has("draft") ? QS.get("case") : null;
  const tools = new Map((Array.isArray(C.tools) ? C.tools : []).map((t) => [t.id, t]));

  // jobs: hidden ones never render (the editor's preview can still open one by ?case=)
  const all = Array.isArray(C.jobs) ? C.jobs : [];
  const jobs = all.filter((j) => !j.hidden || j.id === draftCase).map((j, i) => ({
    id: j.id, i, raw: j, title: (j.title || "").trim() || "Untitled", client: j.client || "", year: j.year || "", disc: j.disciplines || "",
    tier: TIERS.includes(j.tier) ? j.tier : "archive", cats: Array.isArray(j.categories) ? j.categories : [],
    tint: hex3(j.tint), tintHex: /^#[0-9a-f]{6}$/i.test(j.tint || "") ? j.tint : "#8fd8ff",
    cover: j.cover || "", tools: (Array.isArray(j.tools) ? j.tools : []).filter((id) => tools.has(id)),
    role: j.role || "", ctx: (l) => tx(j.context, l),
  }));
  const byId = new Map(jobs.map((j) => [j.id, j]));

  // profile (tailored version): ?for=<id>
  const profiles = Array.isArray(C.profiles) ? C.profiles : [];
  const profile = profiles.find((p) => p.id && p.id === QS.get("for")) || null;

  const tier = (t) => jobs.filter((j) => j.tier === t);
  let flagships = tier("flagship");
  if (profile && Array.isArray(profile.flagships) && profile.flagships.length) {
    const want = profile.flagships.map((id) => byId.get(id)).filter(Boolean);
    flagships = [...want, ...flagships.filter((j) => !want.includes(j))];
  }

  // categories: only those with visible jobs; primary ones first
  const cats = (Array.isArray(C.categories) ? C.categories : []).map((c) => ({
    id: c.id, name: (l) => tx(c.name, l), text: (l) => tx(c.text, l), tier: c.tier === "primary" ? "primary" : "secondary",
    jobs: jobs.filter((j) => j.cats.includes(c.id)),
  })).filter((c) => c.jobs.length).sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "primary" ? -1 : 1));

  // skills = the knob stations, clockwise from 12 o'clock, grouped core → adjacent → edge
  const skills = (Array.isArray(C.skills) ? C.skills : []).map((s, k) => ({
    id: s.id || "skill-" + k, ring: RINGS.includes(s.ring) ? s.ring : "adjacent", name: (l) => tx(s.name, l), short: (l) => tx(s.short, l), line: (l) => tx(s.line, l),
    since: s.since || "", tools: (s.tools || []).filter((id) => tools.has(id)), proof: (s.jobs || []).map((id) => byId.get(id)).filter(Boolean),
    media: s.media || "", tint: hex3(s.tint), tintHex: /^#[0-9a-f]{6}$/i.test(s.tint || "") ? s.tint : "#8fd8ff",
  }));
  skills.forEach((s, k) => (s.order = k));
  skills.sort((a, b) => RINGS.indexOf(a.ring) - RINGS.indexOf(b.ring) || a.order - b.order);
  const skillsOf = (job) => skills.filter((s) => s.proof.includes(job));

  // reels: the primary one (or the profile's), falling back to the first reel that has a video
  const reels = (Array.isArray(C.reels) ? C.reels : []).filter((r) => r && r.id).map((r) => ({
    id: r.id, kind: r.kind || "cut", name: (l) => tx(r.name, l), video: (r.video || "").trim(), poster: r.poster || "", dur: seconds(r.duration),
  }));
  const playable = reels.filter((r) => r.video);
  const want = (profile && profile.reel) || C.primaryReel || "main";
  const reel = playable.find((r) => r.id === want) || playable.find((r) => r.kind === "main") || playable[0] || null;
  const breakdown = playable.find((r) => r.kind === "breakdown" && r !== reel) || null;

  const pos = C.positioning || {};
  const positioning = {
    specialty: (l) => tx(pos.specialty, l) || "Senior 3D Motion Designer",
    line: (l) => (profile && tx(profile.line, l)) || tx(pos.line, l),
    secondary: (l) => tx(pos.secondary, l), facts: (l) => tx(pos.facts, l),
    loop: pos.loop || "", poster: pos.poster || "",
  };

  return { C, src, tools, jobs, byId, profile, flagships, featured: tier("featured"), lab: tier("lab"), archive: tier("archive"),
    cats, skills, skillsOf, reels, reel, breakdown, positioning, about: C.about || {} };
}

/** YouTube / Vimeo / file / https page → what the player needs */
export function embedOf(url, src) {
  const u = (url || "").trim(); if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1&autoplay=1` };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/);
  if (m) { const h = m[2] || (u.match(/[?&]h=([\da-f]+)/) || [])[1]; return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}?dnt=1&autoplay=1${h ? "&h=" + h : ""}` }; }
  if (isVideo(u)) return { kind: "video", src: /^https?:/.test(u) ? u : src(u) };
  if (/^https:\/\//.test(u)) return { kind: "iframe", src: u };
  return null;
}
