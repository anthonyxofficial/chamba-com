(() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BEZIER = 'cubic-bezier(0.2, 0, 0, 1)';

  const STYLE = document.createElement('style');
  STYLE.textContent = `
    [data-reveal] { opacity: 0; will-change: transform, opacity; }
    [data-reveal="up"]    { transform: translateY(32px); }
    [data-reveal="down"]  { transform: translateY(-32px); }
    [data-reveal="left"]  { transform: translateX(-40px); }
    [data-reveal="right"] { transform: translateX(40px); }
    [data-reveal="scale"] { transform: scale(0.92); }
    [data-reveal="fade"]  { transform: none; }

    [data-reveal].revealed {
      opacity: 1;
      transform: translateY(0) translateX(0) scale(1);
      transition: opacity 0.6s ${BEZIER}, transform 0.6s ${BEZIER};
    }

    .hero-stagger { opacity: 0; transform: translateY(40px); }
    .hero-stagger.revealed {
      opacity: 1; transform: translateY(0);
      transition: opacity 0.7s ${BEZIER}, transform 0.7s ${BEZIER};
    }

    .card-stagger { opacity: 0; transform: translateY(24px); }
    .card-stagger.revealed {
      opacity: 1; transform: translateY(0);
      transition: opacity 0.5s ${BEZIER}, transform 0.5s ${BEZIER};
    }

    .cat-stagger { opacity: 0; transform: scale(0.88); }
    .cat-stagger.revealed {
      opacity: 1; transform: scale(1);
      transition: opacity 0.5s ${BEZIER}, transform 0.5s ${BEZIER};
    }

    .page-transition { transition: opacity 0.15s ease-out; }
    .page-exit { opacity: 0; }
  `;
  document.head.appendChild(STYLE);

  if (REDUCED) {
    document.querySelectorAll('[data-reveal], .hero-stagger, .card-stagger, .cat-stagger')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  // --- SCROLL REVEAL ---
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

  // --- HERO TEXT STAGGER ---
  function initHeroStagger() {
    const heroLines = document.querySelectorAll('.hero-stagger');
    if (!heroLines.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          heroLines.forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 150);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.2 });

    obs.observe(heroLines[0]);
  }

  // --- JOB CARD STAGGER ---
  function initCardStagger() {
    const cards = document.querySelectorAll('.card-stagger');
    if (!cards.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          cards.forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 100);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.08 });

    obs.observe(cards[0]);
  }

  // --- CATEGORY CARD POP ---
  function initCatStagger() {
    const cats = document.querySelectorAll('.cat-stagger');
    if (!cats.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          cats.forEach((el, i) => {
            setTimeout(() => el.classList.add('revealed'), i * 80);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.15 });

    obs.observe(cats[0]);
  }

  // --- NUMBER COUNTER ---
  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';

      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(el, target, suffix);
            obs.disconnect();
          }
        });
      }, { threshold: 0.5 });

      obs.observe(el);
    });
  }

  function animateCount(el, target, suffix) {
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // --- PAGE TRANSITIONS ---
  function initPageTransitions() {
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      if (link.target === '_blank') return;
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === window.location.pathname) return;
        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => { window.location.href = href; }, 150);
      });
    });
  }

  // --- INIT ---
  function init() {
    initHeroStagger();
    initCardStagger();
    initCatStagger();
    initCounters();
    initPageTransitions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
