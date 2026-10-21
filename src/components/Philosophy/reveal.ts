import { onFrame } from "../../state";
import { onLangChange } from "../../i18n/i18n";

/**
 * Gradual word reveal: letters of a key word form one by one (blur → focus,
 * light → full weight) when its section is reached; it rewinds when the
 * visitor returns to the top, so it plays again.
 */

export function splitReveal(el: HTMLElement): void {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text);
  el.innerHTML = Array.from(text)
    .map((ch, i) => `<span class="reveal-l" aria-hidden="true" style="--i:${i}">${ch === " " ? "&nbsp;" : ch}</span>`)
    .join("");
}

export function initReveal(): void {
  let words = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (words.length === 0) return;
  words.forEach(splitReveal);
  document.documentElement.classList.add("has-reveal");

  // the heading is re-rendered on language change: split again, keep state
  onLangChange(() => {
    const revealed = words.some((w) => w.classList.contains("is-revealed"));
    words = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    words.forEach((w) => {
      splitReveal(w);
      if (revealed) w.classList.add("is-revealed");
    });
  });

  onFrame((s) => {
    const vh = window.innerHeight;
    for (const w of words) {
      const top = w.getBoundingClientRect().top;
      const on = s.reducedMotion || (window.scrollY > 40 && top < vh * 0.72);
      if (on && !w.classList.contains("is-revealed")) w.classList.add("is-revealed");
      else if (!on && window.scrollY < 20 && w.classList.contains("is-revealed")) w.classList.remove("is-revealed");
    }
  });
}
