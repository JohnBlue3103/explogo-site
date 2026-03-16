(() => {
  // 1) Reveal on scroll
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

  // 2) Feature switcher (hover/click + clavier)
  const items = Array.from(document.querySelectorAll(".feature-item"));
  const titleEl = document.getElementById("featureTitle");
  const descEl = document.getElementById("featureDesc");
  const badgeEl = document.getElementById("featureBadge");
  const imgEl = document.getElementById("featureImg");

  function setActive(btn) {
    items.forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });

    const title = btn.dataset.title || btn.textContent.trim();
    const desc = btn.dataset.desc || "";
    const badge = btn.dataset.badge || "";
    const img = btn.dataset.img || "";

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (badgeEl) badgeEl.textContent = badge;

    if (imgEl && img) {
      // fade out -> change -> fade in
      imgEl.classList.add("is-fading");
      const next = new Image();
      next.src = img;
      next.onload = () => {
        imgEl.src = img;
        imgEl.classList.remove("is-fading");
      };
      // fallback si l'image met du temps
      setTimeout(() => imgEl.classList.remove("is-fading"), 500);
    }
  }

  if (items.length) {
    // Click
    items.forEach((btn) => btn.addEventListener("click", () => setActive(btn)));

    // Hover (desktop) — optionnel mais efficace
    items.forEach((btn) =>
      btn.addEventListener("mouseenter", () => {
        // évite les changements permanents sur mobile
        if (window.matchMedia("(hover: hover)").matches) setActive(btn);
      })
    );

    // Clavier (gauche/droite/haut/bas)
    items.forEach((btn, idx) => {
      btn.addEventListener("keydown", (e) => {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!keys.includes(e.key)) return;

        e.preventDefault();
        const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        const next = (idx + dir + items.length) % items.length;
        items[next].focus();
        setActive(items[next]);
      });
    });
  }

  // 3) Parallax très léger sur la "carte" du hero (premium)
  const map = document.querySelector(".hero-map");
  if (map) {
    let raf = null;
    const strength = 6; // faible = pro

    function onMove(x, y) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dx = (x - 0.5) * strength;
        const dy = (y - 0.5) * strength;
        map.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    }

    // souris (desktop)
    window.addEventListener("mousemove", (e) => {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      onMove(x, y);
    });

    // scroll (mobile/desktop)
    window.addEventListener(
      "scroll",
      () => {
        const y = Math.min(1, window.scrollY / 600);
        // petit drift vertical
        map.style.transform = `translate(0px, ${y * 6}px)`;
      },
      { passive: true }
    );
  }
})();

  // -----------------------------
  // 4) Counter "+20 000" (B)
  // -----------------------------
  const counterEl = document.getElementById("countPois");
  if (counterEl) {
    const target = Number(counterEl.dataset.count || "0");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const formatFR = (n) => {
      // format "20 000" (espaces insécables)
      return n.toLocaleString("fr-FR").replace(/\s/g, "\u00A0");
    };

    const animate = () => {
      if (prefersReduced || !Number.isFinite(target) || target <= 0) {
        counterEl.textContent = formatFR(target);
        return;
      }

      const duration = 900; // ms (pro, rapide)
      const start = performance.now();
      const from = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(from + (target - from) * eased);
        counterEl.textContent = formatFR(value);

        if (t < 1) requestAnimationFrame(tick);
        else counterEl.textContent = formatFR(target);
      };

      requestAnimationFrame(tick);
    };

    // Lance quand la zone est visible (évite de le jouer trop tôt)
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              animate();
              io.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      io.observe(counterEl);
    } else {
      animate();
    }
  }