import { asset } from "../../utils/asset";
import registry from "../../data/tools.json";

/**
 * Tool icons for Fields of Practice and the Lab.
 * Icons come from `simple-icons` (copied by scripts/sync-icons.mjs) or from
 * official SVGs in public/assets/tools/custom/. Tools without an icon show a
 * mono monogram — never a hand-drawn imitation of a brand mark.
 */

interface Tool {
  id: string;
  label: string;
  mono: string;
}

const tools = new Map<string, Tool>(registry.tools.map((t) => [t.id, t]));
const groups = registry.groups as Record<string, string[]>;

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function chip(tool: Tool, withLabel: boolean, tag: "li" | "span"): string {
  return `<${tag} class="tool${withLabel ? " tool--labelled" : ""}" data-tool="${esc(tool.id)}" title="${esc(tool.label)}">
    <span class="tool__icon" aria-hidden="true"><span class="tool__mono">${esc(tool.mono)}</span></span>
    <span class="${withLabel ? "tool__label" : "visually-hidden"}">${esc(tool.label)}</span>
  </${tag}>`;
}

/** Render every `[data-tools="group"]` list; `data-tools-label` adds names. */
export async function initTools(): Promise<void> {
  const lists = Array.from(document.querySelectorAll<HTMLElement>("[data-tools]"));
  for (const list of lists) {
    const ids = groups[list.dataset.tools ?? ""] ?? [];
    const labelled = list.hasAttribute("data-tools-label");
    // inside a <button> only phrasing content is valid, so inline strips use spans
    const tag = list.tagName === "UL" || list.tagName === "OL" ? "li" : "span";
    list.innerHTML = ids
      .map((id) => tools.get(id))
      .filter((t): t is Tool => Boolean(t))
      .map((t) => chip(t, labelled, tag))
      .join("");
  }

  // Swap monograms for real icons where the manifest has them.
  let manifest: Record<string, string> = {};
  try {
    const res = await fetch(asset("assets/tools/manifest.json"), { cache: "no-cache" });
    if (res.ok) manifest = (await res.json()) as Record<string, string>;
  } catch {
    return;
  }
  document.querySelectorAll<HTMLElement>("[data-tool]").forEach((el) => {
    const src = manifest[el.dataset.tool ?? ""];
    if (!src) return;
    const icon = el.querySelector<HTMLElement>(".tool__icon");
    if (!icon) return;
    icon.style.setProperty("--icon", `url("${asset(src)}")`);
    el.classList.add("has-icon");
  });
}
