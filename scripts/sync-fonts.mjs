// Downloads the variable font used by the animated "form" word (Roboto Flex,
// SIL Open Font License) with its weight (100–1000) and width (25–151) axes,
// into public/assets/fonts/form-flex-xtra.woff2 — self-hosted, no CDN at runtime.
// Runs before `npm run dev` / `npm run build`; skipped once the file exists.
// Never fails the build: without the file the site falls back to Space Grotesk.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/assets/fonts");
const out = path.join(outDir, "form-flex-xtra.woff2");
const CSS_URL = "https://fonts.googleapis.com/css2?family=Roboto+Flex:wdth,wght,XTRA@25..151,100..1000,323..603&display=swap";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function main() {
  if (fs.existsSync(out) && fs.statSync(out).size > 10000) {
    console.log("[fonts] form-flex-xtra.woff2 ready.");
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();
  // prefer the latin subset block
  const blocks = css.split("/*").map((b) => "/*" + b);
  const latin = blocks.find((b) => /\/\* latin \*\//.test(b)) ?? css;
  const m = latin.match(/url\((https:[^)]+\.woff2)\)/);
  if (!m) throw new Error("font url not found");
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
  if (buf.length < 10000) throw new Error("font download too small");
  fs.writeFileSync(out, buf);
  console.log(`[fonts] form-flex-xtra.woff2 downloaded (${Math.round(buf.length / 1024)} KB).`);
}

main().catch((err) => {
  console.log(`[fonts] Could not fetch Roboto Flex (${err.message}). "form" uses the Space Grotesk fallback.`);
});
