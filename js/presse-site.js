// Section « On parle de nous » : affiche les articles gérés dans le back
// office (onglet Presse). Si l'API ne répond pas ou n'a encore aucun article,
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

  const carte = (a) => {
    const meta = [a.media && `<span class="presse-media">${esc(a.media)}</span>`, date(a.datePublication),
      a.journaliste && `par ${esc(a.journaliste)}`].filter(Boolean).join(" · ");
    const boutons = [
      a.lien && `<a class="btn btn-primary" href="${esc(a.lien)}" target="_blank" rel="noopener">Lire l’article${a.media ? " sur " + esc(a.media) : ""}</a>`,
      a.pdfUrl && `<a class="btn btn-secondary" href="${esc(a.pdfUrl)}" target="_blank" rel="noopener">Voir le PDF</a>`,
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
      if (Array.isArray(articles) && articles.length) liste.innerHTML = articles.map(carte).join("");
    })
    .catch(() => { /* on garde l'article écrit en dur */ });
})();
