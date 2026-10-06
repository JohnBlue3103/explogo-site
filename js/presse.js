/* =============================================================
   PRESSE — articles de la section « On parle de nous » du site
   (API /api/presse/admin, fichiers PDF / photo sur MinIO)
   ============================================================= */

let pbArticles = [];
let pbCourant = null; // article en cours d'édition (null = nouveau, pas encore enregistré)

function showPresse() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("presse");
  pbFermer();
  pbCharger();
}

function pbEchapper(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function pbDate(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function pbMessageErreur(res) {
  try { return (await res.json()).message || `Erreur ${res.status}`; } catch { return `Erreur ${res.status}`; }
}

async function pbCharger() {
  const liste = document.getElementById("pbListe");
  liste.innerHTML = '<p class="pb-vide">Chargement…</p>';
  try {
    const res = await apiFetch("/api/presse/admin");
    if (!res.ok) throw new Error(await pbMessageErreur(res));
    pbArticles = await res.json();
    pbAfficherListe();
  } catch (e) {
    liste.innerHTML = `<p class="pb-vide">Impossible de charger les articles : ${pbEchapper(e.message)}</p>`;
  }
}

function pbAfficherListe() {
  const liste = document.getElementById("pbListe");
  if (!pbArticles.length) {
    liste.innerHTML = '<p class="pb-vide">Aucun article pour l’instant. Clique sur « + Nouvel article ».</p>';
    return;
  }
  liste.innerHTML = pbArticles.map((a) => `
    <article class="pb-carte">
      ${a.photoUrl ? `<img src="${pbEchapper(a.photoUrl)}" alt="">` : '<div class="pb-carte-sansphoto">📰</div>'}
      <div class="pb-carte-texte">
        <p class="pb-carte-meta">${pbEchapper(a.media || "")}${a.datePublication ? " · " + pbDate(a.datePublication) : ""}
          ${a.publie ? '<span class="pb-tag pb-tag-ok">Publié</span>' : '<span class="pb-tag">Non publié</span>'}
          ${a.pdfUrl ? '<span class="pb-tag">PDF</span>' : ""}</p>
        <h3>${pbEchapper(a.titre)}</h3>
      </div>
      <div class="pb-carte-actions">
        <button class="btn-outline" onclick="pbModifier('${a.id}')">Modifier</button>
        <button class="btn-outline btn-danger" onclick="pbSupprimer('${a.id}')">Supprimer</button>
      </div>
    </article>`).join("");
}

function pbNouveau() {
  pbCourant = null;
  pbRemplir({ publie: true });
  document.getElementById("pbFormTitre").textContent = "Nouvel article";
  pbOuvrir();
}

function pbModifier(id) {
  pbCourant = pbArticles.find((a) => a.id === id) || null;
  if (!pbCourant) return;
  pbRemplir(pbCourant);
  document.getElementById("pbFormTitre").textContent = "Modifier l’article";
  pbOuvrir();
}

function pbOuvrir() {
  const f = document.getElementById("pbForm");
  f.classList.remove("hidden");
  f.scrollIntoView({ behavior: "smooth", block: "start" });
}

function pbFermer() {
  document.getElementById("pbForm")?.classList.add("hidden");
  pbCourant = null;
}

function pbRemplir(a) {
  document.getElementById("pbTitre").value = a.titre || "";
  document.getElementById("pbMedia").value = a.media || "";
  document.getElementById("pbJournaliste").value = a.journaliste || "";
  document.getElementById("pbDate").value = a.datePublication || "";
  document.getElementById("pbLien").value = a.lien || "";
  document.getElementById("pbResume").value = a.resume || "";
  document.getElementById("pbPublie").checked = a.publie !== false;
  pbEtatDepots();
}

function pbChamps() {
  return {
    titre: document.getElementById("pbTitre").value,
    media: document.getElementById("pbMedia").value,
    journaliste: document.getElementById("pbJournaliste").value,
    datePublication: document.getElementById("pbDate").value,
    lien: document.getElementById("pbLien").value,
    resume: document.getElementById("pbResume").value,
    publie: document.getElementById("pbPublie").checked,
  };
}

/** Enregistre l'article (création ou modification). Retourne l'article ou null. */
async function pbSauver() {
  const champs = pbChamps();
  if (!champs.titre.trim()) {
    alert("Le titre est obligatoire (il faut l’enregistrer avant d’envoyer un fichier).");
    return null;
  }
  const res = pbCourant
    ? await apiFetch(`/api/presse/admin/${pbCourant.id}`, { method: "PUT", body: JSON.stringify(champs) })
    : await apiFetch("/api/presse/admin", { method: "POST", body: JSON.stringify(champs) });
  if (!res.ok) { alert(await pbMessageErreur(res)); return null; }
  pbCourant = await res.json();
  document.getElementById("pbFormTitre").textContent = "Modifier l’article";
  return pbCourant;
}

async function pbEnregistrer(e) {
  e.preventDefault();
  if (await pbSauver()) {
    await pbCharger();
    pbFermer();
  }
}

async function pbSupprimer(id) {
  const a = pbArticles.find((x) => x.id === id);
  if (!confirm(`Supprimer l’article « ${a?.titre || ""} » ?`)) return;
  const res = await apiFetch(`/api/presse/admin/${id}`, { method: "DELETE" });
  if (!res.ok) { alert(await pbMessageErreur(res)); return; }
  pbCharger();
}

/* ----- Glisser-déposer : PDF et photo ----- */

function pbEtatDepots() {
  document.querySelectorAll(".pb-depot").forEach((zone) => {
    const type = zone.dataset.type;
    const url = pbCourant?.[type === "pdf" ? "pdfUrl" : "photoUrl"];
    zone.querySelector(".pb-depot-etat").innerHTML = url
      ? `✅ <a href="${pbEchapper(url)}" target="_blank" rel="noopener">${type === "pdf" ? "PDF en ligne" : "Photo en ligne"}</a>
         · <a href="#" onclick="pbRetirerFichier(event, '${type}')">retirer</a>`
      : "";
  });
}

async function pbEnvoyerFichier(type, fichier) {
  const zone = document.querySelector(`.pb-depot[data-type="${type}"]`);
  const etat = zone.querySelector(".pb-depot-etat");
  if (type === "pdf" && fichier.type !== "application/pdf") { alert("Ce fichier n’est pas un PDF."); return; }
  if (type === "photo" && !/^image\/(jpeg|png|webp)$/.test(fichier.type)) { alert("Photo en JPEG, PNG ou WebP."); return; }

  // l'article doit exister avant d'y attacher un fichier : sans titre saisi,
  // on prend le nom du PDF (déposer le fichier suffit)
  const titre = document.getElementById("pbTitre");
  if (!titre.value.trim()) titre.value = fichier.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!pbCourant && !(await pbSauver())) return;

  etat.textContent = `Envoi de « ${fichier.name} »…`;
  const corps = new FormData();
  corps.append("type", type);
  corps.append("file", fichier);
  // pas d'apiFetch ici : il imposerait Content-Type JSON, le navigateur doit
  // poser lui-même l'en-tête multipart
  const res = await fetch(`${API}/api/presse/admin/${pbCourant.id}/fichier`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: corps,
  });
  if (!res.ok) { etat.textContent = ""; alert(await pbMessageErreur(res)); return; }
  pbCourant = await res.json();
  pbEtatDepots();
  pbCharger();
}

async function pbRetirerFichier(e, type) {
  e.preventDefault();
  if (!pbCourant || !confirm(type === "pdf" ? "Retirer le PDF de cet article ?" : "Retirer la photo de cet article ?")) return;
  const res = await apiFetch(`/api/presse/admin/${pbCourant.id}/fichier?type=${type}`, { method: "DELETE" });
  if (!res.ok) { alert(await pbMessageErreur(res)); return; }
  pbCourant = await res.json();
  pbEtatDepots();
  pbCharger();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pb-depot").forEach((zone) => {
    const input = zone.querySelector("input[type=file]");
    const type = zone.dataset.type;
    zone.addEventListener("click", (e) => { if (e.target.tagName !== "A") input.click(); });
    input.addEventListener("change", () => { if (input.files[0]) pbEnvoyerFichier(type, input.files[0]); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("pb-survol"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("pb-survol"); }));
    zone.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) pbEnvoyerFichier(type, f); });
  });
});
