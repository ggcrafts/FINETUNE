/**
 * Project data — Phase 01 source of truth for Observed Works (spec §25, §48).
 * Kept CMS-free on purpose; the shape maps cleanly to Sanity/Contentful later.
 *
 * Featured cases link to their original Behance pages. Covers are the Behance
 * project covers: scripts/sync-covers.mjs downloads them into
 * public/assets/projects/covers/ (run automatically with npm run dev/build);
 * until then the page falls back to the online image (`remote`).
 * `context` lines are kept for future case pages (not shown on the cards).
 */

export interface ProjectMedia {
  src: string;
  /** original image online (Behance CDN) — used if the local copy is missing */
  remote?: string;
  width: number;
  height: number;
  alt: string;
  placeholder: boolean;
}

export interface Project {
  slug: string;
  index: string;
  title: string;
  client?: string;
  disciplines: string[];
  context: string;
  /** PT-BR copy (title and client names stay as they are) */
  pt: { disciplines: string[]; context: string };
  href: string;
  /** opens the original project page in a new tab */
  external?: boolean;
  featured: boolean;
  media: ProjectMedia;
}

export const projects: Project[] = [
  {
    slug: "hbo-bff",
    index: "01",
    title: "BFF Nossa Voz",
    client: "HBO Max",
    disciplines: ["VFX", "3D", "Compositing"],
    context: "VFX, 3D and compositing for an HBO Max campaign piece.",
    pt: { disciplines: ["VFX", "3D", "Composição"], context: "VFX, 3D e composição para uma peça de campanha da HBO Max." },
    href: "https://www.behance.net/gallery/194284575/VFX-HBOMax-BFF-Nossa-Voz",
    external: true,
    featured: true,
    media: {
      src: "/assets/projects/covers/hbo-bff.png",
      remote: "https://mir-s3-cdn-cf.behance.net/projects/808/616e16194284575.Y3JvcCwyMzUwLDE4MzgsNzQ0LDE2Mg.png",
      width: 808,
      height: 632,
      alt: "HBO Max — BFF Nossa Voz, project cover",
      placeholder: false,
    },
  },
  {
    slug: "bravecto",
    index: "02",
    title: "Bravecto Experience",
    disciplines: ["Art Direction", "3D", "Immersive Experience"],
    context: "Art direction and 3D for an immersive brand experience.",
    pt: { disciplines: ["Direção de Arte", "3D", "Experiência Imersiva"], context: "Direção de arte e 3D para uma experiência de marca imersiva." },
    href: "https://www.behance.net/gallery/195282279/Bravecto-Experience-Direcao-de-projeto",
    external: true,
    featured: true,
    media: {
      src: "/assets/projects/covers/bravecto.png",
      remote: "https://mir-s3-cdn-cf.behance.net/projects/808/635b30195282279.Y3JvcCw3ODksNjE3LDExNSwyMTQ.png",
      width: 808,
      height: 632,
      alt: "Bravecto Experience, project cover",
      placeholder: false,
    },
  },
  {
    slug: "yes",
    index: "03",
    title: "Diga Sim ao Mundo",
    client: "YES! Idiomas",
    disciplines: ["Motion Design", "VFX", "Visual Storytelling"],
    context: "Motion design and VFX building the story of a language-school campaign.",
    pt: { disciplines: ["Motion Design", "VFX", "Storytelling Visual"], context: "Motion design e VFX construindo a história de uma campanha de escola de idiomas." },
    href: "https://www.behance.net/gallery/194456335/Vinheta-YES-Idiomas-Diga-Sim-ao-Mundo-Diga-YES",
    external: true,
    featured: true,
    media: {
      src: "/assets/projects/covers/yes.png",
      remote: "https://mir-s3-cdn-cf.behance.net/projects/808/09cdfa194456335.Y3JvcCwyMDY3LDE2MTcsOTUxLDA.png",
      width: 808,
      height: 632,
      alt: "YES! Idiomas — Diga Sim ao Mundo, project cover",
      placeholder: false,
    },
  },
  {
    slug: "generative-video",
    index: "04",
    title: "Generative Video Workflow",
    disciplines: ["AI", "Blender Previsualization", "Creative Workflows"],
    context: "A production workflow pairing Blender previsualization with AI video generation — layout and camera stay directed, generation explores the look.",
    pt: { disciplines: ["IA", "Previsualização em Blender", "Workflows Criativos"], context: "Um workflow de produção que une previsualização no Blender e geração de vídeo com IA — layout e câmera seguem dirigidos, a geração explora o visual." },
    href: "#lab", // no public page yet — points to the Lab
    featured: false,
    media: {
      src: "/assets/projects/placeholder-04.webp",
      width: 1200,
      height: 300,
      alt: "",
      placeholder: true,
    },
  },
];

/** More projects — compact strip under the grid, each links to Behance. */
export interface MoreProject {
  slug: string;
  title: string;
  href: string;
  cover: string;  // local copy
  remote: string; // Behance cover
}

const C = "https://mir-s3-cdn-cf.behance.net/projects/404/";
const more = (slug: string, title: string, href: string, img: string): MoreProject => ({
  slug, title, href, cover: `/assets/projects/covers/${slug}.png`, remote: C + img,
});

export const moreProjects: MoreProject[] = [
  more("hbo-use-sua-voz", "HBO Max — Use Sua Voz", "https://www.behance.net/gallery/194283311/Abertura-HBOMax-Use-Sua-Voz", "bb9938194283311.Y3JvcCwyMzcyLDE4NTYsMjc2LDA.png"),
  more("melhor-verao", "VFX — O Melhor Verão das Nossas Vidas", "https://www.behance.net/gallery/143936867/VFX-Abertura-O-MELHOR-VERAO-DAS-NOSSAS-VIDAS", "fc748d143936867.Y3JvcCwxMjQwLDk2OSwwLDQyMA.png"),
  more("amor-de-deus", "Videoclipe — O Amor de Deus", "https://www.behance.net/gallery/224321809/Videoclipe-O-Amor-de-Deus", "f5adc2224321809.Y3JvcCwxMDA3LDc4OCwxOTcsMA.png"),
  more("oferta-agradavel", "Gabriel Guedes — Oferta Agradável", "https://www.behance.net/gallery/162337985/Gabriel-Guedes-Oferta-Agradavel-LYRIC", "c6895a162337985.Y3JvcCwxMjg3LDEwMDcsNjI0LDA.png"),
  more("a-bencao", "A Benção — Ilustrações", "https://www.behance.net/gallery/161720977/A-Bencao-Gabriel-Guedes-Ilustracoes", "45b062161720977.Y3JvcCwxNTE2LDExODUsMCww.png"),
  more("cleopatra", "Cleopatra — Parallax animation", "https://www.behance.net/gallery/144381729/Paralax-animation-for-Mobile-game-Cleopatra", "51c4c6144381729.Y3JvcCwxODk5LDE0ODYsNzAsMA.png"),
  more("conectivo", "Conectivo — SAE Digital", "https://www.behance.net/gallery/144190393/Conectivo-Matriculas-abertas-(SAE-Digital)", "fae0b1144190393.Y3JvcCwxNDE2LDExMDgsMjQxLDA.png"),
  more("true-riches", "TRUE RICHE$ — Teaser", "https://www.behance.net/gallery/143962405/TRUE-RICHES-TWE-WAY-SERVICE-TEASER", "8ffd13143962405.Y3JvcCwyNTA1LDE5NjAsNzgxLDA.png"),
  more("alcance-kids", "Alcance KIDS — Vinhetas", "https://www.behance.net/gallery/143961197/Alcance-KIDS-Vinhetas", "a479a9143961197.Y3JvcCwxMzY1LDEwNjgsMjcwLDA.png"),
];

export const BEHANCE_PROFILE = "https://www.behance.net/lgczaika";
