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
  const carteLecture = (a, i) => {
    const credit = [
      a.journaliste ? `Article de ${esc(a.journaliste)}` : "Article",
      a.media && `publié sur ${esc(a.media)}`,
      a.datePublication && `le ${date(a.datePublication)}`,
    ].filter(Boolean).join(" ");
    return `
      <article class="presse-lecture">
        <div class="presse-pages" id="pressePages${i}" data-pdf="${esc(a.pdfUrl)}">
          <p class="presse-pages-chargement">Chargement de l’article…</p>
        </div>
        <p class="presse-credit-article">
          ${credit}. Reproduit avec l’autorisation de l’auteure.
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
        const vue = page.getViewport({ scale: (largeur / base.width) * densite });
        const canvas = document.createElement("canvas");
        canvas.width = vue.width;
        canvas.height = vue.height;
        canvas.className = "presse-page";
        canvas.setAttribute("aria-label", `Page ${n} de l’article`);
        zone.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vue }).promise;
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
