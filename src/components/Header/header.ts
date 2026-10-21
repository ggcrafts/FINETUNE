import { state, subscribe } from "../../state";

/**
 * Header behaviour:
 *  - denser surface once the hero is left behind
 *  - active-state line follows the section in view
 *  - accessible mobile menu
 */
export function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav]"));

  subscribe(() => {
    header.classList.toggle("is-scrolled", state.scroll > 24);
    for (const link of links) {
      link.classList.toggle("is-active", link.dataset.nav === state.activeSection);
      if (link.dataset.nav === state.activeSection) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  });

  initMobileNav(header);
}

function initMobileNav(header: HTMLElement): void {
  const toggle = header.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const panel = header.querySelector<HTMLElement>("[data-mobile-nav]");
  if (!toggle || !panel) return;

  const setOpen = (open: boolean): void => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  panel.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia("(min-width: 900px)").addEventListener("change", (mq) => {
    if (mq.matches) setOpen(false);
  });
}
