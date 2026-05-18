const API = "https://api.explogo.fr";

let token = localStorage.getItem("bo_token") || null;
let currentParcours = null; // parcours en cours d'édition
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
    localStorage.setItem("bo_token", token);
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
  token = null;
  showView("login");
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
    const res = await apiFetch(`/api/parcours/${id}`);
    const p = await res.json();
    currentParcours = p;
    etapes = p.etapes || [];

    document.getElementById("parcoursId").value = p.id;
    document.getElementById("fTitre").value = p.titre || "";
    document.getElementById("fVille").value = p.ville || "";
    document.getElementById("fTheme").value = p.theme || "GENERAL";
    document.getElementById("fNiveau").value = p.niveau || "FACILE";
    document.getElementById("fDistance").value = p.distanceKm || "";
    document.getElementById("fDuree").value = p.dureeMinutes || "";
    document.getElementById("fDescription").value = p.description || "";
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
    distanceKm: parseFloat(document.getElementById("fDistance").value) || null,
    dureeMinutes: parseInt(document.getElementById("fDuree").value) || null,
    description: document.getElementById("fDescription").value.trim(),
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
  etapes.push({ poiType: "monument", poiId: "", descriptionEtape: "" });
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

function renderEtapes() {
  const list = document.getElementById("etapesList");

  if (!etapes.length) {
    list.innerHTML = '<p class="etapes-empty">Aucune étape. Ajoutez des points d\'intérêt.</p>';
    return;
  }

  const typeOptions = POI_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join("");

  list.innerHTML = etapes.map((e, i) => `
    <div class="etape-row">
      <div class="etape-num">${i + 1}</div>
      <div class="etape-fields">
        <div class="form-group">
          <label>Type de POI</label>
          <select onchange="updateEtape(${i}, 'poiType', this.value)">
            ${POI_TYPES.map(t =>
              `<option value="${t.value}" ${e.poiType === t.value ? "selected" : ""}>${t.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>ID du POI</label>
          <input type="text" value="${esc(e.poiId || '')}"
            placeholder="Ex : PA00102614"
            onchange="updateEtape(${i}, 'poiId', this.value)">
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
