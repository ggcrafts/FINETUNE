import { state, subscribe, onFrame } from "../state";
import { params, paramRanges, type FineTuneParams } from "../webgl/params";
import { getHeroScene } from "../components/Hero/heroWebgl";

/**
 * ?debug=true — diagnostics + the FineTune tuning panel (spec §22, §49).
 * Zero dependencies; never active unless the query flag is present.
 */
export function initDebug(): void {
  const query = new URLSearchParams(window.location.search);
  if (query.get("debug") !== "true") return;

  // ---- column overlay -----------------------------------------------------
  const overlay = document.createElement("div");
  overlay.className = "debug-grid";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `<div class="page"><div class="grid">${"<span></span>".repeat(12)}</div></div>`;
  overlay.hidden = true;
  document.body.append(overlay);
  const syncCols = (): void => {
    const cols = Number(getComputedStyle(document.documentElement).getPropertyValue("--grid-cols")) || 12;
    overlay.querySelectorAll<HTMLElement>(".grid span").forEach((el, i) => {
      el.style.display = i < cols ? "block" : "none";
    });
  };
  syncCols();
  window.addEventListener("resize", syncCols);

  // ---- HUD ----------------------------------------------------------------
  const hud = document.createElement("pre");
  hud.className = "debug-hud";
  document.body.append(hud);
  let section = "";
  subscribe((s) => (section = s.activeSection));
  let acc = 0;
  onFrame((s, dt) => {
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    const hero = getHeroScene()?.stats;
    hud.textContent = [
      `viewport  ${s.viewport.width}×${s.viewport.height} @${s.viewport.dpr.toFixed(2)}`,
      hero ? `webgl     ${hero.fps} fps · ${hero.quality} · ${hero.width}×${hero.height}` : "webgl     poster (off)",
      hero ? `gpu       ${hero.drawCalls} draws · ${(hero.triangles / 1000).toFixed(1)}k tris` : "",
      `section   ${section}  cover ${s.heroCover.toFixed(2)}`,
      `scroll    ${Math.round(s.scroll)}  hero ${s.heroProgress.toFixed(2)}`,
      `pointer   ${s.pointer.x.toFixed(2)}, ${s.pointer.y.toFixed(2)} ${s.pointerActive ? "" : "(idle)"}`,
      `motion    ${s.reducedMotion ? "reduced" : "full"}`,
    ].filter(Boolean).join("\n");
  });

  // ---- tuning panel -----------------------------------------------------
  const panel = document.createElement("form");
  panel.className = "debug-tuner";
  panel.setAttribute("aria-label", "FineTune parameters");
  const keys = Object.keys(paramRanges) as Array<keyof FineTuneParams>;
  panel.innerHTML = `
    <header><b>FineTune</b><span>params</span>
      <label><input type="checkbox" data-grid> grid</label>
      <button type="button" data-copy>copy</button></header>
    ${keys
      .map((k) => {
        const [min, max, step] = paramRanges[k];
        return `<label><span>${k}</span><input type="range" name="${k}" min="${min}" max="${max}" step="${step}" value="${params[k]}"><output>${params[k]}</output></label>`;
      })
      .join("")}`;
  document.body.append(panel);

  panel.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.matches("[data-grid]")) {
      overlay.hidden = !input.checked;
      return;
    }
    const key = input.name as keyof FineTuneParams;
    if (!(key in params)) return;
    params[key] = Number(input.value);
    const out = input.nextElementSibling as HTMLOutputElement | null;
    if (out) out.value = input.value;
  });
  panel.querySelector("[data-copy]")?.addEventListener("click", () => {
    void navigator.clipboard?.writeText(JSON.stringify(params, null, 2));
  });

  console.info("[FineTune] debug mode", state);
}
