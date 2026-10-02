/* =============================================================
   ZONES CONTRÔLÉES — réglages du jeu, simulateur, historique
   (API admin : /api/conquete/admin/…, réservée à ROLE_ADMIN)
   Utilise les globales de backoffice.js : apiFetch, esc, showView, userRole.
   ============================================================= */

const ZC_UNITES = [
  { type: "SOLDAT", nom: "Soldats", emoji: "🗡️" },
  { type: "PIQUIER", nom: "Piquiers", emoji: "🔱" },
  { type: "ARCHER", nom: "Archers", emoji: "🏹" },
  { type: "CAVALIER", nom: "Cavaliers", emoji: "🐎" },
  { type: "CATAPULTE", nom: "Catapultes", emoji: "🪨" },
];
const ZC_CHAMPS_UNITE = [
  { champ: "attaque", label: "Attaque" },
  { champ: "pv", label: "Vie" },
  { champ: "prix", label: "Prix (écus)" },
  { champ: "entretien", label: "Entretien (écus/j)" },
  { champ: "niveau", label: "Niveau requis" },
];
const ZC_ORDRE_SECTIONS = ["Unités", "Affinités", "Écus", "Batailles", "Coffres", "Entretien", "Événements", "Zones"];

let zcReglages = [];     // réglages tels qu'enregistrés (API)
let zcBrouillon = {};    // modifications en cours, pas encore enregistrées : { cle: valeur }

/* ===== Navigation ===== */
function showZones() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("zones");
  zcOnglet("reglages");
  zcCharger();
}

function zcOnglet(nom) {
  document.querySelectorAll("[data-zc-onglet]").forEach(b => b.classList.toggle("active", b.dataset.zcOnglet === nom));
  ["reglages", "simulateur", "historique"].forEach(n =>
    document.getElementById("zc-" + n).classList.toggle("hidden", n !== nom));
  if (nom === "simulateur") zcPreparerSimulateur();
  if (nom === "historique") zcChargerHistorique();
}

/* ===== Chargement ===== */
async function zcCharger() {
  const zone = document.getElementById("zc-reglages-contenu");
  try {
    const res = await apiFetch("/api/conquete/admin/reglages");
    if (!res.ok) throw new Error(await zcMessage(res));
    zcReglages = await res.json();
    zcAfficher();
  } catch (e) {
    zone.innerHTML = `<p class="error">Impossible de charger les réglages : ${esc(e.message)}</p>`;
  }
}

async function zcMessage(res) {
  try { const j = await res.json(); return j.message || `Erreur ${res.status}`; }
  catch { return `Erreur ${res.status}`; }
}

const zcDef = cle => zcReglages.find(r => r.cle === cle);
/** Valeur affichée : brouillon s'il existe, sinon valeur enregistrée. */
const zcValeur = cle => (cle in zcBrouillon ? zcBrouillon[cle] : zcDef(cle)?.valeur);
const zcNum = v => (v === null || v === undefined || v === "" ? "" : String(Number(v)));

/* ===== Affichage des réglages ===== */
function zcAfficher() {
  const parSection = {};
  zcReglages.forEach(r => (parSection[r.section] ??= []).push(r));
  const sections = ZC_ORDRE_SECTIONS.filter(s => parSection[s]).concat(Object.keys(parSection).filter(s => !ZC_ORDRE_SECTIONS.includes(s)));

  document.getElementById("zc-reglages-contenu").innerHTML = sections.map(s => `
    <details class="zc-section" ${s === "Unités" ? "open" : ""}>
      <summary>${esc(s)} ${zcCompteurSection(parSection[s])}</summary>
      <div class="zc-section-corps">
        ${s === "Unités" ? zcTableUnites() : s === "Affinités" ? zcTableAffinites() : parSection[s].map(zcLigne).join("")}
      </div>
    </details>`).join("");
  zcMajBarre();
}

function zcCompteurSection(liste) {
  const n = liste.filter(r => r.modifie).length;
  return n ? `<span class="zc-pastille">${n} modifié${n > 1 ? "s" : ""}</span>` : "";
}

function zcClasses(cle) {
  const r = zcDef(cle);
  return [cle in zcBrouillon ? "zc-brouillon" : "", r?.modifie ? "zc-modifie" : ""].join(" ");
}

function zcInput(cle, opts = {}) {
  const r = zcDef(cle);
  if (!r) return "—";
  const step = r.type === "DECIMAL" ? "0.05" : "1";
  const titre = `${r.libelle} — défaut : ${zcNum(r.defaut)}${r.modifie ? ` (modifié${r.majPar ? " par " + r.majPar : ""})` : ""}`;
  return `<input type="number" class="zc-input ${zcClasses(cle)} ${opts.classe || ""}" data-cle="${esc(cle)}"
            value="${esc(zcNum(zcValeur(cle)))}" step="${step}" min="${r.min ?? ""}" max="${r.max ?? ""}"
            title="${esc(titre)}" onchange="zcChanger(this.dataset.cle, this.value)">`;
}

function zcTableUnites() {
  return `
    <p class="zc-aide">Survolez une case pour voir la valeur par défaut. Entretien : 0,5 possible.</p>
    <div class="zc-scroll"><table class="zc-table">
      <thead><tr><th>Unité</th>${ZC_CHAMPS_UNITE.map(c => `<th>${c.label}</th>`).join("")}<th></th></tr></thead>
      <tbody>${ZC_UNITES.map(u => `
        <tr>
          <td class="zc-unite">${u.emoji} ${u.nom}</td>
          ${ZC_CHAMPS_UNITE.map(c => `<td>${zcInput(`unite.${u.type}.${c.champ}`)}</td>`).join("")}
          <td>${zcBoutonDefautGroupe(ZC_CHAMPS_UNITE.map(c => `unite.${u.type}.${c.champ}`))}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function zcTableAffinites() {
  return `
    <p class="zc-aide">Multiplicateur de dégâts de l'unité en ligne contre l'unité en colonne :
      <b class="zc-fort">2 = fort contre</b>, <b class="zc-faible">0,6 = faible contre</b>, 1 = neutre.</p>
    <div class="zc-scroll"><table class="zc-table">
      <thead><tr><th>Attaquant ↓ / Cible →</th>${ZC_UNITES.map(u => `<th>${u.emoji} ${u.nom}</th>`).join("")}</tr></thead>
      <tbody>${ZC_UNITES.map(a => `
        <tr>
          <td class="zc-unite">${a.emoji} ${a.nom}</td>
          ${ZC_UNITES.map(c => {
            if (a.type === c.type) return `<td class="zc-diag">—</td>`;
            const cle = `affinite.${a.type}.${c.type}`;
            const v = Number(zcValeur(cle));
            return `<td>${zcInput(cle, { classe: v > 1 ? "zc-fort" : v < 1 ? "zc-faible" : "" })}</td>`;
          }).join("")}
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

function zcLigne(r) {
  let champ;
  if (r.type === "LISTE") {
    const actives = String(zcValeur(r.cle) || "").split(",").filter(Boolean);
    champ = `<div class="zc-choix ${zcClasses(r.cle)}">${(r.choix || []).map(c => `
        <label><input type="checkbox" data-cle="${esc(r.cle)}" value="${esc(c)}" ${actives.includes(c) ? "checked" : ""}
          onchange="zcChangerListe(this.dataset.cle)"> ${esc(c.charAt(0) + c.slice(1).toLowerCase())}</label>`).join("")}
      </div>`;
  } else {
    champ = zcInput(r.cle);
  }
  return `
    <div class="zc-ligne">
      <div class="zc-ligne-txt">
        <div class="zc-libelle">${esc(r.libelle)} ${r.modifie ? `<span class="zc-pastille">modifié</span>` : ""}</div>
        <div class="zc-aide">${esc(r.aide || "")} · défaut : ${esc(r.type === "LISTE" ? (r.defaut || "aucune") : zcNum(r.defaut))}</div>
      </div>
      <div class="zc-ligne-champ">${champ}${zcBoutonDefautGroupe([r.cle])}</div>
    </div>`;
}

function zcBoutonDefautGroupe(cles) {
  const modifies = cles.filter(c => zcDef(c)?.modifie);
  if (!modifies.length) return "";
  return `<button class="zc-defaut" title="Revenir aux valeurs par défaut" onclick='zcRemettreDefaut(${JSON.stringify(modifies)})'>↺</button>`;
}

/* ===== Édition ===== */
function zcChanger(cle, valeur) {
  const r = zcDef(cle);
  if (!r) return;
  if (String(Number(valeur)) === String(Number(r.valeur))) delete zcBrouillon[cle];
  else zcBrouillon[cle] = valeur;
  zcAfficherSansPerdreSections();
}

function zcChangerListe(cle) {
  const coches = [...document.querySelectorAll(`input[type=checkbox][data-cle="${cle}"]:checked`)].map(i => i.value);
  const valeur = coches.join(",");
  const r = zcDef(cle);
  const norm = s => String(s || "").split(",").filter(Boolean).sort().join(",");
  if (norm(valeur) === norm(r.valeur)) delete zcBrouillon[cle];
  else zcBrouillon[cle] = valeur;
  zcAfficherSansPerdreSections();
}

/** Ré-affiche en gardant les sections ouvertes là où elles étaient. */
function zcAfficherSansPerdreSections() {
  const ouvertes = [...document.querySelectorAll(".zc-section")].map(d => d.open);
  zcAfficher();
  document.querySelectorAll(".zc-section").forEach((d, i) => { if (i < ouvertes.length) d.open = ouvertes[i]; });
}

function zcMajBarre() {
  const n = Object.keys(zcBrouillon).length;
  document.getElementById("zc-barre").classList.toggle("hidden", n === 0);
  document.getElementById("zc-barre-txt").textContent =
    `${n} modification${n > 1 ? "s" : ""} non enregistrée${n > 1 ? "s" : ""}`;
}

function zcAnnuler() {
  zcBrouillon = {};
  zcAfficherSansPerdreSections();
}

async function zcEnregistrer() {
  const n = Object.keys(zcBrouillon).length;
  if (!n) return;
  const resume = Object.entries(zcBrouillon)
    .map(([cle, v]) => `• ${zcDef(cle)?.libelle || cle} : ${zcDef(cle)?.valeur} → ${v}`).join("\n");
  if (!confirm(`Appliquer ${n} modification${n > 1 ? "s" : ""} au jeu, tout de suite, pour tous les joueurs ?\n\n${resume}`)) return;

  const btn = document.getElementById("zc-enregistrer");
  btn.disabled = true;
  try {
    const res = await apiFetch("/api/conquete/admin/reglages", {
      method: "PUT",
      body: JSON.stringify({ valeurs: zcBrouillon }),
    });
    if (!res.ok) throw new Error(await zcMessage(res));
    zcReglages = await res.json();
    zcBrouillon = {};
    zcAfficherSansPerdreSections();
    alert("Réglages enregistrés : ils s'appliquent dès maintenant.");
  } catch (e) {
    alert("Enregistrement refusé :\n\n" + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function zcRemettreDefaut(cles) {
  const libelles = cles.map(c => "• " + (zcDef(c)?.libelle || c)).join("\n");
  if (!confirm(`Revenir aux valeurs par défaut ?\n\n${libelles}`)) return;
  try {
    const valeurs = {};
    cles.forEach(c => { valeurs[c] = zcDef(c).defaut; delete zcBrouillon[c]; });
    const res = await apiFetch("/api/conquete/admin/reglages", { method: "PUT", body: JSON.stringify({ valeurs }) });
    if (!res.ok) throw new Error(await zcMessage(res));
    zcReglages = await res.json();
    zcAfficherSansPerdreSections();
  } catch (e) {
    alert(e.message);
  }
}

/* ===== Simulateur ===== */
function zcPreparerSimulateur() {
  const att = document.getElementById("zc-simu-att");
  if (!att.dataset.pret) {
    const champs = (camp, defauts) => ZC_UNITES.map(u => `
      <label class="zc-champ zc-champ-ligne">${u.emoji} ${u.nom}
        <input type="number" min="0" max="500" value="${defauts[u.type] || 0}" data-camp="${camp}" data-type="${u.type}">
      </label>`).join("");
    att.innerHTML = champs("att", { ARCHER: 10, CAVALIER: 5 });
    document.getElementById("zc-simu-def").innerHTML = champs("def", { PIQUIER: 10, SOLDAT: 5 });
    att.dataset.pret = "1";
  }
  const sel = document.getElementById("zc-simu-cat");
  const categories = zcDef("bataille.categoriesFortifiees")?.choix || ["CHATEAU", "PONT"];
  if (!sel.options.length) {
    sel.innerHTML = categories.map(c => `<option value="${c}" ${c === "CHATEAU" ? "selected" : ""}>${c.charAt(0) + c.slice(1).toLowerCase()}</option>`).join("");
  }
}

function zcArmee(camp) {
  const armee = {};
  document.querySelectorAll(`input[data-camp="${camp}"]`).forEach(i => {
    const q = parseInt(i.value, 10);
    if (q > 0) armee[i.dataset.type] = q;
  });
  return armee;
}

async function zcSimuler() {
  const zone = document.getElementById("zc-simu-resultat");
  const attaquant = zcArmee("att");
  if (!Object.keys(attaquant).length) { zone.innerHTML = `<p class="error">L'attaquant doit avoir au moins une unité.</p>`; return; }
  const avecEssai = document.getElementById("zc-simu-essai").checked;
  zone.innerHTML = `<div class="loading">Simulation en cours…</div>`;
  try {
    const res = await apiFetch("/api/conquete/admin/simuler", {
      method: "POST",
      body: JSON.stringify({
        attaquant,
        defenseur: zcArmee("def"),
        categorie: document.getElementById("zc-simu-cat").value,
        meteo: document.getElementById("zc-simu-meteo").value,
        evenements: document.getElementById("zc-simu-ev").checked,
        iterations: parseInt(document.getElementById("zc-simu-iter").value, 10) || 1000,
        essai: avecEssai ? zcBrouillon : {},
      }),
    });
    if (!res.ok) throw new Error(await zcMessage(res));
    zcAfficherSimulation(await res.json(), avecEssai && Object.keys(zcBrouillon).length);
  } catch (e) {
    zone.innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

function zcAfficherSimulation(r, avecBrouillon) {
  const pct = Math.round(r.tauxVictoireAttaquant * 1000) / 10;
  const nom = t => { const u = ZC_UNITES.find(x => x.type === t); return u ? `${u.emoji} ${u.nom}` : t; };
  const pertes = m => Object.keys(m || {}).length
    ? Object.entries(m).map(([t, v]) => `<tr><td>${nom(t)}</td><td>${String(v).replace(".", ",")}</td></tr>`).join("")
    : `<tr><td colspan="2">aucune</td></tr>`;
  const evts = Object.entries(r.evenements || {});
  document.getElementById("zc-simu-resultat").innerHTML = `
    <div class="zc-carte zc-resultat">
      <div class="zc-taux">
        <div class="zc-taux-val">${String(pct).replace(".", ",")} %</div>
        <div>de victoires de l'attaquant sur ${r.iterations} batailles</div>
        <div class="zc-jauge"><div style="width:${pct}%"></div></div>
      </div>
      <p class="zc-aide">
        ${r.manchesMoyennes.toFixed(1).replace(".", ",")} manches en moyenne ·
        ${r.murs ? "🏰 murs actifs" : "pas de murs"} · météo ${esc(r.meteo.toLowerCase())}
        ${avecBrouillon ? " · <b>avec vos modifications non enregistrées</b>" : ""}
      </p>
      <div class="zc-simu-grille">
        <div><h4>Pertes moyennes de l'attaquant</h4><table class="zc-table">${pertes(r.pertesMoyAttaquant)}</table></div>
        <div><h4>Pertes moyennes du défenseur</h4><table class="zc-table">${pertes(r.pertesMoyDefenseur)}</table></div>
        ${evts.length ? `<div><h4>Événements tirés</h4><table class="zc-table">
          ${evts.map(([e, n]) => `<tr><td>${esc(e)}</td><td>${n}</td></tr>`).join("")}</table></div>` : ""}
      </div>
    </div>`;
}

/* ===== Historique ===== */
async function zcChargerHistorique() {
  const zone = document.getElementById("zc-historique-contenu");
  zone.innerHTML = `<div class="loading">Chargement…</div>`;
  try {
    const res = await apiFetch("/api/conquete/admin/reglages/historique");
    if (!res.ok) throw new Error(await zcMessage(res));
    const lignes = await res.json();
    zone.innerHTML = lignes.length ? `
      <div class="zc-scroll"><table class="zc-table zc-histo">
        <thead><tr><th>Date</th><th>Réglage</th><th>Avant</th><th>Après</th><th>Par</th></tr></thead>
        <tbody>${lignes.map(h => `
          <tr>
            <td>${new Date(h.date).toLocaleString("fr-FR")}</td>
            <td>${esc(h.libelle)}</td>
            <td>${esc(h.ancienneValeur ?? "défaut")}</td>
            <td><b>${esc(h.nouvelleValeur ?? "défaut")}</b></td>
            <td>${esc(h.auteur || "—")}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>` : `<p class="page-sub">Aucune modification pour l'instant : le jeu utilise les valeurs par défaut.</p>`;
  } catch (e) {
    zone.innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}
