import { BEHANCE_PROFILE, moreProjects, projects, type Project } from "../../data/projects";
import { getLang, onLangChange, t } from "../../i18n/i18n";
import { asset } from "../../utils/asset";

/** Escape text before it is placed in a template string. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Online fallbacks for a local cover: Behance 808 → 404 sizes. */
function fallbacks(remote?: string): string {
  if (!remote) return "";
  const list = [remote, remote.replace("/projects/808/", "/projects/404/")];
  return ` data-fallback="${esc([...new Set(list)].join(" "))}"`;
}

function caseTemplate(project: Project): string {
  const { media } = project;
  const pt = getLang() === "pt";
  const disciplines = pt ? project.pt.disciplines : project.disciplines;
  const title = project.client
    ? `<span class="case__client">${esc(project.client)}</span>${esc(project.title)}`
    : esc(project.title);

  return `
    <article class="case ${project.featured ? "case--featured" : "case--wide"}">
      <a class="case__link" href="${esc(project.href)}"${project.external ? ' target="_blank" rel="noopener"' : ""} aria-label="${esc(t("openCase"))}: ${esc(
        project.client ? `${project.client} — ${project.title}` : project.title,
      )}">
        <div class="case__media">
          <img src="${esc(asset(media.src))}"${fallbacks(media.remote)} alt="${esc(media.alt)}" width="${media.width}" height="${media.height}" loading="lazy" decoding="async" />
          ${media.placeholder ? `<span class="media-pending case__pending">${esc(t("mediaPending"))}</span>` : ""}
        </div>
        <div class="case__body">
          <div class="case__meta">
            <span class="index-box">${esc(project.index)}</span>
            <span class="t-mono-xs">${disciplines.map(esc).join(" · ")}</span>
          </div>
          <h3 class="case__title">${title}</h3>
          <span class="case__cta link-arrow"><span>${esc(t(project.external ? "viewOnBehance" : "openCase"))}</span><span aria-hidden="true">↗</span></span>
        </div>
      </a>
    </article>`;
}

function moreTemplate(): string {
  const items = moreProjects
    .map(
      (p) => `
      <li>
        <a class="more__item" href="${esc(p.href)}" target="_blank" rel="noopener">
          <span class="more__media"><img src="${esc(asset(p.cover))}"${fallbacks(p.remote)} alt="" width="404" height="316" loading="lazy" decoding="async" /></span>
          <span class="more__title t-mono-xs">${esc(p.title)}</span>
        </a>
      </li>`,
    )
    .join("");
  return `
    <div class="more__head">
      <span class="t-mono-xs">${esc(t("moreOnBehance"))}</span>
      <a class="link-arrow" href="${esc(BEHANCE_PROFILE)}" target="_blank" rel="noopener"><span>${esc(t("allProjects"))}</span><span aria-hidden="true">↗</span></a>
    </div>
    <ul class="more__list">${items}</ul>`;
}

/** Swap a broken local cover for its online original (once per candidate). */
function bindFallbacks(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLImageElement>("img[data-fallback]").forEach((img) => {
    const next = (): void => {
      const list = (img.dataset.fallback ?? "").split(" ").filter(Boolean);
      const url = list.shift();
      img.dataset.fallback = list.join(" ");
      if (url) img.src = url;
      else {
        img.removeEventListener("error", next);
        img.classList.add("is-broken"); // offline and not synced yet: keep the frame clean
      }
    };
    img.addEventListener("error", next);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) next();
  });
}

/** Render Observed Works from structured data into the grid slot. */
export function initWork(root: ParentNode = document): void {
  const grid = root.querySelector<HTMLElement>("[data-work-grid]");
  if (!grid) return;
  const moreSlot = root.querySelector<HTMLElement>("[data-work-more]");
  const render = (): void => {
    grid.innerHTML = projects.map(caseTemplate).join("");
    bindFallbacks(grid);
    if (moreSlot) {
      moreSlot.innerHTML = moreTemplate();
      bindFallbacks(moreSlot);
    }
  };
  render();
  onLangChange(render);
}
