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
    if (userRole === "ROLE_COLLABORATEUR") {
      const pseudo = localStorage.getItem("bo_pseudo") || "";
      document.getElementById("collabName").textContent = pseudo;
      showView("collab");
    } else {
      const pseudo = localStorage.getItem("bo_pseudo") || "";
      document.getElementById("orgName").textContent = pseudo;
      showDashboard();
    }
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
  document.getElementById("mobileNavMenu")?.classList.add("hidden");
  if (history.state?.view !== name) {
    history.pushState({ view: name }, "", "#" + name);
  }
}

window.addEventListener("popstate", (e) => {
  const view = e.state?.view;
  if (view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("mobileNavMenu")?.classList.add("hidden");
    const el = document.getElementById("view-" + view);
    if (el) el.classList.remove("hidden");
    if (view === "dashboard")     showDashboard();
    else if (view === "admin")    loadAdminAllParcours();
    else if (view === "admin-users") loadAdminUsers();
    else if (view === "data")     loadCategories();
    else if (view === "contributions") switchValidationTab("poi");
  } else {
    if (token) showDashboard();
    else showView("login");
  }
});

/* ===== MENU MOBILE ===== */
function toggleMobileMenu() {
  const menu = document.getElementById("mobileNavMenu");
  menu.classList.toggle("hidden");
}
function closeMobileMenu() {
  document.getElementById("mobileNavMenu")?.classList.add("hidden");
}
function syncMobileNav(isAdmin) {
  const pseudo = localStorage.getItem("bo_pseudo") || "";
  const orgMob = document.getElementById("orgNameMobile");
  if (orgMob) {
    orgMob.textContent = pseudo;
    orgMob.style.display = pseudo ? "" : "none";
  }
  document.getElementById("dataNavBtnM")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("contribNavBtnM")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("adminNavBtnM")?.classList.toggle("hidden", !isAdmin);
}

function showDashboard() {
  if (userRole === "ROLE_COLLABORATEUR") {
    showView("collab");
    return;
  }
  showView("dashboard");
  closeMobileMenu();
  const isAdmin = userRole === "ROLE_ADMIN";
  document.getElementById("adminNavBtn")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("dataNavBtn")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("contribNavBtn")?.classList.toggle("hidden", !isAdmin);
  syncMobileNav(isAdmin);

  if (isAdmin) {
    document.getElementById("dashboardStats").classList.remove("hidden");
    document.getElementById("dashboardOrg").classList.add("hidden");
    document.getElementById("parcoursSection").classList.add("hidden");
    loadDashboardStats();
    loadContribCount();
  } else {
    document.getElementById("dashboardStats").classList.add("hidden");
    document.getElementById("dashboardOrg").classList.remove("hidden");
    document.getElementById("parcoursSection").classList.remove("hidden");
    document.getElementById("parcoursGridTitle").textContent = "Mes parcours";
    loadQuota();
    loadParcours();
  }
}

async function loadDashboardStats() {
  apiFetch("/admin/users?q=&page=0&size=1").then(r => r.json()).then(data => {
    document.getElementById("statUsersVal").textContent = data.total ?? "—";
  }).catch(() => {});

  apiFetch("/api/parcours/admin/stats").then(r => r.json()).then(stats => {
    document.getElementById("statTotalVal").textContent = stats.total ?? "—";
    const badge = document.getElementById("dashPendingBadge");
    if (stats.pending > 0) { badge.textContent = stats.pending; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  }).catch(() => {});

  apiFetch("/admin/data/categories").then(r => r.json()).then(cats => {
    const total = Object.values(cats).reduce((s, n) => s + (n || 0), 0);
    document.getElementById("statPoiVal").textContent = total.toLocaleString("fr-FR");
  }).catch(() => {});
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

    const allowed = ["ROLE_ORGANISATEUR", "ROLE_ADMIN", "ROLE_COLLABORATEUR"];
    if (!allowed.includes(data.role)) {
      errEl.textContent = "Accès réservé aux organisateurs et collaborateurs.";
      errEl.classList.remove("hidden");
      return;
    }

    token = data.token;
    userRole = data.role;
    const pseudo = data.pseudo || data.email;
    localStorage.setItem("bo_token", token);
    localStorage.setItem("bo_role", userRole);
    localStorage.setItem("bo_pseudo", pseudo);
    if (userRole === "ROLE_COLLABORATEUR") {
      document.getElementById("collabName").textContent = pseudo;
      showView("collab");
    } else {
      document.getElementById("orgName").textContent = pseudo;
      showDashboard();
    }

  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.textContent = "Se connecter";
    btn.disabled = false;
  }
}

function showForgotPassword() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("forgotForm").classList.remove("hidden");
  document.getElementById("forgotEmail").value = document.getElementById("loginEmail").value;
  document.getElementById("forgotError").classList.add("hidden");
  document.getElementById("forgotSuccess").classList.add("hidden");
}

function showLoginForm() {
  document.getElementById("forgotForm").classList.add("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
}

async function sendResetEmail() {
  const btn   = document.getElementById("forgotBtn");
  const errEl = document.getElementById("forgotError");
  const okEl  = document.getElementById("forgotSuccess");
  const email = document.getElementById("forgotEmail").value.trim();

  errEl.classList.add("hidden");
  okEl.classList.add("hidden");

  if (!email) {
    errEl.textContent = "Veuillez saisir votre email.";
    errEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Envoi…";

  try {
    await fetch(`${API}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    // Toujours afficher le succès (le backend ne révèle pas si l'email existe)
    okEl.classList.remove("hidden");
    btn.disabled = true;
    btn.textContent = "Envoyé";
  } catch {
    errEl.textContent = "Serveur indisponible, réessayez plus tard.";
    errEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Envoyer le lien";
  }
}

function logout() {
  localStorage.removeItem("bo_token");
  localStorage.removeItem("bo_role");
  localStorage.removeItem("bo_pseudo");
  token = null;
  userRole = null;
  showView("login");
}

/* =========================
   ADMIN
   ========================= */
let adminPage = 0;
let adminTotal = 0;
let _userCache = {};
let searchTimer = null;

function showAdmin() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("admin");
  loadAdminAllParcours();
}

function showAdminUsers() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("admin-users");
  adminPage = 0;
  loadAdminUsers();
}

function switchAdminTab(tab) {
  if (tab === "users") showAdminUsers();
  else showAdmin();
}

async function loadAdminAllParcours() {
  const container = document.getElementById("adminParcoursOrgs");
  container.innerHTML = '<div class="loading">Chargement…</div>';
  try {
    const res = await apiFetch("/api/parcours/admin/all");
    const parcours = await res.json();

    if (!parcours.length) {
      container.innerHTML = '<div class="loading">Aucun parcours.</div>';
      return;
    }

    const TRANSPORT_LABELS = {
      "foot-walking": "🚶 Pied", "cycling-regular": "🚴 Vélo", "driving-car": "🚗 Voiture",
    };

    const publies   = parcours.filter(p => p.actif && p.status === "VALIDE");
    const attente   = parcours.filter(p => !p.actif || p.status !== "VALIDE");

    function groupByOrg(list) {
      const map = {};
      list.forEach(p => {
        const key = p.organisateurNom || "— Plateforme Explogo —";
        if (!map[key]) map[key] = { nom: key, items: [] };
        map[key].items.push(p);
      });
      return Object.values(map);
    }

    function renderParcoursRow(p) {
      const st = p.status || "EN_ATTENTE";
      const badgeCls = st === "REFUSE" ? "badge-red" : st === "VALIDE" && p.actif ? "badge-green" : st === "VALIDE" ? "badge-blue" : "badge-orange";
      const badgeTxt = st === "REFUSE" ? "Refusé" : st === "VALIDE" && p.actif ? "Publié" : st === "VALIDE" ? "Validé" : "En attente";
      return `
        <div class="admin-parcours-row">
          <div class="admin-parcours-info">
            <span class="admin-parcours-titre">${esc(p.titre)}</span>
            <div class="admin-parcours-meta">
              <span class="badge ${badgeCls}">${badgeTxt}</span>
              <span class="badge badge-gray">📍 ${esc(p.ville || "—")}</span>
              ${p.etapes?.length ? `<span class="badge badge-gray">${p.etapes.length} étapes</span>` : ""}
              <span class="badge badge-gray">${TRANSPORT_LABELS[p.transportMode] || ""}</span>
            </div>
          </div>
          <div class="admin-parcours-actions">
            <button class="btn-secondary" onclick="openEditAdmin(${p.id})">Modifier</button>
            <button class="btn-icon danger" onclick="deleteParcoursAdmin(${p.id})">Supprimer</button>
          </div>
        </div>`;
    }

    function renderSection(title, badgeCls, groups) {
      if (!groups.length) return "";
      const totalItems = groups.reduce((s, g) => s + g.items.length, 0);
      return `
        <div class="admin-section">
          <div class="admin-section-header">
            <span class="admin-section-title">${title}</span>
            <span class="badge ${badgeCls}">${totalItems}</span>
          </div>
          ${groups.map(org => `
            <div class="admin-org-group">
              <div class="admin-org-group-header">
                <span class="admin-org-group-nom">${esc(org.nom)}</span>
                <span class="badge badge-gray">${org.items.length} parcours</span>
              </div>
              <div class="admin-org-group-list">
                ${org.items.map(renderParcoursRow).join("")}
              </div>
            </div>
          `).join("")}
        </div>`;
    }

    container.innerHTML =
      renderSection("Publiés", "badge-green", groupByOrg(publies)) +
      renderSection("En attente", "badge-orange", groupByOrg(attente));

  } catch {
    container.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

async function deleteParcoursAdmin(id) {
  if (!confirm("Supprimer ce parcours définitivement ?")) return;
  try {
    await apiFetch(`/api/parcours/${id}`, { method: "DELETE" });
    loadAdminAllParcours();
    loadDashboardStats();
  } catch { alert("Erreur lors de la suppression."); }
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
    ROLE_USER:          { label: "Visiteur",       cls: "badge-gray"   },
    ROLE_ORGANISATEUR:  { label: "Organisateur",   cls: "badge-green"  },
    ROLE_ADMIN:         { label: "Admin",           cls: "badge-orange" },
    ROLE_COLLABORATEUR: { label: "Collaborateur",  cls: "badge-blue"   },
  };

  _userCache = {};
  users.forEach(u => { _userCache[u.id] = u; });

  const rows = users.map(u => {
    const r = roleLabels[u.role] || { label: u.role, cls: "badge-gray" };
    const isOrg   = u.role === "ROLE_ORGANISATEUR";
    const isCollab = u.role === "ROLE_COLLABORATEUR";
    const isAdmin  = u.role === "ROLE_ADMIN";
    const org = u.organisateur;
    const authIcon = u.appleAccount ? "🍎 Apple" : "🔑 Email";
    const canPromote = !isOrg && !isAdmin && !isCollab;

    return `
    <div class="admin-user-row">
      <div class="admin-user-info">
        <div class="admin-user-main">
          <span class="admin-pseudo">${esc(u.pseudo)}</span>
          <span class="badge ${r.cls}">${r.label}</span>
          <span class="admin-auth-badge">${authIcon}</span>
        </div>
        <div class="admin-user-email">${esc(u.email)}</div>
        ${isOrg && org && org.nom ? `<div class="admin-org-info">
          ${esc(org.nom)}${org.ville ? ` · ${esc(org.ville)}` : ""}
          · <span class="parcours-quota-pill ${org.parcoursCount >= org.maxParcours ? 'quota-full' : ''}">${org.parcoursCount ?? 0} / ${org.maxParcours} parcours</span>
          · ${org.abonnementActif ? "✅ actif" : "⏸ suspendu"}
        </div>` : ""}
      </div>
      <div class="admin-user-actions">
        ${canPromote ? `<button class="btn-secondary" onclick="openPromoCreate(_userCache['${u.id}'])">Promouvoir</button>` : ""}
        ${isOrg ? `<button class="btn-secondary" onclick="openPromoEdit(_userCache['${u.id}'])">Modifier org</button>` : ""}
        ${isOrg ? `<button class="btn-icon danger" onclick="revoquerOrg(${org.id}, '${esc(u.pseudo)}')">Révoquer</button>` : ""}
        ${(isCollab || isAdmin) ? `<button class="btn-icon danger" onclick="revoquerRole('${u.id}', '${esc(u.pseudo)}')">Révoquer</button>` : ""}
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

function onPromoRoleChange() {
  const role = document.querySelector('input[name="promoRole"]:checked')?.value;
  document.getElementById("promoOrgFields").style.display = role === "ROLE_ORGANISATEUR" ? "block" : "none";
}

function openPromoCreate(u) {
  document.getElementById("promoModalTitle").textContent = "Promouvoir " + esc(u.pseudo);
  document.getElementById("promoUserLabel").textContent = u.email;
  document.getElementById("promoUserId").value = u.id;
  document.getElementById("promoOrgId").value = "";
  document.getElementById("promoNom").value = "";
  document.getElementById("promoVille").value = "";
  document.getElementById("promoMax").value = "5";
  document.getElementById("promoAbonnementWrap").style.display = "none";
  document.getElementById("promoRoleChoice").style.display = "block";
  document.getElementById("promoOrgFields").style.display = "none";
  document.querySelector('input[name="promoRole"][value="ROLE_COLLABORATEUR"]').checked = true;
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
  document.getElementById("promoRoleChoice").style.display = "none";
  document.getElementById("promoOrgFields").style.display = "block";
  document.getElementById("promoError").classList.add("hidden");
  document.getElementById("promoModal").classList.remove("hidden");
}

function closePromoModal(e) {
  if (e && e.target !== document.getElementById("promoModal")) return;
  document.getElementById("promoModal").classList.add("hidden");
}

async function savePromo() {
  const errEl  = document.getElementById("promoError");
  errEl.classList.add("hidden");
  const orgId  = document.getElementById("promoOrgId").value;
  const userId = document.getElementById("promoUserId").value;
  const btn    = document.getElementById("promoSaveBtn");
  btn.disabled = true; btn.textContent = "Enregistrement…";

  try {
    let res;

    if (orgId) {
      // Modifier un organisateur existant
      res = await apiFetch(`/admin/organisateurs/${orgId}`, {
        method: "PUT",
        body: JSON.stringify({
          nom:             document.getElementById("promoNom").value.trim(),
          ville:           document.getElementById("promoVille").value.trim(),
          maxParcours:     parseInt(document.getElementById("promoMax").value) || 5,
          abonnementActif: document.getElementById("promoAbonnement").checked,
        }),
      });
    } else {
      const role = document.querySelector('input[name="promoRole"]:checked')?.value;

      if (role === "ROLE_ORGANISATEUR") {
        const nom = document.getElementById("promoNom").value.trim();
        if (!nom) { errEl.textContent = "Le nom est requis"; errEl.classList.remove("hidden"); btn.disabled = false; btn.textContent = "Enregistrer"; return; }
        res = await apiFetch("/admin/organisateurs", {
          method: "POST",
          body: JSON.stringify({
            utilisateurId: userId,
            nom,
            ville:       document.getElementById("promoVille").value.trim(),
            maxParcours: parseInt(document.getElementById("promoMax").value) || 5,
          }),
        });
      } else {
        res = await apiFetch(`/admin/utilisateurs/${userId}/role`, {
          method: "POST",
          body: JSON.stringify({ role }),
        });
      }
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
    btn.disabled = false; btn.textContent = "Enregistrer";
  }
}

async function revoquerRole(userId, pseudo) {
  if (!confirm(`Révoquer le rôle de ${pseudo} ? Il redeviendra visiteur.`)) return;
  try {
    const res = await apiFetch(`/admin/utilisateurs/${userId}/role`, { method: "DELETE" });
    if (res.ok) loadAdminUsers();
    else alert("Erreur lors de la révocation");
  } catch { alert("Serveur indisponible"); }
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

  const isAdmin = userRole === "ROLE_ADMIN";
  const endpoint = isAdmin ? "/api/parcours/admin/all" : "/api/parcours/mes-parcours";

  try {
    const res = await apiFetch(endpoint);
    const list = await res.json();

    if (!list.length) {
      grid.innerHTML = '<p class="loading">Aucun parcours.</p>';
      return;
    }

    grid.innerHTML = list.map(p => {
      const st = p.status || "EN_ATTENTE";
      let badgeCls, badgeTxt;
      if (st === "REFUSE")                  { badgeCls = "badge-red";    badgeTxt = "Refusé"; }
      else if (st === "VALIDE" && p.actif)  { badgeCls = "badge-green";  badgeTxt = "Publié"; }
      else if (st === "VALIDE")             { badgeCls = "badge-blue";   badgeTxt = "Validé"; }
      else                                  { badgeCls = "badge-orange"; badgeTxt = "En attente"; }
      return `
      <div class="parcours-card">
        <div class="parcours-card-header">
          <h3>${esc(p.titre)}</h3>
          <span class="badge ${badgeCls}">${badgeTxt}</span>
        </div>
        <div class="parcours-meta">
          <span>📍 ${esc(p.ville)}</span>
          <span>🏷 ${THEMES[p.theme] || p.theme}</span>
          ${p.dureeMinutes ? `<span>⏱ ${p.dureeMinutes} min</span>` : ""}
          ${isAdmin && p.organisateurNom ? `<span>🏢 ${esc(p.organisateurNom)}</span>` : ""}
        </div>
        ${!isAdmin && st === "EN_ATTENTE" ? '<div class="parcours-status-hint">⏳ En cours de validation par l\'équipe Explogo</div>' : ""}
        ${!isAdmin && st === "REFUSE" ? '<div class="parcours-status-hint danger">✕ Votre parcours a été refusé. Vous pouvez le modifier et le soumettre à nouveau.</div>' : ""}
        <div class="parcours-card-actions">
          <button class="btn-secondary" onclick="openEdit(${p.id})">Modifier</button>
          <button class="btn-icon danger" onclick="deleteParcours(${p.id})">Supprimer</button>
        </div>
      </div>`;
    }).join("");

  } catch {
    grid.innerHTML = '<p class="loading">Erreur de chargement.</p>';
  }
}

async function loadQuota() {
  try {
    const res = await apiFetch("/api/parcours/mes-parcours/quota");
    if (!res.ok) return;
    const { used, max } = await res.json();
    const info  = document.getElementById("quotaInfo");
    const btn   = document.getElementById("newParcoursBtn");
    const full  = used >= max;
    info.textContent  = `${used} / ${max} parcours`;
    info.className    = `quota-info ${full ? "quota-full" : used >= max - 1 ? "quota-warn" : ""}`;
    info.classList.remove("hidden");
    btn.disabled      = full;
    btn.title         = full ? `Quota atteint (${max} parcours max). Contactez-nous pour augmenter votre limite.` : "";
  } catch {}
}

/* =========================
   PARCOURS — CREATE / EDIT
   ========================= */
let _formOriginView = null;

async function openCreate() {
  _formOriginView = history.state?.view || null;
  currentParcours = null;
  etapes = [];
  document.getElementById("formTitle").textContent = "Nouveau parcours";
  document.getElementById("parcoursId").value = "";
  document.getElementById("parcoursForm").reset();

  if (userRole === "ROLE_ADMIN") {
    document.getElementById("fActifWrap").classList.remove("hidden");
    document.getElementById("fActif").checked = false;
    document.getElementById("fStatusInfo").classList.add("hidden");
    document.getElementById("fOrgWrap").classList.remove("hidden");
    await loadOrgOptions(null);
  } else {
    document.getElementById("fActifWrap").classList.add("hidden");
    document.getElementById("fOrgWrap").classList.add("hidden");
    const statusInfo = document.getElementById("fStatusInfo");
    statusInfo.className = "form-status-info";
    statusInfo.textContent = "⏳ Votre parcours sera soumis pour validation avant d'être publié.";
    statusInfo.classList.remove("hidden");
  }
  renderEtapes();
  showView("form");
}

async function openEdit(id) {
  _formOriginView = history.state?.view || null;
  showView("form");
  document.getElementById("formTitle").textContent = "Modifier le parcours";
  const endpoint = userRole === "ROLE_ADMIN"
    ? `/api/parcours/${id}`
    : `/api/parcours/mes-parcours/${id}`;
  try {
    const res = await apiFetch(endpoint);
    const p = await res.json();
    await _fillForm(p);
  } catch {
    alert("Erreur lors du chargement du parcours.");
    showDashboard();
  }
}

function openEditAdmin(id) {
  return openEdit(id);
}

async function _fillForm(p) {
  currentParcours = p;
  etapes = p.etapes || [];
  document.getElementById("parcoursId").value = p.id;
  document.getElementById("fTitre").value = p.titre || "";
  document.getElementById("fVille").value = p.ville || "";
  document.getElementById("fTheme").value = p.theme || "GENERAL";
  document.getElementById("fNiveau").value = p.niveau || "FACILE";
  document.getElementById("fDescription").value = p.description || "";

  if (userRole === "ROLE_ADMIN") {
    document.getElementById("fActifWrap").classList.remove("hidden");
    document.getElementById("fActif").checked = !!p.actif;
    document.getElementById("fStatusInfo").classList.add("hidden");
    document.getElementById("fOrgWrap").classList.remove("hidden");
    await loadOrgOptions(p.organisateurId);
  } else {
    document.getElementById("fActifWrap").classList.add("hidden");
    document.getElementById("fOrgWrap").classList.add("hidden");
    const statusInfo = document.getElementById("fStatusInfo");
    statusInfo.className = "form-status-info";
    const st = p.status || "EN_ATTENTE";
    if (st === "EN_ATTENTE") {
      statusInfo.textContent = "⏳ Ce parcours est en attente de validation. Toute modification le soumettra à nouveau pour validation.";
    } else if (st === "REFUSE") {
      statusInfo.textContent = "✕ Ce parcours a été refusé. Modifiez-le et enregistrez pour le soumettre à nouveau.";
      statusInfo.classList.add("danger");
    } else {
      statusInfo.textContent = "✓ Ce parcours est validé. Toute modification le soumettra à nouveau pour validation.";
    }
    statusInfo.classList.remove("hidden");
  }
  renderEtapes();
}

async function loadOrgOptions(selectedOrgId) {
  const sel = document.getElementById("fOrganisateurId");
  sel.innerHTML = '<option value="">— Aucun (contenu plateforme) —</option>';
  try {
    const res = await apiFetch("/admin/users?q=&page=0&size=500&role=ROLE_ORGANISATEUR");
    const data = await res.json();
    (data.users || []).filter(u => u.role === "ROLE_ORGANISATEUR" && u.organisateur).forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.organisateur.id;
      opt.textContent = `${u.organisateur.nom} (${u.pseudo})`;
      if (selectedOrgId && String(u.organisateur.id) === String(selectedOrgId)) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {}
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
  if (userRole === "ROLE_ADMIN") {
    const orgVal = document.getElementById("fOrganisateurId").value;
    body.organisateurId = orgVal ? parseInt(orgVal) : null;
  }

  try {
    const res = await apiFetch(
      id ? `/api/parcours/${id}` : "/api/parcours",
      { method: id ? "PUT" : "POST", body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const txt = await res.text();
      errEl.textContent = res.status === 403
        ? (txt.includes("Quota") ? txt : "Quota de parcours atteint. Contactez-nous pour augmenter votre limite.")
        : (txt || "Erreur lors de l'enregistrement");
      errEl.classList.remove("hidden");
      return;
    }

    if (_formOriginView === "admin") showAdmin();
    else showDashboard();

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
let _poiCache = {};

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
    { key: "periode_construction", label: "Période de construction", type: "text", full: true },
    { key: "personnes",            label: "Personnes liées",         type: "text", full: true },
  ],
  cathedrale: [
    { key: "periode_construction", label: "Période de construction", type: "text", full: true },
    { key: "personnes",            label: "Personnes liées",         type: "text", full: true },
    { key: "proprietaire",         label: "Propriétaire",            type: "text" },
  ],
  pont: [
    { key: "periode_construction", label: "Période de construction", type: "text", full: true },
    { key: "personnes",            label: "Personnes liées",         type: "text", full: true },
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
    return `<div class="form-group${f.full ? " full" : ""}">
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
  if (userRole !== "ROLE_ADMIN") return;
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

  items.forEach(p => { _poiCache[p.id] = p; });

  const rows = items.map(p => `
    <tr>
      <td class="poi-row-nom">${esc(p.nom)}</td>
      <td>${esc(p.commune || "—")}</td>
      <td>${esc(p.departement || "—")}</td>
      <td class="poi-row-coords">${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</td>
      <td>${esc(p.siecle || "—")}</td>
      <td class="poi-row-actions">
        <button class="btn-icon" onclick="openPoiEdit(_poiCache[${p.id}])" title="Modifier">✏</button>
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
    a.download = `${currentDataCategory}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert("Erreur lors de l'export"); }
}

function openPoiCreate() {
  document.getElementById("poiModalTitle").textContent = "Nouveau POI";
  ["poiId", "poiNom", "poiCommune", "poiDepartement", "poiLat", "poiLng",
   "poiSiecle", "poiWikidata", "poiDescription", "poiCommentaire"].forEach(id => {
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
  document.getElementById("poiCommentaire").value = poi.commentaire || "";
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
    description:  document.getElementById("poiDescription").value.trim(),
    commentaire:  document.getElementById("poiCommentaire").value.trim() || null,
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
   COLLABORATEUR
   ========================= */
function switchCollabTab(tab) {
  document.getElementById("tabCreate").classList.toggle("active", tab === "create");
  document.getElementById("tabModif").classList.toggle("active", tab === "modif");
  document.getElementById("collabForm").classList.toggle("hidden", tab === "modif");
  document.getElementById("collabModifPanel").classList.toggle("hidden", tab === "create");
  if (tab === "create") cancelModif();
}

let _collabPoiSearchTimer = null;

async function loadCollabPoiList() {
  const cat = document.getElementById("cModifCat").value;
  const q   = document.getElementById("cModifSearch").value.trim();
  const list = document.getElementById("collabPoiList");
  if (!cat) { list.innerHTML = '<p class="loading">Choisissez une catégorie.</p>'; return; }
  list.innerHTML = '<p class="loading">Chargement…</p>';
  try {
    const res = await apiFetch(`/collab/poi/${cat}?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.items.length) { list.innerHTML = '<p class="loading">Aucun résultat.</p>'; return; }
    list.innerHTML = data.items.map(p => `
      <div class="collab-poi-row">
        <div class="collab-poi-info">
          <span class="collab-poi-nom">${esc(p.nom)}</span>
          ${p.commune ? `<span class="collab-poi-meta">${esc(p.commune)}${p.departement ? ` · ${esc(p.departement)}` : ""}</span>` : ""}
        </div>
        <button class="btn-secondary" onclick="openModifForm(${JSON.stringify(p).replace(/"/g, '&quot;')})">Proposer une modif</button>
      </div>
    `).join("");
  } catch { list.innerHTML = '<p class="loading">Erreur de chargement.</p>'; }
}

function filterCollabPoi() {
  clearTimeout(_collabPoiSearchTimer);
  _collabPoiSearchTimer = setTimeout(loadCollabPoiList, 350);
}

function openModifForm(poi) {
  switchCollabTab("create");
  document.getElementById("cOriginalPoiId").value = poi.id;
  document.getElementById("cNom").value        = poi.nom || "";
  document.getElementById("cCategorie").value  = poi.categorie || "";
  document.getElementById("cCommune").value    = poi.commune || "";
  document.getElementById("cDepartement").value = poi.departement || "";
  document.getElementById("cLat").value        = poi.latitude || "";
  document.getElementById("cLng").value        = poi.longitude || "";
  document.getElementById("cSiecle").value     = poi.siecle || "";
  document.getElementById("cDescription").value = poi.description || "";
  document.getElementById("cCategorieWrap").style.display = "none";
  document.getElementById("cCancelModif").style.display = "inline-flex";
  document.getElementById("collabBtn").textContent = "Soumettre la modification";
  const banner = document.getElementById("cModifBanner");
  banner.textContent = `✏ Modification proposée pour : ${esc(poi.nom)}`;
  banner.classList.remove("hidden");
  document.getElementById("collabForm").scrollIntoView({ behavior: "smooth" });
}

function cancelModif() {
  document.getElementById("cOriginalPoiId").value = "";
  document.getElementById("collabForm").reset();
  document.getElementById("cCategorieWrap").style.display = "";
  document.getElementById("cCancelModif").style.display = "none";
  document.getElementById("collabBtn").textContent = "Envoyer la contribution";
  document.getElementById("cModifBanner").classList.add("hidden");
}

async function submitCollab(e) {
  e.preventDefault();
  const btn = document.getElementById("collabBtn");
  const errEl = document.getElementById("collabError");
  errEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Envoi…";

  try {
    const origId = document.getElementById("cOriginalPoiId").value;
    const res = await apiFetch("/collab/poi", {
      method: "POST",
      body: JSON.stringify({
        nom:           document.getElementById("cNom").value.trim(),
        categorie:     document.getElementById("cCategorie").value,
        commune:       document.getElementById("cCommune").value.trim(),
        departement:   document.getElementById("cDepartement").value.trim(),
        latitude:      parseFloat(document.getElementById("cLat").value) || 0,
        longitude:     parseFloat(document.getElementById("cLng").value) || 0,
        siecle:        document.getElementById("cSiecle").value.trim(),
        description:   document.getElementById("cDescription").value.trim(),
        originalPoiId: origId ? parseInt(origId) : null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      errEl.textContent = d.message || "Erreur serveur";
      errEl.classList.remove("hidden");
      return;
    }
    document.getElementById("collabForm").classList.add("hidden");
    document.getElementById("collabSuccess").classList.remove("hidden");
  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Envoyer la contribution";
  }
}

function resetCollabForm() {
  document.getElementById("collabForm").reset();
  document.getElementById("collabForm").classList.remove("hidden");
  document.getElementById("collabSuccess").classList.add("hidden");
}

/* =========================
   CONTRIBUTIONS (admin)
   ========================= */
async function loadContribCount() {
  try {
    const [resPoi, resParcours] = await Promise.all([
      apiFetch("/admin/data/contributions/count"),
      apiFetch("/api/parcours/admin/en-attente/count"),
    ]);
    const poi      = (await resPoi.json()).count      || 0;
    const parcours = (await resParcours.json()).count || 0;
    const total = poi + parcours;
    const badge = document.getElementById("contribBadge");
    const badgeM = document.getElementById("contribBadgeM");
    if (total > 0) {
      badge.textContent = total; badge.classList.remove("hidden");
      if (badgeM) { badgeM.textContent = total; badgeM.classList.remove("hidden"); }
    } else {
      badge.classList.add("hidden");
      if (badgeM) badgeM.classList.add("hidden");
    }
  } catch {}
}

function showContributions() {
  if (userRole !== "ROLE_ADMIN") return;
  showView("contributions");
  switchValidationTab("poi");
}

function switchValidationTab(tab) {
  document.getElementById("tabContribPoi").classList.toggle("active", tab === "poi");
  document.getElementById("tabContribParcours").classList.toggle("active", tab === "parcours");
  document.getElementById("panelContribPoi").classList.toggle("hidden", tab !== "poi");
  document.getElementById("panelContribParcours").classList.toggle("hidden", tab !== "parcours");
  if (tab === "poi") loadContributions();
  else loadParcoursAdmin();
}

async function loadContributions() {
  const list = document.getElementById("contribList");
  list.innerHTML = '<div class="loading">Chargement…</div>';
  try {
    const res = await apiFetch("/admin/data/contributions");
    const data = await res.json();
    const poiBadge = document.getElementById("contribPoiBadge");
    if (data.items.length > 0) { poiBadge.textContent = data.items.length; poiBadge.classList.remove("hidden"); }
    else poiBadge.classList.add("hidden");
    if (!data.items.length) {
      list.innerHTML = '<div class="loading">Aucune contribution en attente.</div>';
      return;
    }
    list.innerHTML = data.items.map(p => {
      const isModif = p.contributionType === "MODIFICATION" && p.original;
      const orig = p.original || {};
      const diffFields = [
        { label: "Nom",        prop: "nom" },
        { label: "Commune",    prop: "commune" },
        { label: "Département",prop: "departement" },
        { label: "Latitude",   prop: "latitude" },
        { label: "Longitude",  prop: "longitude" },
        { label: "Siècle",     prop: "siecle" },
        { label: "Description",prop: "description" },
      ];

      const diffHtml = isModif ? `
        <div class="contrib-diff">
          <div class="diff-col diff-before"><div class="diff-label">Avant</div>
            ${diffFields.filter(f => String(orig[f.prop] || "") !== String(p[f.prop] || "")).map(f => `
              <div class="diff-row"><span class="diff-field">${f.label}</span>
                <span class="diff-val old">${esc(String(orig[f.prop] || "—").slice(0, 80))}</span>
              </div>`).join("")}
          </div>
          <div class="diff-col diff-after"><div class="diff-label">Après</div>
            ${diffFields.filter(f => String(orig[f.prop] || "") !== String(p[f.prop] || "")).map(f => `
              <div class="diff-row"><span class="diff-field">${f.label}</span>
                <span class="diff-val new">${esc(String(p[f.prop] || "—").slice(0, 80))}</span>
              </div>`).join("")}
          </div>
        </div>` : "";

      return `
      <div class="contrib-card">
        <div class="contrib-info">
          <div class="contrib-header">
            <span class="contrib-nom">${esc(p.nom)}</span>
            <span class="badge ${isModif ? "badge-orange" : "badge-blue"}">${isModif ? "Modification" : "Création"}</span>
            <span class="badge badge-gray">${esc(p.categorie)}</span>
          </div>
          ${p.commune ? `<div class="contrib-meta">📍 ${esc(p.commune)}${p.departement ? ` · ${esc(p.departement)}` : ""}</div>` : ""}
          ${!isModif && p.description ? `<div class="contrib-desc">${esc(p.description.slice(0, 120))}${p.description.length > 120 ? "…" : ""}</div>` : ""}
          ${diffHtml}
          <div class="contrib-contributor">👤 ${esc(p.contributeurEmail || p.contributeurId || "—")}</div>
        </div>
        <div class="contrib-actions">
          <button class="btn-primary" onclick="validerContrib(${p.id})">✓ Valider</button>
          <button class="btn-icon danger" onclick="refuserContrib(${p.id})">✕ Refuser</button>
        </div>
      </div>`;
    }).join("");
  } catch {
    list.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

async function validerContrib(id) {
  try {
    const res = await apiFetch(`/admin/data/contributions/${id}/valider`, { method: "POST" });
    if (res.ok) { loadContributions(); loadContribCount(); }
    else alert("Erreur lors de la validation");
  } catch { alert("Serveur indisponible"); }
}

async function refuserContrib(id) {
  if (!confirm("Refuser et supprimer cette contribution ?")) return;
  try {
    const res = await apiFetch(`/admin/data/contributions/${id}`, { method: "DELETE" });
    if (res.ok) { loadContributions(); loadContribCount(); }
    else alert("Erreur lors du refus");
  } catch { alert("Serveur indisponible"); }
}

async function loadParcoursAdmin() {
  const list = document.getElementById("parcoursAdminList");
  list.innerHTML = '<div class="loading">Chargement…</div>';
  try {
    const res = await apiFetch("/api/parcours/admin/en-attente");
    const items = await res.json();
    if (!items.length) {
      list.innerHTML = '<div class="loading">Aucun parcours en attente de validation.</div>';
      const badge = document.getElementById("contribParcoursBadge");
      badge.classList.add("hidden");
      return;
    }
    const badge = document.getElementById("contribParcoursBadge");
    badge.textContent = items.length;
    badge.classList.remove("hidden");
    const TRANSPORT_LABELS = {
      "foot-walking": "🚶 À pied",
      "cycling-regular": "🚴 Vélo",
      "driving-car": "🚗 Voiture",
    };
    const NIVEAU_CLS = { FACILE: "badge-green", MOYEN: "badge-orange", DIFFICILE: "badge-red" };

    list.innerHTML = items.map(p => {
      const etapes = p.etapes || [];

      const etapesHtml = etapes.length ? etapes.map((e, i) => `
        <div class="pa-etape">
          <div class="pa-etape-dot">${i + 1}</div>
          ${i < etapes.length - 1 ? '<div class="pa-etape-line"></div>' : ""}
          <div class="pa-etape-content">
            <span class="pa-etape-nom">${esc(e.poiNom || e.poiId || "—")}</span>
            <span class="pa-etape-type">${esc(e.poiType || "")}</span>
            ${e.descriptionEtape ? `<span class="pa-etape-desc">${esc(e.descriptionEtape)}</span>` : ""}
          </div>
        </div>`).join("")
      : '<p class="contrib-meta" style="padding:.5rem 0">Aucune étape définie.</p>';

      return `
      <div class="parcours-admin-card">
        <div class="pa-left-bar"></div>
        <div class="pa-body">
          <div class="pa-header">
            <div class="pa-title-row">
              <span class="pa-titre">${esc(p.titre)}</span>
              <div class="pa-badges">
                <span class="badge badge-orange">En attente</span>
                <span class="badge badge-gray">${esc(THEMES[p.theme] || p.theme)}</span>
                <span class="badge ${NIVEAU_CLS[p.niveau] || "badge-gray"}">${esc(p.niveau || "FACILE")}</span>
              </div>
            </div>
            <div class="pa-stats">
              <span class="pa-stat">📍 <strong>${esc(p.ville)}</strong></span>
              ${p.dureeMinutes ? `<span class="pa-stat">⏱ <strong>${p.dureeMinutes} min</strong></span>` : ""}
              ${p.distanceKm   ? `<span class="pa-stat">📏 <strong>${p.distanceKm.toFixed(1)} km</strong></span>` : ""}
              <span class="pa-stat">${TRANSPORT_LABELS[p.transportMode] || esc(p.transportMode || "")}</span>
              <span class="pa-stat">🗺 <strong>${etapes.length}</strong> étape${etapes.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          ${p.description ? `<p class="pa-description">${esc(p.description)}</p>` : ""}

          <div class="pa-etapes-section">
            <div class="pa-etapes-title">Itinéraire</div>
            <div class="pa-etapes">${etapesHtml}</div>
          </div>
        </div>
        <div class="pa-actions">
          <button class="btn-primary" onclick="validerParcoursAdmin(${p.id}, true)">✓ Valider &amp; Publier</button>
          <button class="btn-secondary" onclick="validerParcoursAdmin(${p.id}, false)">Valider sans publier</button>
          <button class="btn-danger" onclick="refuserParcoursAdmin(${p.id})">✕ Refuser</button>
        </div>
      </div>`;
    }).join("");
  } catch {
    list.innerHTML = '<div class="loading">Erreur de chargement</div>';
  }
}

async function validerParcoursAdmin(id, publier) {
  try {
    const res = await apiFetch(`/api/parcours/admin/${id}/valider?publier=${publier}`, { method: "POST" });
    if (res.ok) { loadParcoursAdmin(); loadContribCount(); }
    else alert("Erreur lors de la validation");
  } catch { alert("Serveur indisponible"); }
}

async function refuserParcoursAdmin(id) {
  if (!confirm("Refuser ce parcours ? L'organisateur sera notifié et pourra le modifier.")) return;
  try {
    const res = await apiFetch(`/api/parcours/admin/${id}/refuser`, { method: "POST" });
    if (res.ok) { loadParcoursAdmin(); loadContribCount(); }
    else alert("Erreur lors du refus");
  } catch { alert("Serveur indisponible"); }
}

/* =========================
   CSV → GeoJSON
   ========================= */
const WIKIDATA_PREFIXES = {
  chateau:       "CH",
  bataille:      "B",
  musee:         "MU",
  eglise:        "EG",
  cathedrale:    "CA",
  pont:          "PT",
  majeur:        "MJ",
  prehistoire:   "PR",
  antiquite:     "AQ",
  demeure:       "DM",
  fortification: "FT",
  personnage:    "PN",
};

let _csvFeatures = [];
let _csvFilename = "";

function openCsvModal() {
  const cfg = CATEGORY_CONFIG[currentDataCategory] || { label: currentDataCategory };
  document.getElementById("csvModalCat").textContent = "Catégorie : " + cfg.label;
  document.getElementById("csvFileInput").value = "";
  document.getElementById("csvPreview").classList.add("hidden");
  document.getElementById("csvError").classList.add("hidden");
  document.getElementById("csvFileName").classList.add("hidden");
  document.getElementById("csvDropZone").classList.remove("csv-drop-active");
  document.getElementById("csvDownloadBtn").disabled = true;
  document.getElementById("csvImportBtn").disabled = true;
  _csvFeatures = [];
  document.getElementById("csvModal").classList.remove("hidden");
}

function closeCsvModal(e) {
  if (e && e.target !== document.getElementById("csvModal")) return;
  document.getElementById("csvModal").classList.add("hidden");
}

function parseCsvFull(text, sep) {
  const records = [];
  let inQuotes = false;
  let field = [];
  let record = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field.push('"'); i++; }
      else { inQuotes = !inQuotes; }
    } else if (!inQuotes && ch === sep) {
      record.push(field.join("").trim());
      field = [];
    } else if (!inQuotes && ch === '\r' && text[i + 1] === '\n') {
      // skip \r of CRLF — \n handled next iteration
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      record.push(field.join("").trim());
      if (record.some(f => f)) records.push(record);
      record = [];
      field = [];
    } else {
      field.push(ch);
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.join("").trim());
    if (record.some(f => f)) records.push(record);
  }
  return records;
}

function parseCsvToFeatures(text, categorie) {
  // Detect separator from first line
  const firstNl = text.indexOf('\n');
  const firstLine = text.substring(0, firstNl > 0 ? firstNl : Math.min(500, text.length));
  const sep = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  const records = parseCsvFull(text, sep);
  if (records.length < 2) throw new Error("Le fichier doit contenir au moins un en-tête et une ligne de données.");

  const headers = records[0].map(h => h.toLowerCase().replace(/['"]/g, "").trim());

  const latCandidates = ["latitude", "lat", "y"];
  const lngCandidates = ["longitude", "lon", "lng", "long", "x"];
  const latCol = latCandidates.find(c => headers.includes(c));
  const lngCol = lngCandidates.find(c => headers.includes(c));
  if (!latCol || !lngCol) {
    throw new Error(`Colonnes de coordonnées introuvables. Colonnes détectées : ${headers.join(", ")}`);
  }

  const prefix = WIKIDATA_PREFIXES[categorie] || categorie.toUpperCase().slice(0, 2);
  const features = [];
  let idCounter = 100000;

  for (let i = 1; i < records.length; i++) {
    const vals = records[i];
    if (vals.length < 2) continue;

    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });

    const lat = parseFloat(row[latCol]);
    const lng = parseFloat(row[lngCol]);
    if (isNaN(lat) || isNaN(lng)) continue;

    let wikidataId = row["wikidata_id"] || row["wikidataid"] || "";
    if (!wikidataId) wikidataId = `${prefix}${idCounter++}`;

    const props = { wikidata_id: wikidataId };
    headers.forEach(h => {
      if (h !== latCol && h !== lngCol) props[h] = row[h];
    });

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: props,
    });
  }

  return { features, headers, sep, latCol, lngCol };
}

function csvDragOver(e) {
  e.preventDefault();
  document.getElementById("csvDropZone").classList.add("csv-drop-active");
}

function csvDragLeave(_e) {
  document.getElementById("csvDropZone").classList.remove("csv-drop-active");
}

function csvDrop(e) {
  e.preventDefault();
  document.getElementById("csvDropZone").classList.remove("csv-drop-active");
  const file = e.dataTransfer.files[0];
  if (file) processCsvFile(file);
}

function onCsvFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  processCsvFile(file);
}

function processCsvFile(file) {
  _csvFilename = file.name.replace(/\.[^.]+$/, "");
  const errEl = document.getElementById("csvError");
  errEl.classList.add("hidden");
  document.getElementById("csvPreview").classList.add("hidden");
  document.getElementById("csvDownloadBtn").disabled = true;
  document.getElementById("csvImportBtn").disabled = true;

  const nameEl = document.getElementById("csvFileName");
  nameEl.textContent = file.name;
  nameEl.classList.remove("hidden");

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const { features, headers, sep, latCol, lngCol } = parseCsvToFeatures(e.target.result, currentDataCategory);
      _csvFeatures = features;
      document.getElementById("csvStatRows").textContent = features.length;
      document.getElementById("csvStatCols").textContent = headers.length;
      document.getElementById("csvColInfo").textContent =
        `Lat : "${latCol}" · Lng : "${lngCol}" · Séparateur : "${sep === ";" ? "point-virgule" : "virgule"}"`;
      document.getElementById("csvPreview").classList.remove("hidden");
      const hasData = features.length > 0;
      document.getElementById("csvDownloadBtn").disabled = !hasData;
      document.getElementById("csvImportBtn").disabled = !hasData;
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
      _csvFeatures = [];
    }
  };
  reader.readAsText(file, "UTF-8");
}

function downloadGeoJson() {
  if (!_csvFeatures.length) return;
  const geojson = { type: "FeatureCollection", features: _csvFeatures };
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${_csvFilename || currentDataCategory}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importCsvToDB() {
  if (!_csvFeatures.length) return;
  const btn = document.getElementById("csvImportBtn");
  const errEl = document.getElementById("csvError");
  btn.disabled = true;
  btn.textContent = "Import…";
  errEl.classList.add("hidden");

  try {
    const res = await apiFetch(`/admin/data/import-file/${currentDataCategory}`, {
      method: "POST",
      body: JSON.stringify(_csvFeatures),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.message || "Erreur serveur";
      errEl.classList.remove("hidden");
      return;
    }
    document.getElementById("csvModal").classList.add("hidden");
    alert(`Import terminé : ${data.imported} entrée(s) ajoutée(s).`);
    loadPoiData();
    loadCategories();
  } catch {
    errEl.textContent = "Serveur indisponible";
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "⬆ Importer en DB";
  }
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
