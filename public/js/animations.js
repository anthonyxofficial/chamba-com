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

    .card-stagger.animate-in { opacity: 0; transform: translateY(24px); }
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

    /* SKELETON LOADING */
    .skeleton {
      background: linear-gradient(90deg, var(--ch-surface-variant) 25%, var(--ch-surface) 50%, var(--ch-surface-variant) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
    @keyframes skeleton-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* CUSTOM CURSOR */
    @media (hover: hover) and (pointer: fine) {
      .neo-cursor-dot, .neo-cursor-ring { display: block; }
    }
    .neo-cursor-dot {
      position: fixed; width: 8px; height: 8px;
      background: var(--ch-primary); z-index: 99999;
      pointer-events: none; transform: translate(-50%, -50%);
    }
    .neo-cursor-ring {
      position: fixed; width: 36px; height: 36px;
      border: 3px solid var(--ch-primary); z-index: 99998;
      pointer-events: none; transform: translate(-50%, -50%);
      transition: width 0.2s ease, height 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }
    .neo-cursor-ring.hover {
      width: 56px; height: 56px;
      background: var(--ch-primary); opacity: 0.1;
      border-color: var(--ch-inverse-primary);
    }
    @media (hover: none), (pointer: none) {
      .neo-cursor-dot, .neo-cursor-ring { display: none !important; }
    }

    /* GLITCH EFFECT */
    .glitch { position: relative; display: inline-block; }
    .glitch::before, .glitch::after {
      content: attr(data-text); position: absolute; top: 0; left: 0;
      width: 100%; height: 100%; opacity: 0; pointer-events: none;
    }
    .glitch:hover::before, .glitch:hover::after { opacity: 1; }
    .glitch::before {
      color: var(--ch-inverse-primary);
      animation: glitch-1 0.3s infinite steps(2);
      animation-play-state: paused;
    }
    .glitch::after {
      color: var(--ch-inverse-primary);
      animation: glitch-2 0.3s infinite steps(2);
      animation-play-state: paused;
    }
    .glitch:hover::before, .glitch:hover::after {
      animation-play-state: running;
    }
    @keyframes glitch-1 {
      0%   { clip-path: inset(20% 0 60% 0); transform: translate(3px, -2px); }
      25%  { clip-path: inset(60% 0 10% 0); transform: translate(-3px, 1px); }
      50%  { clip-path: inset(40% 0 30% 0); transform: translate(3px, 2px); }
      75%  { clip-path: inset(10% 0 70% 0); transform: translate(-2px, -1px); }
      100% { clip-path: inset(70% 0 5% 0);  transform: translate(3px, 1px); }
    }
    @keyframes glitch-2 {
      0%   { clip-path: inset(65% 0 10% 0); transform: translate(-3px, 1px); }
      25%  { clip-path: inset(15% 0 55% 0); transform: translate(3px, -2px); }
      50%  { clip-path: inset(50% 0 20% 0); transform: translate(-2px, 2px); }
      75%  { clip-path: inset(5% 0 60% 0);  transform: translate(3px, -1px); }
      100% { clip-path: inset(35% 0 40% 0); transform: translate(-3px, 1px); }
    }

    /* REDUCED MOTION */
    @media (prefers-reduced-motion: reduce) {
      .skeleton { animation: none; background-position: 0 0; }
      .marquee-track { animation: none; }
      .glitch::before, .glitch::after { animation: none; display: none; }
      .neo-cursor-dot, .neo-cursor-ring { display: none !important; }
    }
  `;
  document.head.appendChild(STYLE);

  if (REDUCED) {
    document.querySelectorAll('[data-reveal], .hero-stagger, .card-stagger, .cat-stagger')
      .forEach(el => { el.classList.remove('animate-in'); el.style.opacity = '1'; el.style.transform = 'none'; });
    document.querySelectorAll('[data-scramble]').forEach(el => { el.style.opacity = '1'; });
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

  // --- JOB CARD STAGGER (called after each renderEmpleos) ---
  function refreshCardStagger() {
    const cards = document.querySelectorAll('.card-stagger:not(.revealed):not(.animate-in)');
    if (!cards.length) return;

    cards.forEach(el => el.classList.add('animate-in'));

    requestAnimationFrame(() => {
      const hidden = document.querySelectorAll('.card-stagger.animate-in:not(.revealed)');
      if (!hidden.length) return;

      const revealAll = () => {
        hidden.forEach((el, i) => setTimeout(() => el.classList.add('revealed'), i * 100));
      };

      if (!('IntersectionObserver' in window)) {
        revealAll();
        return;
      }

      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealAll();
            obs.disconnect();
          }
        });
      }, { threshold: 0.05, rootMargin: '100px 0px' });
      obs.observe(hidden[0]);

      setTimeout(() => {
        obs.disconnect();
        document.querySelectorAll('.card-stagger.animate-in:not(.revealed)').forEach((el, i) => {
          setTimeout(() => el.classList.add('revealed'), i * 100);
        });
      }, 1000);
    });
  }
  window.refreshCardStagger = refreshCardStagger;

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

  // --- TEXT SCRAMBLE ---
  function initTextScramble() {
    const els = document.querySelectorAll('[data-scramble]');
    if (!els.length) return;

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*';

    els.forEach(el => {
      const finalText = el.textContent.trim();
      el.setAttribute('data-text', finalText);

      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            scrambleText(el, finalText, charset);
            obs.disconnect();
          }
        });
      }, { threshold: 0.5 });
      obs.observe(el);
    });
  }

  function scrambleText(el, finalText, charset) {
    const totalLen = finalText.length;
    const frames = 30;
    let frame = 0;

    const interval = setInterval(() => {
      let output = '';
      let allSettled = true;

      for (let i = 0; i < totalLen; i++) {
        const settleFrame = 8 + i * 4;
        if (frame >= settleFrame) {
          output += finalText[i];
        } else if (frame >= i * 2) {
          allSettled = false;
          output += charset[Math.floor(Math.random() * charset.length)];
        } else {
          allSettled = false;
          output += ' ';
        }
      }

      el.textContent = output;
      frame++;

      if (allSettled) {
        el.textContent = finalText;
        clearInterval(interval);
      }
    }, 50);
  }

  // --- MARQUEE SCROLL (content pre-duplicated in HTML) ---
  function initMarquee() {
    const track = document.querySelector('.marquee-track');
    if (!track) return;
    track.setAttribute('aria-hidden', 'true');
  }

  // --- CUSTOM CURSOR ---
  function initCustomCursor() {
    const dot = document.querySelector('.neo-cursor-dot');
    const ring = document.querySelector('.neo-cursor-ring');
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
    });

    function animateRing() {
      const ease = 0.12;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });

    document.addEventListener('mousedown', () => { ring.style.transform = 'translate(-50%, -50%) scale(0.85)'; });
    document.addEventListener('mouseup', () => { ring.style.transform = 'translate(-50%, -50%) scale(1)'; });
  }

  // --- MAGNETIC BUTTONS ---
  function initMagneticButtons() {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * 0.3;
        const dy = (e.clientY - cy) * 0.3;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.4s ease';
        el.style.transform = 'translate(0, 0)';
        setTimeout(() => { el.style.transition = ''; }, 400);
      });
    });
  }

  // --- 3D CARD TILT ---
  function initCardTilt() {
    document.querySelectorAll('.brutalist-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotateY = ((x - cx) / cx) * 8;
        const rotateX = -((y - cy) / cy) * 8;
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }
  window.initCardTilt = initCardTilt;

  // --- GLITCH SETUP ---
  function initGlitch() {
    document.querySelectorAll('.glitch').forEach(el => {
      if (!el.getAttribute('data-text')) {
        el.setAttribute('data-text', el.textContent);
      }
    });
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

  // --- SCROLL PROGRESS BAR ---
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    let ticking = false;
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  // --- INIT ---
  function init() {
    document.body.classList.remove('page-exit');

    const cursorHTML = '<div class="neo-cursor-dot"></div><div class="neo-cursor-ring"></div>';
    document.body.insertAdjacentHTML('beforeend', cursorHTML);

    initHeroStagger();
    initCatStagger();
    initCounters();
    initTextScramble();
    initMarquee();
    initCustomCursor();
    initMagneticButtons();
    initCardTilt();
    initGlitch();
    initPageTransitions();
    initScrollProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
