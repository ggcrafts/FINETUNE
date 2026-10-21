// Downloads the Behance project covers referenced in src/data/projects.ts into
// public/assets/projects/covers/<slug>.png — self-hosted copies, so the site
// does not depend on Behance's CDN at runtime. Runs before `npm run dev` /
// `npm run build`; files already present are kept (delete one to refresh it).
// Never fails the build: the page falls back to the online image.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/data/projects.ts"), "utf8");
const outDir = path.join(root, "public/assets/projects/covers");
fs.mkdirSync(outDir, { recursive: true });

const jobs = [];
// featured: src: "/assets/projects/covers/<slug>.png", remote: "<url>"
for (const m of src.matchAll(/covers\/([\w-]+)\.png",\s*remote:\s*"([^"]+)"/g)) jobs.push([m[1], m[2]]);
// more("<slug>", "<title>", "<href>", "<img>")
const base = (src.match(/const C = "([^"]+)"/) || [])[1];
for (const m of src.matchAll(/more\("([\w-]+)",\s*"[^"]*",\s*"[^"]*",\s*"([^"]+)"\)/g)) jobs.push([m[1], base + m[2]]);

const sizes = (url) => [url, url.replace(/\/projects\/808\//, "/projects/404/"), url.replace(/\/projects\/404\//, "/projects/808/")];

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 FineTune-sync" } });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("too small");
  return buf;
}

let ok = 0;
const failed = [];
for (const [slug, url] of jobs) {
  const out = path.join(outDir, `${slug}.png`);
  if (fs.existsSync(out) && fs.statSync(out).size > 2000) { ok++; continue; }
  let done = false;
  for (const u of [...new Set(sizes(url))]) {
    try { fs.writeFileSync(out, await get(u)); done = true; break; } catch { /* try next size */ }
  }
  if (done) ok++; else failed.push(slug);
}
console.log(`[covers] ${ok}/${jobs.length} project covers ready.`);
if (failed.length) console.log(`[covers] Using online images for: ${failed.join(", ")}`);
