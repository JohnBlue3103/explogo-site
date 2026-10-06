// Section « On parle de nous » : affiche, en carte de présentation (photo,
// résumé, lien vers l'article), les articles du back office (onglet Presse). Si l'API ne répond pas ou n'a encore aucun article,
// l'article écrit en dur dans index.html reste affiché.
// ?env=recette sur l'URL du site -> API de recette (pour tester avant la prod).
(() => {
  const liste = document.getElementById("presseListe");
  if (!liste) return;

  const recette = new URLSearchParams(location.search).get("env") === "recette";
  const API = recette ? "https://api-recette.explogo.fr" : "https://api.explogo.fr";

  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const date = (iso) => iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";
  // un paragraphe par bloc séparé d'une ligne vide
  const paragraphes = (txt) => String(txt || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

  // Article déposé en PDF (publié avec l'autorisation de l'auteure) : ses
  // pages sont dessinées directement dans la page avec pdf.js, ce qui marche
  // aussi sur téléphone (les navigateurs mobiles n'affichent pas un PDF intégré).
  // « actu.fr » saisi dans le back office -> « Actu.fr » ; rien -> « Presse »
  const nomMedia = (m) => {
    const t = String(m || "").trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Presse";
  };

  const carteLecture = (a, i) => {
    const credit = [
      a.journaliste ? `Article de ${esc(a.journaliste)}` : "Article",
      a.media && `publié sur ${esc(a.media)}`,
      a.datePublication && `le ${date(a.datePublication)}`,
    ].filter(Boolean).join(" ");
    return `
      <article class="presse-lecture">
        <p class="presse-lecture-media">${esc(nomMedia(a.media))}</p>
        <div class="presse-pages" id="pressePages${i}" data-pdf="${esc(a.pdfUrl)}">
          <p class="presse-pages-chargement">Chargement de l’article…</p>
        </div>
        <p class="presse-credit-article">
          ${credit}.
          ${a.lien ? `<a href="${esc(a.lien)}" target="_blank" rel="noopener">Voir l’article d’origine</a>` : ""}
        </p>
      </article>`;
  };

  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  let pdfjs = null;
  const chargerPdfjs = () => pdfjs || (pdfjs = new Promise((ok, ko) => {
    const sc = document.createElement("script");
    sc.src = PDFJS + "pdf.min.js";
    sc.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
      ok(window.pdfjsLib);
    };
    sc.onerror = ko;
    document.head.appendChild(sc);
  }));

  /**
   * Recadre une page sur son contenu (enlève les marges blanches). Les traits
   * fins qui longent toute la page (bordure verticale du PDF) ne comptent pas
   * comme du contenu : sinon ils gardaient tout le bas de page, vide.
   */
  function rogner(src) {
    const { width: w, height: h } = src;
    const px = src.getContext("2d").getImageData(0, 0, w, h).data;
    const pas = 2; // échantillonnage : assez précis, bien plus rapide
    const nx = Math.ceil(w / pas), ny = Math.ceil(h / pas);
    const ligne = new Uint32Array(ny), colonne = new Uint32Array(nx);
    for (let j = 0; j < ny; j++) {
      const y = j * pas;
      for (let i = 0; i < nx; i++) {
        const k = (y * w + i * pas) * 4;
        if (px[k] < 235 || px[k + 1] < 235 || px[k + 2] < 235) { ligne[j]++; colonne[i]++; }
      }
    }
    // colonne de bordure : marquée sur presque toute la hauteur
    const bordure = (i) => colonne[i] > ny * 0.85;
    // ligne de contenu : quelques points marqués hors des bordures
    const contenuLigne = (j) => {
      let n = ligne[j];
      for (let i = 0; i < nx && n > 0; i++) if (bordure(i)) n--; // approx : 1 point par bordure
      return n > 2;
    };
    let haut = -1, bas = -1, gauche = -1, droite = -1;
    for (let j = 0; j < ny; j++) if (contenuLigne(j)) { if (haut < 0) haut = j; bas = j; }
    for (let i = 0; i < nx; i++) if (colonne[i] > 2 && !bordure(i)) { if (gauche < 0) gauche = i; droite = i; }
    if (haut < 0 || gauche < 0) return src; // page blanche : on garde tout
    const marge = Math.round(w * 0.02);
    const x0 = Math.max(0, gauche * pas - marge), y0 = Math.max(0, haut * pas - marge);
    const x1 = Math.min(w, droite * pas + marge), y1 = Math.min(h, bas * pas + marge);
    const out = document.createElement("canvas");
    out.width = x1 - x0;
    out.height = y1 - y0;
    out.getContext("2d").drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  /** Page en plein écran, en grand (défilement + zoom du téléphone) ; toucher pour fermer. */
  function agrandir(canvas) {
    const fond = document.createElement("div");
    fond.className = "presse-zoom";
    fond.setAttribute("role", "dialog");
    fond.setAttribute("aria-label", "Page agrandie (toucher pour fermer)");
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/jpeg", 0.92);
    img.alt = canvas.getAttribute("aria-label") || "";
    fond.appendChild(img);
    const fermer = () => { fond.remove(); document.body.style.overflow = ""; };
    fond.addEventListener("click", fermer);
    document.addEventListener("keydown", function echap(e) {
      if (e.key === "Escape") { fermer(); document.removeEventListener("keydown", echap); }
    });
    document.body.style.overflow = "hidden";
    document.body.appendChild(fond);
  }

  async function dessinerPages(zone) {
    try {
      const lib = await chargerPdfjs();
      const doc = await lib.getDocument(zone.dataset.pdf).promise;
      zone.innerHTML = "";
      const largeur = zone.clientWidth || 800;
      const densite = Math.min(window.devicePixelRatio || 1, 2);
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        // rendu net (x2 la largeur affichée, pour pouvoir agrandir), puis
        // marges blanches rognées : le texte prend toute la largeur
        const vue = page.getViewport({ scale: (largeur / base.width) * densite * 2 });
        const brut = document.createElement("canvas");
        brut.width = vue.width;
        brut.height = vue.height;
        const ctx = brut.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: vue }).promise;
        const canvas = rogner(brut);
        canvas.className = "presse-page";
        canvas.setAttribute("role", "button");
        canvas.setAttribute("aria-label", `Page ${n} de l’article (toucher pour agrandir)`);
        canvas.addEventListener("click", () => agrandir(canvas));
        zone.appendChild(canvas);
      }
    } catch {
      // en dernier recours, lien vers le PDF
      zone.innerHTML = `<p class="presse-pages-chargement"><a href="${esc(zone.dataset.pdf)}" target="_blank" rel="noopener">Lire l’article (PDF)</a></p>`;
    }
  }

  const carte = (a) => {
    const meta = [a.media && `<span class="presse-media">${esc(a.media)}</span>`, date(a.datePublication),
      a.journaliste && `par ${esc(a.journaliste)}`].filter(Boolean).join(" · ");
    const boutons = [
      a.lien && `<a class="btn btn-primary" href="${esc(a.lien)}" target="_blank" rel="noopener">Lire l’article${a.media ? " sur " + esc(a.media) : ""}</a>`,
    ].filter(Boolean).join("");
    return `
      <article class="presse-carte">
        ${a.photoUrl ? `
        <div class="presse-photos presse-photo-unique">
          <figure><img src="${esc(a.photoUrl)}" loading="lazy" alt="${esc(a.titre)}"></figure>
        </div>` : ""}
        <div class="presse-texte"${a.photoUrl ? "" : ' style="grid-column: 1 / -1"'}>
          ${meta ? `<p class="presse-source">${meta}</p>` : ""}
          <h3 class="presse-titre">${esc(a.titre)}</h3>
          ${paragraphes(a.resume)}
          ${boutons ? `<div class="presse-boutons">${boutons}</div>` : ""}
        </div>
      </article>`;
  };

  fetch(`${API}/api/presse`)
    .then((r) => (r.ok ? r.json() : []))
    .then((articles) => {
      // article en PDF -> lecture intégrée ; sinon carte de présentation
      // (un article sans PDF ni résumé n'est pas affiché). Rien à afficher :
      // la carte écrite dans index.html reste en place.
      const affichables = Array.isArray(articles)
        ? articles.filter((a) => a.pdfUrl || (a.resume || "").trim()) : [];
      if (!affichables.length) return;
      liste.innerHTML = affichables.map((a, i) => (a.pdfUrl ? carteLecture(a, i) : carte(a))).join("");
      liste.querySelectorAll(".presse-pages").forEach(dessinerPages);
    })
    .catch(() => { /* on garde l'article écrit en dur */ });
})();
