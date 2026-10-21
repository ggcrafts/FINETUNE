/**
 * FineTune — entry point. Phase 01: foundation and hierarchy.
 * Order matters: tokens → typography → global → layout → components → responsive.
 */

// Fonts — npm-bundled and self-hosted, no third-party CDN at runtime.
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/global.css";
import "./styles/layout.css";

import "./components/Header/header.css";
import "./components/Hero/hero.css";
import "./components/Reel/reel.css";
import "./components/Philosophy/philosophy.css";
import "./components/Practices/practices.css";
import "./components/Work/work.css";
import "./components/Process/process.css";
import "./components/Lab/lab.css";
import "./components/About/about.css";
import "./components/Contact/contact.css";
import "./components/Footer/footer.css";
import "./components/Tools/tools.css";

import "./styles/responsive.css";

import { state, startState } from "./state";
import { estimateQuality } from "./utils/device";
import { initHeader } from "./components/Header/header";
import { initPractices } from "./components/Practices/practices";
import { initWork } from "./components/Work/work";
import { initDebug } from "./debug/debug";
import { initHeroWebgl } from "./components/Hero/heroWebgl";
import { initFormType, refreshFormWord } from "./components/Hero/formType";
import { initI18n, onLangChange } from "./i18n/i18n";
import { initStack } from "./motion/stack";
import { initAmbient } from "./motion/ambient";
import { initReel } from "./components/Reel/reel";
import { initSpectrum } from "./motion/spectrum";
import { initLineWaves } from "./effects/lineWaves";
import { initTools } from "./components/Tools/tools";
import { initBlackHole } from "./effects/blackHole";
import { initProcess } from "./components/Process/process";
import { initTerminal } from "./components/Lab/terminal";
import { initReveal } from "./components/Philosophy/reveal";
import { initBgParticles } from "./effects/bgParticles";
import { createReadout } from "./components/Hero/readout";

function boot(): void {
  document.documentElement.classList.add("js");
  state.quality = estimateQuality();

  initWork();
  initI18n();
  onLangChange(() => refreshFormWord());
  void initTools();
  initPractices();
  initReel();
  startState();
  initStack();
  initAmbient();
  initSpectrum();
  initLineWaves();
  initBlackHole();
  initProcess();
  initTerminal();
  initReveal();
  initBgParticles();
  initHeader();
  initDebug();
  void initHeroWebgl();
  initFormType(createReadout());

  const year = document.querySelector<HTMLElement>("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
