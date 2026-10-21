import { ATTR, HTML, TEXT, UI } from "./pt";

/**
 * Minimal runtime i18n (EN ⇄ PT-BR), no dependency.
 * English is the HTML itself. Switching walks the text nodes once and swaps
 * them through the PT map (originals are remembered, so EN restores exactly).
 * Elements with `data-i18n-html` swap their inner markup. Choice persists.
 */

export type Lang = "en" | "pt";

const KEY = "ft-lang";
const listeners = new Set<(l: Lang) => void>();
const originals = new WeakMap<Node, string>();
const htmlOriginals = new Map<Element, string>();
const attrOriginals = new WeakMap<Element, Record<string, string>>();
let lang: Lang = "en";

const norm = (s: string): string => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

export function getLang(): Lang {
  return lang;
}

export function t(key: keyof typeof UI): string {
  return UI[key][lang];
}

export function onLangChange(fn: (l: Lang) => void): void {
  listeners.add(fn);
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "pt") return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function skip(node: Node): boolean {
  const el = node.parentElement;
  if (!el) return true;
  return Boolean(el.closest("script, style, code, pre, svg, [data-i18n-html], [data-no-i18n], .tool"));
}

function applyText(to: Lang): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (skip(node)) continue;
    if (!originals.has(node)) {
      const raw = node.nodeValue ?? "";
      if (!norm(raw) || !(norm(raw) in TEXT)) continue;
      originals.set(node, raw);
    }
    const en = originals.get(node)!;
    if (to === "en") {
      node.nodeValue = en;
    } else {
      const lead = en.match(/^\s*/)?.[0] ?? "";
      const trail = en.match(/\s*$/)?.[0] ?? "";
      node.nodeValue = lead + TEXT[norm(en)] + trail;
    }
  }
}

function applyHtml(to: Lang): void {
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    if (!htmlOriginals.has(el)) htmlOriginals.set(el, el.innerHTML);
    const key = el.dataset.i18nHtml ?? "";
    el.innerHTML = to === "pt" && HTML[key] ? HTML[key] : htmlOriginals.get(el)!;
  });
}

function applyAttrs(to: Lang): void {
  document.querySelectorAll<HTMLElement>("[aria-label], img[alt]").forEach((el) => {
    let saved = attrOriginals.get(el);
    if (!saved) {
      saved = {};
      for (const a of ["aria-label", "alt"]) {
        const v = el.getAttribute(a);
        if (v && ATTR[v]) saved[a] = v;
      }
      attrOriginals.set(el, saved);
    }
    for (const [a, en] of Object.entries(saved)) el.setAttribute(a, to === "pt" ? ATTR[en] : en);
  });
}

export function setLang(to: Lang, persist = true): void {
  lang = to;
  document.documentElement.lang = to === "pt" ? "pt-BR" : "en";
  applyHtml(to);
  applyText(to);
  applyAttrs(to);
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === to)),
  );
  if (persist) {
    try {
      localStorage.setItem(KEY, to);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn(to));
}

export function initI18n(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang === "pt" ? "pt" : "en")),
  );
  const initial = detect();
  if (initial !== "en") setLang(initial, false);
  else lang = "en";
}
