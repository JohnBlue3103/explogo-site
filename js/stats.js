/* =============================================================
   STATISTIQUES — comment l'appli est utilisée (API /api/admin/stats)
   Tuiles chiffrées, séries par jour (barres, valeur au survol),
   classements en barres horizontales. Une seule série par graphique.
   ============================================================= */

let stJours = 30;

function showStats() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("stats");
  stCharger();
}

function stPeriode(j) {
  stJours = j;
  document.querySelectorAll("[data-st-jours]").forEach((b) => b.classList.toggle("active", Number(b.dataset.stJours) === j));
  stCharger();
}

const stEch = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stNb = (n) => Number(n || 0).toLocaleString("fr-FR");
const stPct = (a, b) => (b > 0 ? Math.round((100 * a) / b) + " %" : "—");
const stJourCourt = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

async function stCharger() {
  const el = document.getElementById("stContenu");
  el.innerHTML = '<p class="st-vide">Chargement…</p>';
  try {
    const res = await apiFetch(`/api/admin/stats?jours=${stJours}`);
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    stAfficher(await res.json());
  } catch (e) {
    el.innerHTML = `<p class="st-vide">Impossible de charger les statistiques : ${stEch(e.message)}</p>`;
  }
}

/* ===== Briques ===== */

function stTuile(titre, valeur, sous) {
  return `<div class="st-tuile"><div class="st-tuile-titre">${stEch(titre)}</div>
    <div class="st-tuile-valeur">${valeur}</div>${sous ? `<div class="st-tuile-sous">${sous}</div>` : ""}</div>`;
}

/** Série par jour : tous les jours de la période (0 si absent), barre + valeur au survol. */
function stSerie(titre, points, unite) {
  const parJour = Object.fromEntries((points || []).map((p) => [p.jour, Number(p.n) || 0]));
  const jours = [];
  for (let i = stJours - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
    jours.push(d.toISOString().slice(0, 10));
  }
  const valeurs = jours.map((j) => parJour[j] || 0);
  const max = Math.max(1, ...valeurs);
  const total = valeurs.reduce((a, b) => a + b, 0);
  const barres = jours.map((j, i) => {
    const v = valeurs[i];
    const h = v ? Math.max(3, Math.round((v / max) * 100)) : 0;
    return `<div class="st-col" title="${stJourCourt(j)} : ${stNb(v)} ${stEch(unite)}"><div class="st-barre" style="height:${h}%"></div></div>`;
  }).join("");
  return `<div class="st-carte">
    <div class="st-carte-tete"><h3>${stEch(titre)}</h3><span class="st-total">${stNb(total)} sur ${stJours} j · max ${stNb(max)}/j</span></div>
    <div class="st-serie">${barres}</div>
    <div class="st-axe"><span>${stJourCourt(jours[0])}</span><span>${stJourCourt(jours[jours.length - 1])}</span></div>
  </div>`;
}

/** Classement : barres horizontales, valeur écrite à droite. */
function stClassement(titre, lignes, libelle, note) {
  const max = Math.max(1, ...(lignes || []).map((l) => Number(l.n) || 0));
  const corps = (lignes || []).length
    ? lignes.map((l) => `<div class="st-rang">
        <div class="st-rang-nom" title="${stEch(libelle(l))}">${stEch(libelle(l))}</div>
        <div class="st-rang-piste"><div class="st-rang-barre" style="width:${Math.max(2, (100 * (Number(l.n) || 0)) / max)}%"></div></div>
        <div class="st-rang-n">${stNb(l.n)}</div></div>`).join("")
    : '<p class="st-vide">Rien pour l’instant.</p>';
  return `<div class="st-carte"><div class="st-carte-tete"><h3>${stEch(titre)}</h3>${note ? `<span class="st-total">${stEch(note)}</span>` : ""}</div>${corps}</div>`;
}

const ST_CATEGORIES = {
  agriculture: "Agriculture", antiquite: "Antiquité", bataille: "Batailles", cathedrale: "Cathédrales",
  chateau: "Châteaux", commerce: "Commerces", demeure: "Demeures", eglise: "Églises", fortification: "Fortifications",
  majeur: "Sites majeurs", musee: "Musées", personnage: "Personnages", pont: "Ponts", prehistoire: "Préhistoire",
  public: "Bâtiments publics",
};

/* ===== Page ===== */

function stAfficher(d) {
  const u = d.utilisateurs || {}, a = d.actifs || {}, r = d.retour || {}, v = d.visites || {};
  const s = d.social || {}, c = d.conquete || {}, g = d.gardeRobe || {};
  const pv = v.premiereVisite || {};
  const retour = (k) => stPct(Number(r[k]?.revenus) || 0, Number(r[k]?.inscrits) || 0);
  const suivisDepuis = a.suivisDepuis ? new Date(a.suivisDepuis).toLocaleDateString("fr-FR") : null;

  document.getElementById("stContenu").innerHTML = `
    <h2 class="st-section">Utilisateurs</h2>
    <div class="st-tuiles">
      ${stTuile("Comptes", stNb(u.total), `e-mail ${stNb(u.email)} · Google ${stNb(u.google)} · Apple ${stNb(u.apple)}`)}
      ${stTuile("Actifs aujourd’hui", stNb(a.jour), suivisDepuis ? `mesuré depuis le ${suivisDepuis}` : "mesure en cours de démarrage")}
      ${stTuile("Actifs 7 jours", stNb(a.semaine), stPct(Number(a.semaine) || 0, Number(u.total) || 0) + " des comptes")}
      ${stTuile("Actifs 30 jours", stNb(a.mois), stPct(Number(a.mois) || 0, Number(u.total) || 0) + " des comptes")}
    </div>
    <div class="st-tuiles">
      ${stTuile("Reviennent après 1 jour", retour("j1"), `sur ${stNb(r.j1?.inscrits)} inscrits d’au moins 1 jour`)}
      ${stTuile("Reviennent après 7 jours", retour("j7"), `sur ${stNb(r.j7?.inscrits)} inscrits d’au moins 7 jours`)}
      ${stTuile("Reviennent après 30 jours", retour("j30"), `sur ${stNb(r.j30?.inscrits)} inscrits d’au moins 30 jours`)}
    </div>
    ${stSerie("Inscriptions par jour", u.inscritsParJour, "inscription(s)")}
    <p class="st-note">${stNb(u.total - u.avecDateInscription)} comptes anciens n’ont pas de date d’inscription : ils ne figurent ni dans les inscriptions par jour ni dans le taux de retour.</p>

    <h2 class="st-section">Visites</h2>
    <div class="st-tuiles">
      ${stTuile("Visites validées", stNb(v.total), `${stNb(v.surPeriode)} sur les ${d.jours} derniers jours`)}
      ${stTuile("Explorateurs qui visitent", stNb(v.visiteurs), stPct(Number(v.visiteurs) || 0, Number(u.total) || 0) + " des comptes")}
      ${stTuile("Inscrits sans aucune visite", stNb(pv.sansVisite), `sur ${stNb(pv.inscrits)} inscrits datés`)}
      ${stTuile("Délai avant la 1re visite", pv.delaiMoyenJours != null ? `${String(pv.delaiMoyenJours).replace(".", ",")} j` : "—", "en moyenne, après l’inscription")}
    </div>
    ${stSerie("Visites par jour", v.parJour, "visite(s)")}
    <div class="st-deux">
      ${stClassement("Catégories les plus visitées", v.parCategorie, (l) => ST_CATEGORIES[l.categorie] || l.categorie)}
      ${stClassement("Départements les plus actifs", v.topDepartements, (l) => l.departement)}
    </div>
    ${stClassement("Lieux les plus visités", v.topLieux, (l) => `${l.nom || l.wikidata_id}${l.commune ? " (" + l.commune + ")" : ""}`)}

    <h2 class="st-section">Social</h2>
    <div class="st-tuiles">
      ${stTuile("Abonnements", stNb(s.abonnements), `${stPct(Number(s.suiventQuelquun) || 0, Number(s.utilisateurs) || 0)} des comptes suivent quelqu’un`)}
      ${stTuile("Messages privés", stNb(s.messages))}
      ${stTuile("Publications / j’aime", `${stNb(s.publications)} / ${stNb(s.likes)}`)}
      ${stTuile("Guildes", stNb(s.guildes), `${stNb(s.membresGuildes)} membres`)}
    </div>
    <div class="st-deux">
      ${stSerie("Nouveaux abonnements par jour", s.abonnementsParJour, "abonnement(s)")}
      ${stSerie("Messages par jour", s.messagesParJour, "message(s)")}
    </div>

    <h2 class="st-section">Conquête</h2>
    <div class="st-tuiles">
      ${stTuile("Joueurs", stNb(c.joueurs), `${stNb(c.joueursActifs)} actifs sur ${d.jours} j`)}
      ${stTuile("Zones tenues", stNb(c.zonesTenues))}
      ${stTuile("Batailles", stNb(c.batailles), `attaquant vainqueur : ${stPct(Number(c.victoiresAttaquant) || 0, Number(c.batailles) || 0)}`)}
    </div>
    <div class="st-deux">
      ${stSerie("Attaques par jour", c.attaquesParJour, "attaque(s)")}
      ${stSerie("Occupations par jour", c.occupationsParJour, "occupation(s)")}
    </div>
    <div class="st-carte">
      <div class="st-carte-tete"><h3>Économie des écus sur ${d.jours} jours</h3><span class="st-total">gagnés / dépensés par motif</span></div>
      <table class="st-table"><thead><tr><th>Motif</th><th>Gagnés</th><th>Dépensés</th><th>Opérations</th></tr></thead><tbody>
        ${(c.ecusParMotif || []).map((m) => `<tr><td>${stEch(m.motif)}</td><td>${stNb(m.gagnes)}</td><td>${stNb(Math.abs(Number(m.depenses) || 0))}</td><td>${stNb(m.operations)}</td></tr>`).join("")
          || '<tr><td colspan="4">Aucune opération</td></tr>'}
      </tbody></table>
    </div>

    <h2 class="st-section">Garde-robe</h2>
    ${g.indisponible ? '<p class="st-vide">Pas encore disponible sur ce serveur.</p>' : `
    <div class="st-tuiles">
      ${stTuile("Pièces achetées", stNb(g.achats), `par ${stNb(g.acheteurs)} joueur(s)`)}
      ${stTuile("Avatars créés portés", stNb(g.tenuesPortees))}
    </div>
    ${stClassement("Pièces les plus achetées", g.topPieces, (l) => l.piece)}`}
  `;
}
