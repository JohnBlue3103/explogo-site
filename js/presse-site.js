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

  // Article déposé en PDF : son contenu s'affiche directement dans la page.
  // Les navigateurs mobiles n'affichent pas toujours un PDF intégré : le
  // bouton « Ouvrir le PDF » reste là dans tous les cas.
  const cartePdf = (a) => `
      <article class="presse-pdf">
        ${a.titre ? `<h3 class="presse-titre">${esc(a.titre)}</h3>` : ""}
        <object class="presse-pdf-vue" data="${esc(a.pdfUrl)}#view=FitH&toolbar=1" type="application/pdf">
          <p class="presse-pdf-secours">Ton navigateur n’affiche pas le PDF ici.</p>
        </object>
        <div class="presse-boutons">
          <a class="btn btn-secondary" href="${esc(a.pdfUrl)}" target="_blank" rel="noopener">Ouvrir le PDF</a>
          ${a.lien ? `<a class="btn btn-primary" href="${esc(a.lien)}" target="_blank" rel="noopener">Voir l’article en ligne</a>` : ""}
        </div>
      </article>`;

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
      if (Array.isArray(articles) && articles.length) {
        liste.innerHTML = articles.map((a) => (a.pdfUrl ? cartePdf(a) : carte(a))).join("");
      }
    })
    .catch(() => { /* on garde l'article écrit en dur */ });
})();
