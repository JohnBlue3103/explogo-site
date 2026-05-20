const API = "https://api.explogo.fr";

let token    = localStorage.getItem("bo_token") || null;
let userRole = localStorage.getItem("bo_role")  || null;
let currentParcours = null;
let etapes = [];

const THEMES = {
  MEDIEVAL: "Médiéval", RELIGIEUX: "Religieux", INDUSTRIEL: "Industriel",
  GASTRONOMIQUE: "Gastronomique", NATURE: "Nature", GENERAL: "Général"
};

const POI_TYPES = [
  { value: "monument", label: "Monument" },
  { value: "personnage", label: "Personnage historique" },
  { value: "bataille", label: "Bataille" },
  { value: "musee", label: "Musée" },
  { value: "antiquite", label: "Antiquité" },
  { value: "pont", label: "Pont" },
];

/* =========================
   INIT
   ========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (token) {
    showDashboard();
  } else {
    showView("login");
  }

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("parcoursForm").addEventListener("submit", handleSave);
});

/* =========================
   VUES
   ========================= */
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("view-" + name).classList.remove("hidden");
}

function showDashboard() {
  showView("dashboard");
  loadParcours();
  const isAdmin = userRole === "ROLE_ADMIN";
  document.getElementById("adminNavBtn")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("dataNavBtn")?.classList.toggle("hidden", !isAdmin);
}

/* =========================
   AUTH
   ========================= */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const errEl = document.getElementById("loginError");
  errEl.classList.add("hidden");
  btn.textContent = "Connexion…";
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || "Identifiants incorrects";
      errEl.classList.remove("hidden");
      return;
    }

    if (data.role !== "ROLE_ORGANISATEUR" && data.role !== "ROLE_ADMIN") {
      errEl.textContent = "Accès réservé aux organisateurs.";
      errEl.classList.remove("hidden");
      return;
    }

    token = data.token;
    userRole = data.role;
    localStorage.setItem("bo_token", token);
    localStorage.setItem("bo_role", userRole);
    document.getElementById("orgName").textContent = data.pseudo || data.email;
    showDashboard();

  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.textContent = "Se connecter";
    btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem("bo_token");
  localStorage.removeItem("bo_role");
  token = null;
  userRole = null;
  showView("login");
}

/* =========================
   ADMIN
   ========================= */
let adminPage = 0;
let adminTotal = 0;
let searchTimer = null;

function showAdmin() {
  showView("admin");
  adminPage = 0;
  loadAdminUsers();
}

async function loadAdminUsers() {
  const list = document.getElementById("adminUserList");
  list.innerHTML = '<div class="loading">Chargement…</div>';
  const q = document.getElementById("adminSearch").value.trim();
  try {
    const res = await apiFetch(`/admin/users?q=${encodeURIComponent(q)}&page=${adminPage}`);
    const data = await res.json();
    adminTotal = data.total;
    renderUsers(data.users, data.page, data.totalPages);
  } catch {
    list.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

function filterUsers() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    adminPage = 0;
    loadAdminUsers();
  }, 350);
}

function renderUsers(users, page, totalPages) {
  const list = document.getElementById("adminUserList");
  if (!users.length) {
    list.innerHTML = '<div class="loading">Aucun utilisateur trouvé</div>';
    return;
  }

  const roleLabels = {
    ROLE_USER:          { label: "Visiteur",      cls: "badge-gray" },
    ROLE_ORGANISATEUR:  { label: "Organisateur",  cls: "badge-green" },
    ROLE_ADMIN:         { label: "Admin",          cls: "badge-orange" },
  };

  const rows = users.map(u => {
    const r = roleLabels[u.role] || { label: u.role, cls: "badge-gray" };
    const isOrg = u.role === "ROLE_ORGANISATEUR";
    const org = u.organisateur;
    const authIcon = u.appleAccount ? "🍎 Apple" : "🔑 Email";

    return `
    <div class="admin-user-row">
      <div class="admin-user-info">
        <div class="admin-user-main">
          <span class="admin-pseudo">${esc(u.pseudo)}</span>
          <span class="badge ${r.cls}">${r.label}</span>
          <span class="admin-auth-badge">${authIcon}</span>
        </div>
        <div class="admin-user-email">${esc(u.email)}</div>
        ${isOrg && org.nom ? `<div class="admin-org-info">${esc(org.nom)}${org.ville ? ` · ${esc(org.ville)}` : ""} · ${org.maxParcours} parcours · ${org.abonnementActif ? "✅ actif" : "⏸ suspendu"}</div>` : ""}
      </div>
      <div class="admin-user-actions">
        ${!isOrg && u.role !== "ROLE_ADMIN" ? `<button class="btn-secondary" onclick='openPromoCreate(${JSON.stringify(u)})'>Promouvoir</button>` : ""}
        ${isOrg ? `<button class="btn-secondary" onclick='openPromoEdit(${JSON.stringify(u)})'>Modifier</button>` : ""}
        ${isOrg ? `<button class="btn-icon danger" onclick="revoquerOrg(${org.id}, '${esc(u.pseudo)}')">Révoquer</button>` : ""}
      </div>
    </div>`;
  }).join("");

  const pagination = totalPages > 1 ? `
    <div class="admin-pagination">
      <button class="btn-outline" onclick="changePage(${page - 1})" ${page === 0 ? "disabled" : ""}>← Précédent</button>
      <span>Page ${page + 1} / ${totalPages} · ${adminTotal} utilisateurs</span>
      <button class="btn-outline" onclick="changePage(${page + 1})" ${page >= totalPages - 1 ? "disabled" : ""}>Suivant →</button>
    </div>` : `<div class="admin-pagination-info">${adminTotal} utilisateurs</div>`;

  list.innerHTML = rows + pagination;
}

function changePage(p) {
  adminPage = p;
  loadAdminUsers();
}

function openPromoCreate(u) {
  document.getElementById("promoModalTitle").textContent = "Promouvoir en organisateur";
  document.getElementById("promoUserLabel").textContent = `${u.pseudo} · ${u.email}`;
  document.getElementById("promoUserId").value = u.id;
  document.getElementById("promoOrgId").value = "";
  document.getElementById("promoNom").value = "";
  document.getElementById("promoVille").value = "";
  document.getElementById("promoMax").value = "5";
  document.getElementById("promoAbonnementWrap").style.display = "none";
  document.getElementById("promoError").classList.add("hidden");
  document.getElementById("promoModal").classList.remove("hidden");
}

function openPromoEdit(u) {
  const org = u.organisateur;
  document.getElementById("promoModalTitle").textContent = "Modifier l'organisateur";
  document.getElementById("promoUserLabel").textContent = `${u.pseudo} · ${u.email}`;
  document.getElementById("promoUserId").value = u.id;
  document.getElementById("promoOrgId").value = org.id;
  document.getElementById("promoNom").value = org.nom || "";
  document.getElementById("promoVille").value = org.ville || "";
  document.getElementById("promoMax").value = org.maxParcours || 5;
  document.getElementById("promoAbonnement").checked = org.abonnementActif !== false;
  document.getElementById("promoAbonnementWrap").style.display = "block";
  document.getElementById("promoError").classList.add("hidden");
  document.getElementById("promoModal").classList.remove("hidden");
}

function closePromoModal(e) {
  if (e && e.target !== document.getElementById("promoModal")) return;
  document.getElementById("promoModal").classList.add("hidden");
}

async function savePromo() {
  const errEl = document.getElementById("promoError");
  errEl.classList.add("hidden");
  const nom  = document.getElementById("promoNom").value.trim();
  if (!nom) { errEl.textContent = "Le nom est requis"; errEl.classList.remove("hidden"); return; }

  const orgId = document.getElementById("promoOrgId").value;
  const btn   = document.getElementById("promoSaveBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  try {
    let res;
    if (orgId) {
      res = await apiFetch(`/admin/organisateurs/${orgId}`, {
        method: "PUT",
        body: JSON.stringify({
          nom,
          ville:            document.getElementById("promoVille").value.trim(),
          maxParcours:      parseInt(document.getElementById("promoMax").value) || 5,
          abonnementActif:  document.getElementById("promoAbonnement").checked,
        }),
      });
    } else {
      res = await apiFetch("/admin/organisateurs", {
        method: "POST",
        body: JSON.stringify({
          utilisateurId: document.getElementById("promoUserId").value,
          nom,
          ville:       document.getElementById("promoVille").value.trim(),
          maxParcours: parseInt(document.getElementById("promoMax").value) || 5,
        }),
      });
    }

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      errEl.textContent = d.message || "Erreur serveur";
      errEl.classList.remove("hidden");
      return;
    }

    document.getElementById("promoModal").classList.add("hidden");
    loadAdminUsers();
  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enregistrer";
  }
}

async function revoquerOrg(orgId, pseudo) {
  if (!confirm(`Révoquer ${pseudo} comme organisateur ? Ses parcours seront conservés mais il ne pourra plus se connecter au backoffice.`)) return;
  try {
    const res = await apiFetch(`/admin/organisateurs/${orgId}`, { method: "DELETE" });
    if (res.ok) loadAdminUsers();
  } catch { alert("Erreur serveur"); }
}

/* =========================
   PARCOURS — LISTE
   ========================= */
async function loadParcours() {
  const grid = document.getElementById("parcoursGrid");
  grid.innerHTML = '<div class="loading">Chargement…</div>';

  try {
    const res = await apiFetch("/api/parcours/mes-parcours");
    const list = await res.json();

    if (!list.length) {
      grid.innerHTML = '<p class="loading">Aucun parcours. Créez votre premier itinéraire.</p>';
      return;
    }

    grid.innerHTML = list.map(p => `
      <div class="parcours-card">
        <div class="parcours-card-header">
          <h3>${esc(p.titre)}</h3>
          <span class="badge ${p.actif ? "badge-green" : "badge-gray"}">
            ${p.actif ? "Publié" : "Brouillon"}
          </span>
        </div>
        <div class="parcours-meta">
          <span>📍 ${esc(p.ville)}</span>
          <span>🏷 ${THEMES[p.theme] || p.theme}</span>
          ${p.dureeMinutes ? `<span>⏱ ${p.dureeMinutes} min</span>` : ""}
        </div>
        <div class="parcours-card-actions">
          <button class="btn-secondary" onclick="openEdit(${p.id})">Modifier</button>
          <button class="btn-icon danger" onclick="deleteParcours(${p.id})">Supprimer</button>
        </div>
      </div>
    `).join("");

  } catch {
    grid.innerHTML = '<p class="loading">Erreur de chargement.</p>';
  }
}

/* =========================
   PARCOURS — CREATE / EDIT
   ========================= */
function openCreate() {
  currentParcours = null;
  etapes = [];
  document.getElementById("formTitle").textContent = "Nouveau parcours";
  document.getElementById("parcoursId").value = "";
  document.getElementById("parcoursForm").reset();
  renderEtapes();
  showView("form");
}

async function openEdit(id) {
  showView("form");
  document.getElementById("formTitle").textContent = "Modifier le parcours";

  try {
    const res = await apiFetch(`/api/parcours/mes-parcours/${id}`);
    const p = await res.json();
    currentParcours = p;
    etapes = p.etapes || [];

    document.getElementById("parcoursId").value = p.id;
    document.getElementById("fTitre").value = p.titre || "";
    document.getElementById("fVille").value = p.ville || "";
    document.getElementById("fTheme").value = p.theme || "GENERAL";
    document.getElementById("fNiveau").value = p.niveau || "FACILE";
    document.getElementById("fDescription").value = p.description || "";
    document.getElementById("fActif").checked = !!p.actif;
    renderEtapes();

  } catch {
    alert("Erreur lors du chargement du parcours.");
    showDashboard();
  }
}

async function handleSave(e) {
  e.preventDefault();
  const btn = document.getElementById("saveBtn");
  const errEl = document.getElementById("formError");
  errEl.classList.add("hidden");
  btn.textContent = "Enregistrement…";
  btn.disabled = true;

  const id = document.getElementById("parcoursId").value;
  const body = {
    titre: document.getElementById("fTitre").value.trim(),
    ville: document.getElementById("fVille").value.trim(),
    theme: document.getElementById("fTheme").value,
    niveau: document.getElementById("fNiveau").value,
    description: document.getElementById("fDescription").value.trim(),
    actif: document.getElementById("fActif").checked,
    etapes: etapes,
  };

  try {
    const res = await apiFetch(
      id ? `/api/parcours/${id}` : "/api/parcours",
      { method: id ? "PUT" : "POST", body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const txt = await res.text();
      errEl.textContent = txt || "Erreur lors de l'enregistrement";
      errEl.classList.remove("hidden");
      return;
    }

    showDashboard();

  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.textContent = "Enregistrer";
    btn.disabled = false;
  }
}

async function deleteParcours(id) {
  if (!confirm("Supprimer ce parcours définitivement ?")) return;
  try {
    await apiFetch(`/api/parcours/${id}`, { method: "DELETE" });
    loadParcours();
  } catch {
    alert("Erreur lors de la suppression.");
  }
}

/* =========================
   ETAPES
   ========================= */
function addEtape() {
  const ville = document.getElementById("fVille").value.trim();
  if (!ville) {
    alert("Veuillez d'abord saisir la ville du parcours pour filtrer les points d'intérêt.");
    document.getElementById("fVille").focus();
    return;
  }
  etapes.push({ poiType: "", poiId: "", poiNom: "", descriptionEtape: "" });
  renderEtapes();
}

function removeEtape(i) {
  etapes.splice(i, 1);
  renderEtapes();
}

function moveEtape(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= etapes.length) return;
  [etapes[i], etapes[j]] = [etapes[j], etapes[i]];
  renderEtapes();
}

function updateEtape(i, field, value) {
  etapes[i][field] = value;
}

function selectPoi(i, poiType, poiId, poiNom) {
  etapes[i].poiType = poiType;
  etapes[i].poiId = poiId;
  etapes[i].poiNom = poiNom;
  renderEtapes();
}

function clearPoi(i) {
  etapes[i].poiType = "";
  etapes[i].poiId = "";
  etapes[i].poiNom = "";
  renderEtapes();
}

let searchTimers = {};

async function handlePoiSearch(i, q) {
  clearTimeout(searchTimers[i]);
  const dropdown = document.getElementById(`poi-dropdown-${i}`);
  if (!q || q.length < 2) { dropdown.innerHTML = ""; dropdown.classList.add("hidden"); return; }

  const ville = document.getElementById("fVille").value.trim();
  if (!ville) {
    dropdown.innerHTML = '<div class="poi-option poi-empty">⚠️ Renseignez d\'abord la ville du parcours</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  searchTimers[i] = setTimeout(async () => {
    try {
      const url = `/api/parcours/search-poi?q=${encodeURIComponent(q)}&ville=${encodeURIComponent(ville)}`;
      const res = await apiFetch(url);
      const results = await res.json();
      if (!results.length) {
        dropdown.innerHTML = `<div class="poi-option poi-empty">Aucun résultat pour "${esc(q)}"</div>`;
      } else {
        dropdown.innerHTML = results.slice(0, 15).map(r => `
          <div class="poi-option" onclick="selectPoi(${i}, '${esc(r.categorie)}', '${r.id}', '${esc(r.nom)}')">
            <span class="poi-nom">${esc(r.nom)}${r.commune ? ` <span class="poi-commune">(${esc(r.commune)})</span>` : ''}</span>
            <span class="poi-type">${esc(r.categorie)}</span>
          </div>
        `).join("");
      }
      dropdown.classList.remove("hidden");
    } catch {
      dropdown.innerHTML = "";
      dropdown.classList.add("hidden");
    }
  }, 300);
}

function renderEtapes() {
  const list = document.getElementById("etapesList");

  if (!etapes.length) {
    list.innerHTML = '<p class="etapes-empty">Aucune étape. Ajoutez des points d\'intérêt.</p>';
    return;
  }

  list.innerHTML = etapes.map((e, i) => `
    <div class="etape-row">
      <div class="etape-num">${i + 1}</div>
      <div class="etape-fields">
        <div class="form-group full poi-search-group">
          <label>Point d'intérêt</label>
          ${e.poiId ? `
            <div class="poi-selected">
              <span>${esc(e.poiNom || e.poiId)}</span>
              <span class="poi-type">${esc(e.poiType)}</span>
              <button type="button" class="btn-icon" onclick="clearPoi(${i})" title="Changer">✕</button>
            </div>
          ` : `
            <div class="poi-search-wrapper">
              <input type="text" placeholder="Rechercher un lieu par nom…"
                oninput="handlePoiSearch(${i}, this.value)"
                autocomplete="off">
              <div id="poi-dropdown-${i}" class="poi-dropdown hidden"></div>
            </div>
          `}
        </div>
        <div class="form-group full">
          <label>Description de l'étape (optionnel)</label>
          <textarea rows="2"
            placeholder="Texte affiché à l'utilisateur sur cette étape…"
            onchange="updateEtape(${i}, 'descriptionEtape', this.value)">${esc(e.descriptionEtape || '')}</textarea>
        </div>
      </div>
      <div class="etape-actions">
        <button type="button" class="btn-icon" onclick="moveEtape(${i}, -1)" title="Monter">↑</button>
        <button type="button" class="btn-icon" onclick="moveEtape(${i}, 1)" title="Descendre">↓</button>
        <button type="button" class="btn-icon danger" onclick="removeEtape(${i})" title="Supprimer">✕</button>
      </div>
    </div>
  `).join("");
}

/* =========================
   DONNÉES — POI
   ========================= */
let currentDataCategory = null;
let dataPage = 0;
let dataSearchTimer = null;

const CATEGORY_CONFIG = {
  chateau:       { label: "Châteaux",       icon: "🏰" },
  bataille:      { label: "Batailles",      icon: "⚔️" },
  musee:         { label: "Musées",         icon: "🏛" },
  eglise:        { label: "Églises",        icon: "⛪" },
  cathedrale:    { label: "Cathédrales",    icon: "🕌" },
  pont:          { label: "Ponts",          icon: "🌉" },
  majeur:        { label: "Sites majeurs",  icon: "🗿" },
  prehistoire:   { label: "Préhistoire",    icon: "🦴" },
  antiquite:     { label: "Antiquités",     icon: "🏺" },
  demeure:       { label: "Demeures",       icon: "🏠" },
  fortification: { label: "Fortifications", icon: "🏯" },
  personnage:    { label: "Personnages",    icon: "👤" },
};

const CATEGORY_EXTRA_FIELDS = {
  bataille: [
    { key: "conflit",        label: "Conflit",          type: "text" },
    { key: "date",           label: "Date",             type: "text" },
    { key: "theme",          label: "Thème",            type: "text" },
    { key: "issue",          label: "Issue",            type: "text" },
    { key: "epoque",         label: "Époque",           type: "text" },
    { key: "annee_extraite", label: "Année extraite",   type: "text" },
    { key: "bibliographie",  label: "Bibliographie",    type: "textarea" },
    { key: "mode_expert",    label: "Mode expert",      type: "textarea" },
  ],
  personnage: [
    { key: "theme",         label: "Thème",            type: "text" },
    { key: "periode",       label: "Période",          type: "text" },
    { key: "naissance",     label: "Naissance",        type: "text" },
    { key: "sexe",          label: "Sexe",             type: "text" },
    { key: "bibliographie", label: "Bibliographie",    type: "textarea" },
    { key: "mode_expert",   label: "Mode expert",      type: "textarea" },
  ],
  eglise: [
    { key: "periode_construction", label: "Période de construction", type: "text" },
    { key: "personnes",            label: "Personnes liées",         type: "text" },
  ],
  cathedrale: [
    { key: "periode_construction", label: "Période de construction", type: "text" },
    { key: "personnes",            label: "Personnes liées",         type: "text" },
    { key: "proprietaire",         label: "Propriétaire",            type: "text" },
  ],
  pont: [
    { key: "periode_construction", label: "Période de construction", type: "text" },
    { key: "personnes",            label: "Personnes liées",         type: "text" },
  ],
  chateau: [
    { key: "important", label: "Monument important", type: "checkbox" },
  ],
  majeur:        [{ key: "proprietaire", label: "Propriétaire", type: "text" }],
  prehistoire:   [{ key: "proprietaire", label: "Propriétaire", type: "text" }],
  demeure:       [{ key: "proprietaire", label: "Propriétaire", type: "text" }],
  fortification: [{ key: "proprietaire", label: "Propriétaire", type: "text" }],
  antiquite: [
    { key: "proprietaire", label: "Propriétaire",  type: "text" },
    { key: "siecle2",      label: "Siècle (fin)",  type: "text" },
  ],
};

let _poiExtraOriginal = {};

function renderExtraFields(cat, extraData) {
  const fields = CATEGORY_EXTRA_FIELDS[cat] || [];
  const container = document.getElementById("poiExtraFields");
  if (!fields.length) { container.innerHTML = ""; return; }

  const html = fields.map(f => {
    const val = extraData ? (extraData[f.key] ?? "") : "";
    if (f.type === "textarea") {
      return `<div class="form-group full">
        <label>${f.label}</label>
        <textarea id="poiExtra_${f.key}" rows="3">${esc(String(val))}</textarea>
      </div>`;
    }
    if (f.type === "checkbox") {
      const checked = val === true || val === "true" ? "checked" : "";
      return `<div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="poiExtra_${f.key}" ${checked}> ${f.label}
        </label>
      </div>`;
    }
    return `<div class="form-group">
      <label>${f.label}</label>
      <input type="text" id="poiExtra_${f.key}" value="${esc(String(val))}">
    </div>`;
  }).join("");

  container.innerHTML = `<div class="extra-fields-section"><p class="extra-fields-title">Champs spécifiques</p><div class="form-grid">${html}</div></div>`;
}

function collectExtraFromForm(cat) {
  const fields = CATEGORY_EXTRA_FIELDS[cat] || [];
  const extra = { ..._poiExtraOriginal };
  fields.forEach(f => {
    const el = document.getElementById("poiExtra_" + f.key);
    if (!el) return;
    if (f.type === "checkbox") {
      if (el.checked) extra[f.key] = true; else delete extra[f.key];
    } else {
      const v = el.value.trim();
      if (v) extra[f.key] = v; else delete extra[f.key];
    }
  });
  return Object.keys(extra).length ? extra : null;
}

function showData() {
  showView("data");
  showCategoryGrid();
  loadCategories();
}

function showCategoryGrid() {
  document.getElementById("dataCategoryView").classList.remove("hidden");
  document.getElementById("dataPoiView").classList.add("hidden");
  currentDataCategory = null;
}

async function loadCategories() {
  const grid = document.getElementById("categoryGrid");
  try {
    const res = await apiFetch("/admin/data/categories");
    const counts = await res.json();
    grid.innerHTML = Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => `
      <div class="category-card" onclick="selectCategory('${key}')">
        <div class="category-icon">${cfg.icon}</div>
        <div class="category-nom">${cfg.label}</div>
        <div class="category-count">${(counts[key] || 0).toLocaleString('fr-FR')}</div>
      </div>
    `).join("");
  } catch {
    grid.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

function selectCategory(cat) {
  currentDataCategory = cat;
  dataPage = 0;
  const cfg = CATEGORY_CONFIG[cat] || { label: cat, icon: "" };
  document.getElementById("dataPoiTitle").textContent = cfg.icon + " " + cfg.label;
  document.getElementById("dataPoiSearch").value = "";
  document.getElementById("dataFilterDep").value = "";
  document.getElementById("dataFilterCommune").value = "";
  document.getElementById("dataFilterRegion").value = "";
  document.getElementById("dataCategoryView").classList.add("hidden");
  document.getElementById("dataPoiView").classList.remove("hidden");
  loadPoiData();
}

async function loadPoiData() {
  const q       = document.getElementById("dataPoiSearch").value.trim();
  const dep     = document.getElementById("dataFilterDep").value.trim();
  const commune = document.getElementById("dataFilterCommune").value.trim();
  const region  = document.getElementById("dataFilterRegion").value.trim();
  const table   = document.getElementById("dataPoiTable");
  table.innerHTML = '<div class="loading">Chargement…</div>';
  try {
    const params = new URLSearchParams({ q, dep, commune, region, page: dataPage });
    const res = await apiFetch(`/admin/data/${currentDataCategory}?${params}`);
    const data = await res.json();
    renderPoiTable(data);
  } catch {
    table.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

function filterPoi() {
  clearTimeout(dataSearchTimer);
  dataSearchTimer = setTimeout(() => { dataPage = 0; loadPoiData(); }, 350);
}

function renderPoiTable(data) {
  const table = document.getElementById("dataPoiTable");
  const { items, page, totalPages, total } = data;
  document.getElementById("dataPoiCount").textContent = `${total} entrée${total > 1 ? "s" : ""}`;

  if (!items.length) {
    table.innerHTML = '<div class="loading">Aucune donnée. Utilisez "Importer JSON" pour peupler cette catégorie.</div>';
    return;
  }

  const rows = items.map(p => `
    <tr>
      <td class="poi-row-nom">${esc(p.nom)}</td>
      <td>${esc(p.commune || "—")}</td>
      <td>${esc(p.departement || "—")}</td>
      <td class="poi-row-coords">${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</td>
      <td>${esc(p.siecle || "—")}</td>
      <td class="poi-row-actions">
        <button class="btn-icon" onclick='openPoiEdit(${JSON.stringify(p)})' title="Modifier">✏</button>
        <button class="btn-icon danger" onclick="deletePoi(${p.id})" title="Supprimer">✕</button>
      </td>
    </tr>
  `).join("");

  const pagination = totalPages > 1 ? `
    <div class="admin-pagination">
      <button class="btn-outline" onclick="changeDataPage(${page - 1})" ${page === 0 ? "disabled" : ""}>← Précédent</button>
      <span>Page ${page + 1} / ${totalPages} · ${total} entrées</span>
      <button class="btn-outline" onclick="changeDataPage(${page + 1})" ${page >= totalPages - 1 ? "disabled" : ""}>Suivant →</button>
    </div>` : "";

  table.innerHTML = `
    <div class="poi-table-scroll">
      <table class="poi-table">
        <thead><tr>
          <th>Nom</th><th>Commune</th><th>Département</th>
          <th>Coordonnées</th><th>Siècle</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${pagination}`;
}

function changeDataPage(p) { dataPage = p; loadPoiData(); }

async function importCategory() {
  const cfg = CATEGORY_CONFIG[currentDataCategory] || { label: currentDataCategory };
  if (!confirm(`Importer "${cfg.label}" depuis le JSON intégré ?\nLes entrées déjà importées (même Wikidata ID) seront ignorées.`)) return;
  try {
    const res = await apiFetch(`/admin/data/import/${currentDataCategory}`, { method: "POST" });
    const data = await res.json();
    alert(`Import terminé : ${data.imported} entrée(s) ajoutée(s).`);
    loadPoiData();
    loadCategories();
  } catch { alert("Erreur lors de l'import"); }
}

async function exportCategory() {
  try {
    const res = await apiFetch(`/admin/data/${currentDataCategory}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentDataCategory}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert("Erreur lors de l'export"); }
}

function openPoiCreate() {
  document.getElementById("poiModalTitle").textContent = "Nouveau POI";
  ["poiId", "poiNom", "poiCommune", "poiDepartement", "poiLat", "poiLng",
   "poiSiecle", "poiWikidata", "poiDescription"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("poiCategorie").value = currentDataCategory;
  document.getElementById("poiError").classList.add("hidden");
  _poiExtraOriginal = {};
  renderExtraFields(currentDataCategory, null);
  document.getElementById("poiModal").classList.remove("hidden");
}

function openPoiEdit(poi) {
  document.getElementById("poiModalTitle").textContent = "Modifier le POI";
  document.getElementById("poiId").value = poi.id;
  document.getElementById("poiCategorie").value = poi.categorie;
  document.getElementById("poiNom").value = poi.nom || "";
  document.getElementById("poiCommune").value = poi.commune || "";
  document.getElementById("poiDepartement").value = poi.departement || "";
  document.getElementById("poiLat").value = poi.latitude || "";
  document.getElementById("poiLng").value = poi.longitude || "";
  document.getElementById("poiSiecle").value = poi.siecle || "";
  document.getElementById("poiWikidata").value = poi.wikidataId || "";
  document.getElementById("poiDescription").value = poi.description || "";
  document.getElementById("poiError").classList.add("hidden");
  _poiExtraOriginal = poi.extra || {};
  renderExtraFields(poi.categorie, poi.extra);
  document.getElementById("poiModal").classList.remove("hidden");
}

function closePoiModal(e) {
  if (e && e.target !== document.getElementById("poiModal")) return;
  document.getElementById("poiModal").classList.add("hidden");
}

async function savePoi() {
  const errEl = document.getElementById("poiError");
  errEl.classList.add("hidden");
  const nom = document.getElementById("poiNom").value.trim();
  if (!nom) { errEl.textContent = "Le nom est requis"; errEl.classList.remove("hidden"); return; }

  const id  = document.getElementById("poiId").value;
  const cat = document.getElementById("poiCategorie").value;
  const btn = document.getElementById("poiSaveBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  const extra = collectExtraFromForm(cat);

  const body = {
    categorie:   cat,
    nom,
    commune:     document.getElementById("poiCommune").value.trim(),
    departement: document.getElementById("poiDepartement").value.trim(),
    latitude:    parseFloat(document.getElementById("poiLat").value) || 0,
    longitude:   parseFloat(document.getElementById("poiLng").value) || 0,
    siecle:      document.getElementById("poiSiecle").value.trim(),
    wikidataId:  document.getElementById("poiWikidata").value.trim(),
    description: document.getElementById("poiDescription").value.trim(),
    extra,
  };

  try {
    const res = await apiFetch(
      id ? `/admin/data/${id}` : `/admin/data/${cat}`,
      { method: id ? "PUT" : "POST", body: JSON.stringify(body) }
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      errEl.textContent = d.message || "Erreur serveur";
      errEl.classList.remove("hidden");
      return;
    }
    document.getElementById("poiModal").classList.add("hidden");
    loadPoiData();
  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Enregistrer";
  }
}

async function deletePoi(id) {
  if (!confirm("Supprimer ce POI définitivement ?")) return;
  try {
    const res = await apiFetch(`/admin/data/${id}`, { method: "DELETE" });
    if (res.ok) loadPoiData();
    else alert("Erreur lors de la suppression");
  } catch { alert("Erreur serveur"); }
}

/* =========================
   UTILS
   ========================= */
function apiFetch(path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
