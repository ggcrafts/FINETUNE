// Portfolio Update — dev-server API for the content editor (portfolio-update/index.html).
//
// Only active in `vite` dev mode (apply: "serve"); production builds never include it.
// Everything it writes stays inside public/v3/ (content.json + media) and
// portfolio-update/.backups/ (one copy of content.json per save, last 30 kept).
//
//   GET  /__portfolio/status            → { ok, content, site }
//   GET  /__portfolio/content           → public/v3/content.json
//   PUT  /__portfolio/content           → validates + writes content.json (backup first)
//   POST /__portfolio/upload?dir=&name= → raw file body → public/v3/<dir>/<name> (unique name)
//   GET  /__portfolio/files             → every image / video under the v3 media folders
//   POST /__portfolio/publish           → opens publish.bat in its own window (Windows)
//   GET  /__portfolio/remote?url=       → fetches a page or image from an Adobe Portfolio site
//                                         (*.myportfolio.com only) for the Importar page
//
// Requests must come from the editor page itself: cross-site requests are refused and
// every write needs the `x-portfolio-update: 1` header.

import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const MEDIA_ROOTS = ["media", "covers", "practice", "portrait", "reel", "tools"];
const MEDIA_EXT = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|mov)$/i;
const MAX_UPLOAD = 300 * 1024 * 1024;
const KEEP_BACKUPS = 30;
const REMOTE_OK = /(^|\.)myportfolio\.com$/i;   // Adobe Portfolio pages + cdn.myportfolio.com images
const MAX_REMOTE = 80 * 1024 * 1024;

function send(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new Error(`file larger than ${Math.round(limit / 1048576)} MB`)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** "My Photo (2).JPG" → "my-photo-2.jpg" */
function safeName(name: string): string {
  const ext = (path.extname(name) || "").toLowerCase();
  const base = path.basename(name, path.extname(name))
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  return base + ext;
}

/** "media/hbo-bff" — only inside the known media roots, no traversal */
function safeDir(dir: string): string | null {
  const d = dir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9._/-]*$/.test(d) || d.split("/").some((p) => p === "" || p === "." || p === "..")) return null;
  return MEDIA_ROOTS.includes(d.split("/")[0]) ? d : null;
}

async function listMedia(site: string): Promise<Array<{ path: string; size: number; mtime: number }>> {
  const out: Array<{ path: string; size: number; mtime: number }> = [];
  async function walk(rel: string, depth: number): Promise<void> {
    let entries: fs.Dirent[];
    try { entries = await fsp.readdir(path.join(site, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel + "/" + e.name;
      if (e.isDirectory() && depth < 4) await walk(r, depth + 1);
      else if (e.isFile() && MEDIA_EXT.test(e.name)) {
        const st = await fsp.stat(path.join(site, r));
        out.push({ path: r, size: st.size, mtime: st.mtimeMs });
      }
    }
  }
  for (const root of MEDIA_ROOTS) await walk(root, 0);
  return out;
}

export function portfolioUpdate(): Plugin {
  return {
    name: "finetune-portfolio-update",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;
      const site = path.join(root, "public", "v3");
      const contentFile = path.join(site, "content.json");
      const backups = path.join(root, "portfolio-update", ".backups");

      async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        // same-origin only: the editor page is served by this very server
        const fetchSite = req.headers["sec-fetch-site"];
        if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return send(res, 403, { error: "cross-site request refused" });
        const origin = req.headers.origin;
        if (origin && (() => { try { return new URL(origin).host !== req.headers.host; } catch { return true; } })()) return send(res, 403, { error: "foreign origin refused" });
        if (req.method !== "GET" && req.headers["x-portfolio-update"] !== "1") return send(res, 403, { error: "missing editor header" });

        const url = new URL(req.url || "/", "http://localhost");
        const route = `${req.method} ${url.pathname.replace(/\/+$/, "") || "/"}`;

        if (route === "GET /status") {
          return send(res, 200, { ok: true, site: fs.existsSync(site), content: fs.existsSync(contentFile), platform: process.platform });
        }

        if (route === "GET /content") {
          if (!fs.existsSync(contentFile)) return send(res, 404, { error: "public/v3/content.json not found" });
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(await fsp.readFile(contentFile));
          return;
        }

        if (route === "PUT /content") {
          const raw = (await readBody(req, 10 * 1024 * 1024)).toString("utf8");
          let data: { format?: string; jobs?: unknown };
          try { data = JSON.parse(raw); } catch { return send(res, 400, { error: "invalid JSON" }); }
          if (!data || data.format !== "finetune-portfolio/1" || !Array.isArray(data.jobs)) return send(res, 400, { error: "not a FineTune content file" });
          await fsp.mkdir(backups, { recursive: true });
          if (fs.existsSync(contentFile)) {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            await fsp.copyFile(contentFile, path.join(backups, `content-${stamp}.json`));
            const old = (await fsp.readdir(backups)).filter((f) => f.startsWith("content-")).sort();
            for (const f of old.slice(0, Math.max(0, old.length - KEEP_BACKUPS))) await fsp.rm(path.join(backups, f), { force: true });
          }
          const tmp = contentFile + ".tmp";
          await fsp.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
          await fsp.rename(tmp, contentFile);
          return send(res, 200, { ok: true, savedAt: new Date().toISOString() });
        }

        if (route === "GET /remote") {
          let target: URL;
          try { target = new URL(url.searchParams.get("url") || ""); } catch { return send(res, 400, { error: "invalid url" }); }
          if (target.protocol !== "https:" || !REMOTE_OK.test(target.hostname)) return send(res, 400, { error: "only https://*.myportfolio.com" });
          const r = await fetch(target, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (FineTune Portfolio Update)" } });
          if (!REMOTE_OK.test(new URL(r.url).hostname)) return send(res, 400, { error: "redirected off-site" });
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > MAX_REMOTE) return send(res, 413, { error: "file too large" });
          res.statusCode = r.status;
          res.setHeader("content-type", r.headers.get("content-type") || "application/octet-stream");
          res.setHeader("cache-control", "no-store");
          res.end(buf);
          return;
        }

        if (route === "POST /upload") {
          const dir = safeDir(url.searchParams.get("dir") || "");
          const name = safeName(url.searchParams.get("name") || "");
          if (!dir) return send(res, 400, { error: "invalid folder" });
          if (!MEDIA_EXT.test(name)) return send(res, 400, { error: "unsupported file type" });
          const body = await readBody(req, MAX_UPLOAD);
          if (!body.length) return send(res, 400, { error: "empty file" });
          const abs = path.join(site, dir);
          await fsp.mkdir(abs, { recursive: true });
          const ext = path.extname(name), base = path.basename(name, ext);
          let final = name;
          for (let n = 2; fs.existsSync(path.join(abs, final)); n++) final = `${base}-${n}${ext}`;
          await fsp.writeFile(path.join(abs, final), body);
          return send(res, 200, { ok: true, path: `${dir}/${final}`, size: body.length });
        }

        if (route === "GET /files") {
          return send(res, 200, { files: await listMedia(site) });
        }

        if (route === "POST /publish") {
          if (process.platform !== "win32") return send(res, 501, { error: "publish.bat only runs on Windows" });
          if (!fs.existsSync(path.join(root, "publish.bat"))) return send(res, 404, { error: "publish.bat not found" });
          // its own console window, exactly like a double-click
          spawn('start "FineTune - publish" cmd /c publish.bat', { cwd: root, shell: true, detached: true, stdio: "ignore", windowsHide: false }).unref();
          return send(res, 200, { ok: true });
        }

        return send(res, 404, { error: "unknown endpoint" });
      }

      server.middlewares.use("/__portfolio", (req, res) => {
        handle(req, res).catch((err: unknown) => send(res, 500, { error: err instanceof Error ? err.message : String(err) }));
      });
    },
  };
}
