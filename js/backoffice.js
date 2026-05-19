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
  const adminBtn = document.getElementById("adminNavBtn");
  if (adminBtn) adminBtn.classList.toggle("hidden", userRole !== "ROLE_ADMIN");
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
