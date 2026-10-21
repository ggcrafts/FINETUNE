// Copies the brand icons listed in src/data/tools.json from the `simple-icons`
// package (or your own SVGs in public/assets/tools/custom/) into
// public/assets/tools/, and writes manifest.json for the site.
// Runs automatically before `npm run dev` / `npm run build`. Never fails the build.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/tools.json"), "utf8"));
const outDir = path.join(root, "public/assets/tools");
const customDir = path.join(outDir, "custom");
const iconsDir = path.join(root, "node_modules/simple-icons/icons");
fs.mkdirSync(customDir, { recursive: true });

const manifest = {};
const missing = [];
for (const tool of registry.tools) {
  const custom = path.join(customDir, `${tool.id}.svg`);
  if (fs.existsSync(custom)) {
    manifest[tool.id] = `/assets/tools/custom/${tool.id}.svg`;
    continue;
  }
  const slug = (tool.icons || []).find((s) => fs.existsSync(path.join(iconsDir, `${s}.svg`)));
  if (slug) {
    fs.copyFileSync(path.join(iconsDir, `${slug}.svg`), path.join(outDir, `${tool.id}.svg`));
    manifest[tool.id] = `/assets/tools/${tool.id}.svg`;
  } else {
    missing.push(tool.label);
  }
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`[icons] ${Object.keys(manifest).length}/${registry.tools.length} tool icons ready.`);
if (missing.length) {
  console.log(`[icons] Using text monograms for: ${missing.join(", ")}`);
  console.log("[icons] Add official SVGs to public/assets/tools/custom/<id>.svg to show their logos.");
}
