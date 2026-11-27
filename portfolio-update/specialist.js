// Portfolio Update — v4 specialist pages.
//
// Diretrizes (checklist de especialista com nota), Posicionamento, Reels, Organizar (quadro de
// cases principais / apoio / lab / arquivo / ocultos), Skills do knob, Versões por vaga, e a
// seção "Posição no portfólio" de cada job. Uses the editor's own field helpers (passed in ctx),
// so every edit goes through the same draft / preview / save flow.

const TIER = { flagship: "Case principal", featured: "Apoio", lab: "Lab", archive: "Arquivo" };
const TIER_HINT = {
  flagship: "Card grande no topo de Selected work. Use 3–4: o que te contratam para fazer.",
  featured: "Grade menor logo abaixo dos cases principais.",
  lab: "Seção Lab (diferencial): making-ofs, pipelines, automações.",
  archive: "Só no índice filtrável (Index). Continua acessível, sem disputar atenção.",
};
const RING = { core: "Núcleo", adjacent: "Adjacente", edge: "Diferencial" };
const RING_HINT = { core: "o que te contratam para fazer (1–3 skills)", adjacent: "você entrega em nível sênior", edge: "o que acelera o pipeline (até 3)" };
const KIND = { main: "Principal", cut: "Versão", breakdown: "Breakdown" };
const ONLINE = "https://ggcrafts.github.io/FINETUNE/v4/";

export function seconds(v) {
  const s = String(v || "").trim(); if (!s) return 0;
  const m = s.match(/^(\d+):(\d{1,2})$/); if (m) return +m[1] * 60 + +m[2];
  const n = parseFloat(s); return Number.isFinite(n) ? n : 0;
}
const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

export function createSpecialist(ctx) {
  const { E, h, field, sec, tr, txt, color, media, videoField, toolPicker, select, changed, renderMain, tv, pad, url, isVideo, toast, slug } = ctx;
  const D = () => E.data, jobs = () => D().jobs, skills = () => D().skills, reels = () => D().reels, profiles = () => D().profiles;
  const shown = (j) => !j.hidden;
  const jobById = (id) => jobs().find((j) => j.id === id);
  const title = (j) => (j.title || "").trim() || j.id;

  /** segmented control: [[value, label], …] */
  function seg(options, value, onPick) {
    const box = h("div", { class: "seg seg--pick", role: "radiogroup" });
    const draw = (v) => box.replaceChildren(...options.map(([val, label]) => h("button", { type: "button", class: val === v ? "on" : "", role: "radio", "aria-checked": String(val === v),
      onclick: () => { onPick(val); draw(val); } }, label)));
    draw(value); return box;
  }
  const move = (arr, i, d) => { const k = i + d; if (k < 0 || k >= arr.length) return false; [arr[i], arr[k]] = [arr[k], arr[i]]; return true; };
  const armed = (label, onGo) => { let on = false; const b = h("button", { class: "mini warn", type: "button", onclick: () => {
    if (!on) { on = true; b.textContent = "Clique de novo"; setTimeout(() => { on = false; b.textContent = label; }, 3000); return; } onGo(); } }, label); return b; };

  /* ───────────── checks: the specialist scorecard ───────────── */
  function checks() {
    const out = [], add = (level, text, go) => out.push({ level, text, go });
    const P = D().positioning || {}, sp = tv(P.specialty, "en").trim(), line = tv(P.line, "en").trim();
    if (!sp) add("err", "Defina sua especialidade — é o título do hero.", { type: "positioning" });
    else if (sp.split(/\s+/).length > 5) add("warn", `Título com ${sp.split(/\s+/).length} palavras: até 5 se lê em um segundo.`, { type: "positioning" });
    else add("ok", `Especialidade: “${sp}”.`, { type: "positioning" });
    if (!line) add("err", "Escreva a frase de posicionamento (uma linha sob o título).", { type: "positioning" });
    else if (line.length > 140) add("warn", `Frase com ${line.length} caracteres: tente ficar abaixo de 140.`, { type: "positioning" });
    else add("ok", "Frase de posicionamento curta.", { type: "positioning" });

    const main = reels().find((r) => r.id === D().primaryReel);
    if (!main) add("err", "Escolha qual reel é o principal.", { type: "reels" });
    else if (!(main.video || "").trim()) add("err", `O reel principal “${tv(main.name)}” ainda não tem vídeo — o site está tocando o primeiro reel que tem.`, { type: "reels" });
    else add("ok", `Reel principal: “${tv(main.name)}”.`, { type: "reels" });
    if (main && (main.video || "").trim()) {
      const s = seconds(main.duration);
      if (!s) add("warn", "Informe a duração do reel principal (aparece no botão Play reel).", { type: "reels" });
      else if (s < 45 || s > 75) add("warn", `Reel principal com ${clock(s)}: o ideal para especialista é 45–75 s.`, { type: "reels" });
      else add("ok", `Duração do reel: ${clock(s)}.`, { type: "reels" });
    }
    if (!reels().some((r) => r.kind === "breakdown" && (r.video || "").trim())) add("warn", "Sem breakdown reel. Para vaga sênior ele mostra profundidade técnica sem poluir o reel.", { type: "reels" });
    else add("ok", "Breakdown reel publicado.", { type: "reels" });

    const fl = jobs().filter((j) => j.tier === "flagship" && shown(j));
    if (fl.length < 2) add("err", `Só ${fl.length} case(s) principal(is). Use 3–4.`, { type: "organize" });
    else if (fl.length > 4) add("warn", `${fl.length} cases principais: mais de 4 dilui a especialidade.`, { type: "organize" });
    else if (fl.length === 2) add("warn", "2 cases principais. Com 3–4 o recrutador vê padrão, não acaso.", { type: "organize" });
    else add("ok", `${fl.length} cases principais.`, { type: "organize" });
    fl.forEach((j) => {
      const miss = [];
      if (!j.cover) miss.push("capa"); if (!(j.video || "").trim()) miss.push("vídeo"); if (!(j.role || "").trim()) miss.push("seu papel");
      if (!tv(j.challenge) && !tv(j.outcome)) miss.push("desafio/resultado"); if (!(j.tools || []).length) miss.push("ferramentas");
      if (!skills().some((s) => s.ring === "core" && (s.jobs || []).includes(j.id))) miss.push("prova de uma skill do núcleo");
      const soft = !(j.breakdown || "").trim();
      if (miss.length) add("warn", `“${title(j)}”: falta ${miss.join(", ")}${soft ? " e breakdown" : ""}.`, { type: "job", id: j.id });
      else if (soft) add("info", `“${title(j)}”: completo — um breakdown deixaria o case mais forte.`, { type: "job", id: j.id });
      else add("ok", `“${title(j)}” completo, com breakdown.`, { type: "job", id: j.id });
    });

    const core = skills().filter((s) => s.ring === "core"), edge = skills().filter((s) => s.ring === "edge");
    if (!core.length) add("err", "Nenhuma skill no núcleo do knob.", { type: "skills" });
    else if (core.length > 3) add("warn", `${core.length} skills no núcleo: especialista tem 1–3.`, { type: "skills" });
    else add("ok", `${core.length} skill(s) no núcleo do knob.`, { type: "skills" });
    if (edge.length > 3) add("warn", `${edge.length} skills de diferencial: até 3 mantém o foco.`, { type: "skills" });
    skills().forEach((s) => {
      const ids = s.jobs || [], vis = ids.filter((id) => { const j = jobById(id); return j && shown(j); }), hid = ids.filter((id) => { const j = jobById(id); return j && !shown(j); });
      if (!vis.length) add(s.ring === "core" ? "warn" : "info", `Skill “${tv(s.name)}” sem prova visível no site.`, { type: "skills" });
      if (hid.length) add("info", `Skill “${tv(s.name)}”: ${hid.map((id) => title(jobById(id))).join(", ")} está oculto e não aparece como prova.`, { type: "skills" });
      if ((tv(s.short) || tv(s.name)).length > 15) add("info", `“${tv(s.name)}”: o nome no anel será encurtado — preencha “Nome no anel”.`, { type: "skills" });
    });

    if (!jobs().some((j) => j.tier === "lab" && shown(j))) add("info", "Lab vazio: é o lugar do seu diferencial (making-ofs, automações).", { type: "organize" });
    profiles().forEach((p) => {
      const r = reels().find((x) => x.id === p.reel);
      if (!r || !(r.video || "").trim()) add("warn", `Versão “${p.label || p.id}”: o reel escolhido não tem vídeo — usa o principal.`, { type: "profiles" });
    });
    const ptMiss = [P.specialty, P.line, P.secondary, ...skills().flatMap((s) => [s.name, s.line]), ...fl.flatMap((j) => [j.context, j.challenge, j.idea, j.execution, j.outcome])]
      .filter((v) => v && typeof v === "object" && (v.en || "").trim() && !(v.pt || "").trim()).length;
    if (ptMiss) add("warn", `${ptMiss} texto(s) importante(s) sem versão PT.`, null);
    return out;
  }
  const score = (list = checks()) => { const graded = list.filter((c) => c.level !== "info"); return graded.length ? Math.round((graded.filter((c) => c.level === "ok").length / graded.length) * 100) : 0; };
  const LEVEL = { ok: "✓", warn: "!", err: "×", info: "i" };
  function checkList(list) {
    return h("ul", { class: "chkl" }, list.map((c) => h("li", { class: "chkl__it " + c.level }, h("i", {}, LEVEL[c.level]), h("span", {}, c.text),
      c.go && h("button", { class: "mini", type: "button", onclick: () => select(c.go) }, "Abrir"))));
  }

  /* ───────────── pages ───────────── */
  function guideForm() {
    const list = checks(), s = score(list), order = { err: 0, warn: 1, info: 2, ok: 3 };
    list.sort((a, b) => order[a.level] - order[b.level]);
    return [
      h("p", { class: "intro" }, "A v4 é um portfólio de especialista: uma especialidade no título, o reel a um clique, 3–4 cases principais e o knob no meio mostrando as skills — cada uma com a prova. Esta página confere o que falta."),
      sec("01", "Prontidão de especialista", `${s}%`,
        h("div", { class: "score" }, h("div", { class: "score__bar" }, h("i", { style: { width: s + "%" } })), h("b", {}, s + "%"),
          h("small", { class: "f__h" }, `${list.filter((c) => c.level === "err").length} crítico(s) · ${list.filter((c) => c.level === "warn").length} atenção · ${list.filter((c) => c.level === "ok").length} ok`)),
        checkList(list)),
      sec("02", "Diretrizes", "o que guia a organização",
        h("ol", { class: "rules" },
          h("li", {}, h("b", {}, "Um título só."), " A especialidade abre o site. Direção de arte e tecnologia criativa entram como “também”."),
          h("li", {}, h("b", {}, "Reel de 45–75 s."), " Só da especialidade, com o plano mais forte nos primeiros 5 segundos. Plano fraco sai."),
          h("li", {}, h("b", {}, "3–4 cases principais."), " Cada um com seu papel claro, desafio → resultado e, se possível, breakdown."),
          h("li", {}, h("b", {}, "O knob prova."), " Cada case principal é prova de pelo menos uma skill do núcleo; cada skill aponta para o trabalho que a comprova."),
          h("li", {}, h("b", {}, "Nada é apagado."), " O que não é especialidade vai para Apoio, Arquivo (índice filtrável) ou Oculto."),
          h("li", {}, h("b", {}, "Lab é diferencial."), " Making-ofs, pipelines e automações mostram como você trabalha, sem competir com os cases."),
          h("li", {}, h("b", {}, "Uma versão por vaga."), " Mesmo site, outro reel e outra ordem de cases: mande o link ?for= certo em cada candidatura."))),
    ];
  }

  function positioningForm() {
    const P = D().positioning;
    return [
      h("p", { class: "intro" }, "O que o recrutador lê no primeiro segundo. Um título (sua especialidade), uma frase e o reel ao lado."),
      sec("01", "Título e frase", "hero",
        h("div", { class: "grid2" },
          field("Especialidade (título do hero)", tr(P, "specialty", { ph: "Senior 3D Motion Designer" }), "Até 5 palavras. Também vira o título da aba e do Google."),
          field("Também (papéis secundários)", tr(P, "secondary", { ph: "Also: Art Direction · Creative Technology" }), "Linha pequena abaixo dos botões."),
          field("Frase de posicionamento", tr(P, "line", { multi: true, rows: 2, ph: "Cinematic CG, VFX and compositing for brands, entertainment and games." }), "Para quem e o quê — até ~140 caracteres. As versões por vaga podem trocar só esta frase.", "full"),
          field("Fatos", tr(P, "facts", { ph: "12+ years · Remote · Curitiba, BR" }), "Linha mono discreta no fim do hero.", "full"))),
      sec("02", "Viewer do hero", "o quadro ao lado do título",
        h("div", { class: "grid2" },
          field("Loop (vídeo curto, sem áudio)", media(P, "loop", { dir: () => "media/hero", maxW: 1920, videos: true, aspect: "16/9", empty: "WebM/MP4 de 4–8 s, 1280–1920 px, sem áudio — o melhor plano da especialidade." })),
          field("Poster (imagem enquanto carrega)", media(P, "poster", { dir: () => "media/hero", maxW: 1920, aspect: "16/9" })))),
    ];
  }

  function reelsForm() {
    const list = reels();
    return [
      h("p", { class: "intro" }, "O reel principal toca no botão “Play reel” (hero e cabeçalho). Versões servem para vagas específicas (escolha em Versões por vaga). O breakdown aparece como aba ao lado do reel."),
      h("div", { class: "row", style: { marginBottom: "14px" } }, h("button", { class: "btn", type: "button", onclick: () => {
        let id = "reel", n = 2; while (list.some((r) => r.id === id)) id = "reel-" + n++;
        list.push({ id, kind: "cut", name: { en: "", pt: "" }, video: "", poster: "", duration: "", note: "" }); changed(); renderMain(); } }, "+ Novo reel")),
      ...list.map((r, i) => {
        const s = seconds(r.duration), idIn = h("input", { class: "in", value: r.id, spellcheck: "false" });
        idIn.addEventListener("change", () => { const old = r.id; let nid = slug(idIn.value) || old; while (list.some((x) => x !== r && x.id === nid)) nid += "-2"; idIn.value = r.id = nid;
          if (D().primaryReel === old) D().primaryReel = nid; profiles().forEach((p) => { if (p.reel === old) p.reel = nid; }); changed(); });
        const prim = h("input", { type: "radio", name: "primaryReel", checked: D().primaryReel === r.id });
        prim.addEventListener("change", () => { D().primaryReel = r.id; changed(); renderMain(); });
        return h("section", { class: "sec" + (D().primaryReel === r.id ? " sec--on" : "") },
          h("header", { class: "sec__h" }, h("i", {}, pad(i + 1)), h("b", {}, tv(r.name) || "Reel sem nome"), h("small", {}, `${KIND[r.kind] || r.kind}${s ? " · " + clock(s) : ""}${(r.video || "").trim() ? "" : " · sem vídeo"}`),
            h("button", { class: "mini", type: "button", onclick: () => { if (move(list, i, -1)) { changed(); renderMain(); } } }, "↑"),
            armed("Excluir", () => { list.splice(i, 1); if (D().primaryReel === r.id) D().primaryReel = (list[0] || {}).id || ""; changed(); renderMain(); })),
          h("div", { class: "sec__b" },
            h("div", { class: "grid3" },
              field("Nome", tr(r, "name", { ph: "3D & VFX Reel 2026" })),
              field("Tipo", seg(Object.entries(KIND), r.kind, (v) => { r.kind = v; changed(); })),
              field("Duração", txt(r, "duration", { ph: "0:58" }), r.kind === "main" ? (s && (s < 45 || s > 75) ? `⚠ ${clock(s)} — ideal 45–75 s` : "Ideal: 45–75 s.") : "m:ss"),
              field("ID", idIn, "Usado nas versões por vaga."),
              h("label", { class: "chk", style: { alignSelf: "end", paddingBottom: "8px" } }, prim, "Reel principal do site"),
              field("Nota (só no editor)", txt(r, "note"))),
            h("div", { class: "grid2" },
              field("Vídeo", videoField(r, "video", { dir: () => "media/reels" }), "Vimeo/YouTube (recomendado para reel longo) ou arquivo importado."),
              field("Poster", media(r, "poster", { dir: () => "media/reels", maxW: 1920, aspect: "16/9" }), "Imagem do quadro antes do play (opcional)."))));
      }),
    ];
  }

  function organizeForm() {
    const COLS = [["flagship", "Cases principais", "3–4 · o que te contratam para fazer"], ["featured", "Apoio", "grade menor sob os cases"], ["lab", "Lab", "diferencial: making-ofs, pipeline"], ["archive", "Arquivo", "só no índice filtrável"], ["hidden", "Ocultos", "não aparecem no site"]];
    const colOf = (j) => (j.hidden ? "hidden" : j.tier || "archive");
    const setCol = (j, c) => { if (c === "hidden") j.hidden = true; else { delete j.hidden; j.tier = c; } };
    let dragId = null;
    const placeBefore = (id, beforeId) => { const arr = jobs(), from = arr.findIndex((x) => x.id === id); if (from < 0) return; const [x] = arr.splice(from, 1); const to = beforeId ? arr.findIndex((y) => y.id === beforeId) : -1; if (to < 0) arr.push(x); else arr.splice(to, 0, x); };
    const card = (j) => {
      const core = skills().filter((s) => (s.jobs || []).includes(j.id));
      const li = h("li", { class: "kc", draggable: "true", title: "Arraste para outra coluna · clique para editar" },
        h("span", { class: "kc__th", style: { backgroundImage: j.cover && !isVideo(j.cover) ? `url("${url(j.cover)}")` : "none" } }),
        h("button", { type: "button", class: "kc__t", onclick: () => select({ type: "job", id: j.id }) }, h("b", {}, title(j)), h("small", {}, [j.client, j.year].filter(Boolean).join(" · ") || j.disciplines || "—")),
        h("span", { class: "kc__f" }, core.length ? h("span", { class: "flag flag--ok", title: core.map((s) => tv(s.name)).join(", ") }, `${core.length} skill`) : null,
          j.tier === "flagship" && !(j.role || "").trim() ? h("span", { class: "flag" }, "papel") : null, j.tier === "flagship" && !(j.breakdown || "").trim() ? h("span", { class: "flag flag--soft" }, "breakdown") : null));
      li.addEventListener("dragstart", (e) => { dragId = j.id; li.classList.add("dragging"); e.dataTransfer.setData("text/x-job", j.id); e.dataTransfer.effectAllowed = "move"; });
      li.addEventListener("dragend", () => { dragId = null; li.classList.remove("dragging"); });
      li.addEventListener("dragover", (e) => { if (!dragId) return; e.preventDefault(); e.stopPropagation(); li.classList.add("drag-over"); });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", (e) => { if (!dragId || dragId === j.id) return; e.preventDefault(); e.stopPropagation(); const d = jobById(dragId); setCol(d, colOf(j)); placeBefore(dragId, j.id); changed(); renderMain(); });
      return li;
    };
    return [
      h("p", { class: "intro" }, "Arraste os jobs entre as colunas. A ordem dentro de cada coluna é a ordem no site (o primeiro case principal vira o card grande). Clique no título para editar o job."),
      h("div", { class: "board" }, COLS.map(([id, t, sub]) => {
        const list = jobs().filter((j) => colOf(j) === id), n = list.length;
        const warn = id === "flagship" && (n < 3 || n > 4);
        const col = h("section", { class: "col col--" + id },
          h("header", { class: "col__h" }, h("b", {}, t), h("span", { class: "col__n" + (warn ? " warn" : "") }, pad(n)), h("small", {}, sub)),
          h("ol", { class: "col__list" }, list.map(card), h("li", { class: "col__drop" }, n ? "solte aqui para pôr no fim" : "arraste jobs para cá")));
        col.addEventListener("dragover", (e) => { if (!dragId) return; e.preventDefault(); col.classList.add("over"); });
        col.addEventListener("dragleave", (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove("over"); });
        col.addEventListener("drop", (e) => { if (!dragId) return; e.preventDefault(); col.classList.remove("over"); const d = jobById(dragId); setCol(d, id);
          const last = list.filter((x) => x.id !== dragId).pop(), arr = jobs(), from = arr.indexOf(d); arr.splice(from, 1);
          const at = last ? arr.indexOf(last) + 1 : arr.length; arr.splice(at, 0, d); changed(); renderMain(); });
        return col;
      })),
    ];
  }

  function proofPicker(s) {
    if (!Array.isArray(s.jobs)) s.jobs = [];
    const box = h("div", { class: "proofp" });
    const draw = () => {
      box.replaceChildren(
        h("ol", { class: "proofp__sel" }, s.jobs.length ? s.jobs.map((id, i) => { const j = jobById(id); return h("li", {}, h("span", { class: "proofp__i" }, pad(i + 1)),
          h("span", { class: "proofp__t" }, j ? title(j) : id + " (removido)"), j && j.hidden ? h("span", { class: "flag" }, "oculto") : null,
          h("button", { class: "mini", type: "button", title: "Subir", onclick: () => { if (move(s.jobs, i, -1)) { changed(); draw(); } } }, "↑"),
          h("button", { class: "mini", type: "button", title: "Tirar", onclick: () => { s.jobs.splice(i, 1); changed(); draw(); } }, "×")); }) : h("li", { class: "f__h" }, "Nenhuma prova. Marque abaixo os jobs que comprovam esta skill.")),
        h("div", { class: "chips" }, jobs().filter((j) => !s.jobs.includes(j.id)).sort((a, b) => (shown(a) === shown(b) ? 0 : shown(a) ? -1 : 1)).map((j) =>
          h("button", { type: "button", class: "tchip" + (j.hidden ? " is-hidden" : ""), title: j.hidden ? "Oculto no site" : TIER[j.tier] || "", onclick: () => { s.jobs.push(j.id); changed(); draw(); } }, "+ " + title(j)))));
    };
    draw(); return box;
  }

  function skillsForm() {
    const list = skills();
    const ringCount = (r) => list.filter((s) => s.ring === r).length;
    return [
      h("p", { class: "intro" }, "As estações do knob, no meio do site. No anel elas aparecem agrupadas: núcleo → adjacente → diferencial, em sentido horário a partir do topo; o núcleo ganha uma fatia maior e um traço mais forte. Cada skill aponta para os jobs que a comprovam — o botão do knob abre o primeiro."),
      h("div", { class: "row", style: { marginBottom: "14px" } },
        h("button", { class: "btn", type: "button", onclick: () => { let id = "nova-skill", n = 2; while (list.some((s) => s.id === id)) id = "nova-skill-" + n++;
          list.push({ id, ring: "adjacent", name: { en: "", pt: "" }, short: { en: "", pt: "" }, line: { en: "", pt: "" }, since: "", tools: [], jobs: [], media: "", tint: "#8fd8ff" }); changed(); renderMain();
          setTimeout(() => { const f = document.querySelector("#form"); f.scrollTop = f.scrollHeight; }, 30); } }, "+ Nova skill"),
        h("small", { class: "f__h" }, `Núcleo ${ringCount("core")} · Adjacente ${ringCount("adjacent")} · Diferencial ${ringCount("edge")} — recomendado: 1–3 · livre · até 3`)),
      ...list.map((s, i) => {
        const idIn = h("input", { class: "in", value: s.id, spellcheck: "false" });
        idIn.addEventListener("change", () => { let nid = slug(idIn.value) || s.id; while (list.some((x) => x !== s && x.id === nid)) nid += "-2"; idIn.value = s.id = nid; changed(); });
        return h("section", { class: "sec sec--" + s.ring },
          h("header", { class: "sec__h" }, h("i", {}, pad(i + 1)), h("b", {}, tv(s.name) || "Nova skill"), h("small", {}, `${RING[s.ring]} · ${(s.jobs || []).length} prova(s)`),
            h("button", { class: "mini", type: "button", title: "Subir", onclick: () => { if (move(list, i, -1)) { changed(); renderMain(); } } }, "↑"),
            h("button", { class: "mini", type: "button", title: "Descer", onclick: () => { if (move(list, i, 1)) { changed(); renderMain(); } } }, "↓"),
            armed("Excluir", () => { list.splice(i, 1); changed(); renderMain(); })),
          h("div", { class: "sec__b" },
            h("div", { class: "grid3" },
              field("Nome", tr(s, "name", { ph: "3D Motion Design" })),
              field("Nome no anel (curto)", tr(s, "short", { ph: "3D Motion" }), "Até ~14 caracteres. Vazio: usa o nome (encurtado se não couber)."),
              field("Anel", seg(Object.entries(RING), s.ring, (v) => { s.ring = v; changed(); }), RING_HINT[s.ring]),
              field("Frase", tr(s, "line", { multi: true, rows: 2 }), "Uma frase concreta: o que você entrega, não a ferramenta.", "full"),
              field("Desde (opcional)", txt(s, "since", { ph: "2014" })),
              field("Cor do LED", color(s, "tint")),
              field("ID", idIn, "Link direto: ?skill=<id>.")),
            h("div", { class: "grid2" },
              field("Prévia atrás do knob", media(s, "media", { dir: () => "media/skills", maxW: 1600, videos: true, aspect: "16/9", empty: "Imagem ou loop curto, aparece em baixa opacidade atrás do dial." })),
              h("div", { class: "f" }, h("span", { class: "f__l" }, "Ferramentas"), toolPicker(s))),
            field("Provas (jobs que comprovam esta skill)", proofPicker(s), "A ordem importa: o botão do knob abre o primeiro.")));
      }),
    ];
  }

  function orderedJobs(p) {
    if (!Array.isArray(p.flagships)) p.flagships = [];
    const box = h("div", { class: "proofp" });
    const pool = () => jobs().filter((j) => shown(j) && (j.tier === "flagship" || j.tier === "featured") && !p.flagships.includes(j.id));
    const draw = () => box.replaceChildren(
      h("ol", { class: "proofp__sel" }, p.flagships.length ? p.flagships.map((id, i) => h("li", {}, h("span", { class: "proofp__i" }, pad(i + 1)), h("span", { class: "proofp__t" }, jobById(id) ? title(jobById(id)) : id + " (removido)"),
        h("button", { class: "mini", type: "button", onclick: () => { if (move(p.flagships, i, -1)) { changed(); draw(); } } }, "↑"),
        h("button", { class: "mini", type: "button", onclick: () => { p.flagships.splice(i, 1); changed(); draw(); } }, "×"))) : h("li", { class: "f__h" }, "Vazio: usa a ordem normal dos cases principais.")),
      h("div", { class: "chips" }, pool().map((j) => h("button", { type: "button", class: "tchip", onclick: () => { p.flagships.push(j.id); changed(); draw(); } }, "+ " + title(j)))));
    draw(); return box;
  }
  function profilesForm() {
    const list = profiles();
    return [
      h("p", { class: "intro" }, "Mesmo site, outra ênfase. Cada versão troca a frase do hero, o reel e a ordem dos cases principais — os jobs que vierem primeiro sobem para o card grande. Mande o link certo em cada candidatura; quem abre não vê nada indicando que é uma versão."),
      h("div", { class: "row", style: { marginBottom: "14px" } }, h("button", { class: "btn", type: "button", onclick: () => {
        let id = "vaga", n = 2; while (list.some((p) => p.id === id)) id = "vaga-" + n++;
        list.push({ id, label: "", line: { en: "", pt: "" }, reel: D().primaryReel || "", flagships: [] }); changed(); renderMain(); } }, "+ Nova versão")),
      ...list.map((p, i) => {
        const idIn = h("input", { class: "in", value: p.id, spellcheck: "false" });
        const link = () => ONLINE + "?for=" + encodeURIComponent(p.id), local = () => "/v4/index.html?for=" + encodeURIComponent(p.id);
        const out = h("code", { class: "linkbox__u" }, link());
        idIn.addEventListener("change", () => { let nid = slug(idIn.value) || p.id; while (list.some((x) => x !== p && x.id === nid)) nid += "-2"; idIn.value = p.id = nid; out.textContent = link(); changed(); });
        const sel = h("select", { class: "in" }, reels().map((r) => h("option", { value: r.id, selected: p.reel === r.id || null }, `${tv(r.name) || r.id}${(r.video || "").trim() ? "" : " (sem vídeo)"}`)));
        sel.addEventListener("change", () => { p.reel = sel.value; changed(); });
        return h("section", { class: "sec" },
          h("header", { class: "sec__h" }, h("i", {}, pad(i + 1)), h("b", {}, p.label || p.id), h("small", {}, "?for=" + p.id), armed("Excluir", () => { list.splice(i, 1); changed(); renderMain(); })),
          h("div", { class: "sec__b" },
            h("div", { class: "grid3" },
              field("Nome (só no editor)", txt(p, "label", { ph: "Games — trailers" })),
              field("ID no link", idIn, "Curto e neutro: games, brand, product…"),
              field("Reel", sel)),
            field("Frase do hero nesta versão", tr(p, "line", { multi: true, rows: 2 }), "Vazio: usa a frase de posicionamento."),
            field("Cases principais nesta ordem", orderedJobs(p), "Escolha entre os cases principais e de apoio. O primeiro vira o card grande."),
            h("div", { class: "linkbox" }, out,
              h("button", { class: "mini", type: "button", onclick: async () => { try { await navigator.clipboard.writeText(link()); toast("Link copiado.", "ok"); } catch { toast("Não copiou — selecione o link e copie.", "warn"); } } }, "Copiar"),
              h("a", { class: "mini", href: local(), target: "_blank", rel: "noopener" }, "Testar local ↗"))));
      }),
    ];
  }

  /** "Posição no portfólio" — first section of every job */
  function jobPosition(j) {
    const own = checks().filter((c) => c.go && c.go.type === "job" && c.go.id === j.id);
    const hint = h("small", { class: "f__h" }, TIER_HINT[j.tier || "archive"]);
    return sec("00", "Posição no portfólio", "onde o job aparece na v4",
      h("div", { class: "grid2" },
        h("div", { class: "f" }, h("span", { class: "f__l" }, "Lugar"), seg(Object.entries(TIER), j.tier || "archive", (v) => { j.tier = v; hint.textContent = TIER_HINT[v]; changed(); }), hint),
        field("Meu papel", txt(j, "role", { ph: "Direção de arte, 3D, composição" }), "Obrigatório nos cases principais: o que foi seu — aparece em destaque no card e no case."),
        h("div", { class: "f full" }, h("span", { class: "f__l" }, "Prova das skills (knob)"),
          h("div", { class: "chips" }, skills().map((s) => {
            const cb = h("input", { type: "checkbox", checked: (s.jobs || []).includes(j.id) });
            cb.addEventListener("change", () => { s.jobs = (s.jobs || []).filter((x) => x !== j.id); if (cb.checked) s.jobs.push(j.id); changed(); });
            return h("label", { class: "chk chk--" + s.ring }, cb, tv(s.name) || s.id);
          })),
          h("small", { class: "f__h" }, "Marca este job como prova da skill. A ordem das provas se ajusta na página Skills.")),
        field("Breakdown", videoField(j, "breakdown", { dir: () => `media/${j.id}` }), "Antes/depois, passes, viewport ou comp. Vira uma aba no case e o card ganha o selo “Breakdown”.", "full"),
        own.length ? h("div", { class: "full" }, checkList(own)) : null));
  }

  return { checks, score, guideForm, positioningForm, reelsForm, organizeForm, skillsForm, profilesForm, jobPosition };
}
