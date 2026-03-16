(() => {
  // 1) Reveal on scroll (même logique que la home)
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-revealed'));
  }

  // 2) Mini parallax du hero (cohérent)
  const map = document.querySelector('.hero-map');
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

    window.addEventListener('mousemove', (e) => {
      if (!window.matchMedia('(hover: hover)').matches) return;
      onMove(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    });

    window.addEventListener(
      'scroll',
      () => {
        const y = Math.min(1, window.scrollY / 600);
        map.style.transform = `translate(0px, ${y * 6}px)`;
      },
      { passive: true }
    );
  }

  // 3) Scenario switcher (tabs)
  const items = Array.from(document.querySelectorAll('.scenario-item'));
  const titleEl = document.getElementById('scenarioTitle');
  const descEl = document.getElementById('scenarioDesc');
  const badgeEl = document.getElementById('scenarioBadge');
  const listEl = document.getElementById('scenarioItems');
  const cardEl = document.querySelector('.scenario-card');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setActive = (btn) => {
    items.forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    const title = btn.dataset.title || btn.textContent.trim();
    const desc = btn.dataset.desc || '';
    const itemsRaw = btn.dataset.items || '';

    if (badgeEl) badgeEl.textContent = title;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    if (listEl) {
      const parts = itemsRaw
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/^•\s*/, ''));

      listEl.innerHTML = parts.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
    }

    if (cardEl && !prefersReduced) {
      cardEl.classList.remove('is-updating');
      // force reflow
      void cardEl.offsetWidth;
      cardEl.classList.add('is-updating');
    }
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])
    );

  if (items.length) {
    // init
    setActive(items.find((b) => b.classList.contains('is-active')) || items[0]);

    items.forEach((btn) => btn.addEventListener('click', () => setActive(btn)));

    // clavier (gauche/droite/haut/bas)
    items.forEach((btn, idx) => {
      btn.addEventListener('keydown', (e) => {
        const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];
        if (!keys.includes(e.key)) return;

        e.preventDefault();
        const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        const next = (idx + dir + items.length) % items.length;
        items[next].focus();
        setActive(items[next]);
      });
    });
  }
})();
