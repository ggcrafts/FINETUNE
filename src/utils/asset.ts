/**
 * Public asset URL that respects Vite's `base` (e.g. "/finetune/" on GitHub
 * Pages). Use for every runtime path to files in /public built in JS.
 */
const BASE: string = (import.meta.env as { BASE_URL?: string } | undefined)?.BASE_URL ?? "/";

export function asset(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return BASE.replace(/\/?$/, "/") + path.replace(/^\.?\//, "");
}
