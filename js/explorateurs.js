(() => {
  // 1) Reveal on scroll (même logique que la home)
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-revealed"));
  }

  // 2) Counters (stats du rapport)
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animateCounter = (el) => {
    const target = Number(el.getAttribute("data-counter") || "0");
    if (!Number.isFinite(target) || prefersReduced) {
      el.textContent = String(target);
      return;
    }
    const duration = 650;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const value = Math.round(from + (target - from) * eased);
      el.textContent = String(value);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };

    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              animateCounter(e.target);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach((el) => io.observe(el));
    } else {
      counters.forEach(animateCounter);
    }
  }

  // 3) Mini parallax comme la home (optionnel mais cohérent)
  const map = document.querySelector(".hero-map");
  if (map) {
    let raf = null;
    const strength = 6;

    function onMove(x, y) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (x - 0.5) * strength;
        const dy = (y - 0.5) * strength;
        map.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    }

    window.addEventListener("mousemove", (e) => {
      if (!window.matchMedia("(hover: hover)").matches) return;
      onMove(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    });

    window.addEventListener(
      "scroll",
      () => {
        const y = Math.min(1, window.scrollY / 600);
        map.style.transform = `translate(0px, ${y * 6}px)`;
      },
      { passive: true }
    );
  }
})();

// Démo “Détail des monuments” : dataset + rendu + recherche + compteurs
(() => {
  const input = document.getElementById("monumentSearch");
  const listEl = document.getElementById("monumentList");
  const emptyEl = document.getElementById("monumentEmpty");
  const countEl = document.getElementById("monumentCount");
  const visitedEl = document.getElementById("monumentsVisited");

  if (!input || !listEl) return;

  // Dataset démo (20 items)
  const MONUMENTS = [
    { title: "Hôtel Felzins", type: "Demeures", date: "24 février 2026" },
    { title: "Ancien hôtel de Lestang", type: "Demeures", date: "24 février 2026" },
    { title: "Hôtel de Castagnier d'Auriac", type: "Demeures", date: "23 février 2026" },
    { title: "Propriété La Redorte", type: "Demeures", date: "23 février 2026" },
    { title: "Musée de l’Affiche de Toulouse", type: "Musées", date: "19 février 2026" },
    { title: "Cathédrale Saint-Etienne", type: "Cathédrales", date: "19 février 2026" },

    { title: "Pont sur le Touch", type: "Ponts", date: "13 février 2026" },
    { title: "Pont", type: "Ponts", date: "13 février 2026" },
    { title: "Château de Taurenne", type: "Châteaux", date: "13 février 2026" },

    { title: "Eglise Saint-Louis-en-l'Île", type: "Églises", date: "12 février 2026" },
    { title: "Cité de l’Espace (Toulouse)", type: "Musées", date: "12 février 2026" },

    { title: "Musée des Augustins de Toulouse", type: "Musées", date: "11 février 2026" },

    { title: "Eglise Notre-Dame-de-la-Daurade", type: "Églises", date: "9 février 2026" },
    { title: "Eglise de la Dalbade", type: "Églises", date: "9 février 2026" },

    { title: "Eglise du Calvaire", type: "Églises", date: "6 février 2026" },
    { title: "Eglise Saint-Pierre et Saint-Paul", type: "Églises", date: "6 février 2026" },
    { title: "Eglise du Gésu", type: "Églises", date: "6 février 2026" },
    { title: "Eglise Saint-Denis", type: "Églises", date: "6 février 2026" },
    { title: "Château de Saint-Elix-le-Château", type: "Châteaux", date: "6 février 2026" },

    { title: "Château de Bellevue", type: "Châteaux", date: "5 février 2026" },
  ];

  // Helpers
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c]));

  // Rendu d’un item (même structure que tes cards)
  const renderItem = (m) => {
    const title = escapeHtml(m.title);
    const type = escapeHtml(m.type);
    const date = escapeHtml(m.date);

    return `
      <article class="visit-item" data-title="${escapeHtml(m.title)}" data-type="${escapeHtml(m.type)}">
        <div>
          <p class="visit-title">${title}</p>
          <p class="visit-meta">Visité le <span class="mono">${date}</span></p>
        </div>
        <span class="badge">${type}</span>
      </article>
    `;
  };

  // Mise à jour des compteurs “répartition par type” + total
  const setTypeCounts = (data) => {
    const byType = data.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {});

    const map = {
      "Églises": "count-eglises",
      "Demeures": "count-demeures",
      "Musées": "count-musees",
      "Châteaux": "count-chateaux",
      "Ponts": "count-ponts",
      "Cathédrales": "count-cathedrales",
    };

    Object.entries(map).forEach(([type, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(byType[type] || 0);
    });

    if (visitedEl) visitedEl.textContent = String(data.length);
  };

  // Rendu initial
  listEl.innerHTML = MONUMENTS.map(renderItem).join("");
  setTypeCounts(MONUMENTS);

  const items = Array.from(listEl.querySelectorAll(".visit-item"));

  const update = () => {
    const q = normalize(input.value);
    let visible = 0;

    items.forEach((item) => {
      const title = normalize(item.dataset.title || "");
      const type = normalize(item.dataset.type || "");
      const match = !q || title.includes(q) || type.includes(q);

      item.style.display = match ? "" : "none";
      if (match) visible += 1;
    });

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.hidden = visible !== 0;
  };

  // init + events
  update();
  input.addEventListener("input", update);

  // Bonus UX : Escape pour effacer
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      update();
      input.blur();
    }
  });
})();