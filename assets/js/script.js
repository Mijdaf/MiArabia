  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- custom cursor (desktop, fine pointer, motion allowed) ----------
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if(!dot || !ring || prefersReducedMotion || !hasFinePointer) return;

    document.documentElement.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let ringX = mouseX, ringY = mouseY;
    let started = false;

    window.addEventListener('pointermove', (e) => {
      if(e.pointerType !== 'mouse') return;
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
      if(!started){ ringX = mouseX; ringY = mouseY; started = true; }
    }, { passive:true });

    // Ring trails the dot with a light spring/lag for a smoother, premium feel
    function tick(){
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    const hoverSelector = 'a, button, [data-ripple], .service-card, .gallery-item, input, textarea, select, .spec-pill, [role="tab"]';
    document.addEventListener('pointerover', (e) => {
      if(e.target.closest && e.target.closest(hoverSelector)){
        ring.classList.add('is-hovering');
        dot.classList.add('is-hovering');
      }
    }, { passive:true });
    document.addEventListener('pointerout', (e) => {
      if(e.target.closest && e.target.closest(hoverSelector) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(hoverSelector))){
        ring.classList.remove('is-hovering');
        dot.classList.remove('is-hovering');
      }
    }, { passive:true });

    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = ''; ring.style.opacity = ''; });
  })();

  // ---------- global click sound (soft "thud" on every click) ----------
  (function(){
    let audioCtx;
    function playClickSound(){
      try {
        if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch(e) { /* ignore (autoplay restrictions, unsupported browsers, etc.) */ }
    }
    document.addEventListener('click', playClickSound, { passive: true });
  })();

  // ---------- shared touch "genuine tap" detector ----------
  // 'click' alone isn't reliable enough here: on a quick flick where the
  // finger barely moves, the browser can still treat it as a tap even
  // though the page kept scrolling underneath it (momentum scroll). So
  // this tracks BOTH how far the finger moved AND whether the page's
  // scroll position actually changed during the touch, and only then
  // dispatches an 'app:tap' event — anything that wants "tap, not scroll"
  // (haptics, the why-row shine) listens for that instead of pointerdown/click.
  (function(){
    const MOVE_THRESHOLD = 10; // px of finger movement allowed and still count as a tap
    const SCROLL_THRESHOLD = 2; // px of page scroll allowed and still count as a tap
    let startX = 0, startY = 0, startScrollY = 0, tracking = false, downTarget = null;

    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') { tracking = false; return; }
      startX = e.clientX; startY = e.clientY;
      startScrollY = window.scrollY;
      downTarget = e.target;
      tracking = true;
    }, { passive: true, capture: true });

    document.addEventListener('pointerup', (e) => {
      if (!tracking || e.pointerType !== 'touch') { tracking = false; return; }
      tracking = false;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      const scrolled = Math.abs(window.scrollY - startScrollY) > SCROLL_THRESHOLD;
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD || scrolled) return; // was a scroll/drag, not a tap
      (downTarget || e.target).dispatchEvent(new CustomEvent('app:tap', { bubbles: true }));
    }, { passive: true, capture: true });

    document.addEventListener('pointercancel', () => { tracking = false; }, { passive: true, capture: true });
  })();

  // ---------- global haptic tap feedback (touch devices only) ----------
  // A short buzz on every genuine tap that performs an action — the touch
  // equivalent of the click "thud" sound above. Scoped to real action
  // elements (links, buttons, toggles, tabs, cards) so typing into a text
  // field doesn't buzz on every tap. Android/Chrome support the Vibration
  // API; iOS Safari doesn't expose it, so taps there just stay silent —
  // a platform limitation, not a bug. Listens for 'app:tap' (see above)
  // rather than pointerdown/click, so scrolling never triggers it.
  (function(){
    if (!('vibrate' in navigator)) return;
    const ACTION_SELECTOR = 'a, button, [role="button"], [role="tab"], [data-ripple], .service-card, .gallery-item, .spec-pill, .why-row';
    document.addEventListener('app:tap', (e) => {
      if (e.target.closest && e.target.closest(ACTION_SELECTOR)) {
        navigator.vibrate(12);
      }
    });
  })();

  // Shared WhatsApp number used by the contact form and both quick-action
  // popups (Request a Quote / Inquiries) — one place to update it.
  const CONTACT_WHATSAPP_NUMBER = '966536760429';

  // Light / dark theme toggle
  (function(){
    const root = document.documentElement;
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const isDark = () => root.getAttribute('data-theme') === 'dark';

    const syncLabel = () => {
      const dark = isDark();
      toggleBtn.setAttribute('aria-pressed', String(dark));
      const isEnglish = root.getAttribute('lang') === 'en';
      toggleBtn.setAttribute('aria-label',
        dark
          ? (isEnglish ? 'Switch to light mode' : 'التبديل للوضع الفاتح')
          : (isEnglish ? 'Switch to dark mode' : 'التبديل للوضع الداكن')
      );
    };
    syncLabel();

    toggleBtn.addEventListener('click', () => {
      const dark = !isDark();
      if (dark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
      try { localStorage.setItem('mijdaf-theme', dark ? 'dark' : 'light'); } catch(e) {}
      syncLabel();
    });
  })();

  // ---------- scroll progress bar ----------
  (function(){
    const bar = document.getElementById('scrollProgress');
    if(!bar) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    };
    update();
    window.addEventListener('scroll', () => {
      if(!ticking){ ticking = true; requestAnimationFrame(update); }
    }, { passive:true });
    window.addEventListener('resize', update);
  })();

  // ---------- magnetic buttons ----------
  // Nudges [data-magnetic] elements a few px toward the cursor while hovered,
  // for a subtle premium feel. Desktop / precise-pointer only.
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(prefersReducedMotion || !hasFinePointer) return;

    const STRENGTH = 0.28;
    const MAX_OFFSET = 10;

    document.querySelectorAll('[data-magnetic]').forEach(el => {
      let rect = null;
      el.addEventListener('pointerenter', (e) => {
        if(e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        rect = el.getBoundingClientRect();
      });
      el.addEventListener('pointermove', (e) => {
        if(!rect) return;
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, relX * STRENGTH));
        const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, relY * STRENGTH));
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        el.style.transform = '';
      });
    });
  })();

  // ---------- click ripple ----------
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReducedMotion) return;

    document.querySelectorAll('[data-ripple]').forEach(el => {
      el.addEventListener('pointerdown', (e) => {
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.6;
        const dot = document.createElement('span');
        dot.className = 'ripple-dot';
        dot.style.width = dot.style.height = size + 'px';
        dot.style.left = (e.clientX - rect.left - size / 2) + 'px';
        dot.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(dot);
        dot.addEventListener('animationend', () => dot.remove());
      });
    });
  })();

  // Header scroll state
  const header = document.getElementById('siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  // ---------- header auto-hide (phones) ----------
  // Scrolling down tucks the bar away to give the content the full screen;
  // any upward scroll brings it straight back. Desktop keeps it pinned.
  (function(){
    const mq = window.matchMedia('(max-width:760px)');
    const HIDE_AFTER = 140;   // don't tuck while still near the top
    const DELTA = 6;          // ignore scroll jitter
    let lastY = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      const diff = y - lastY;
      if(Math.abs(diff) < DELTA) return;
      lastY = y;

      // never hide on desktop, while the drawer is open, or near the top
      if(!mq.matches || document.body.classList.contains('nav-open') || y < HIDE_AFTER){
        header.classList.remove('nav-tucked');
        return;
      }
      header.classList.toggle('nav-tucked', diff > 0);
    };

    window.addEventListener('scroll', update, { passive:true });
    mq.addEventListener('change', () => header.classList.remove('nav-tucked'));
  })();

  // Mobile nav
  const navToggle = document.getElementById('navToggle');
  const navClose = document.getElementById('navClose');
  const navOverlay = document.getElementById('navOverlay');
  const primaryNav = document.getElementById('primaryNav');

  const setNavOpen = (open) => {
    primaryNav.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open);
    document.body.classList.toggle('nav-open', open);
    if(open){
      header.classList.remove('nav-tucked');
      navOverlay.hidden = false;
      requestAnimationFrame(() => navOverlay.classList.add('open'));
      document.body.style.overflow = 'hidden';
      // move focus into the drawer so keyboard/screen-reader users land there
      window.setTimeout(() => navClose.focus({ preventScroll:true }), 60);
    } else {
      navOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if(primaryNav.contains(document.activeElement)) navToggle.focus({ preventScroll:true });
      window.setTimeout(() => { if(!primaryNav.classList.contains('open')) navOverlay.hidden = true; }, 350);
    }
    syncNavReachability();
  };

  // Off-screen drawer links shouldn't be tabbable on phones; on desktop the
  // same <nav> is the visible bar, so it must stay fully reachable.
  const mobileNavMQ = window.matchMedia('(max-width:760px)');
  function syncNavReachability(){
    const drawerMode = mobileNavMQ.matches;
    const hidden = drawerMode && !primaryNav.classList.contains('open');
    primaryNav.querySelectorAll('a, button').forEach(el => {
      if(hidden) el.setAttribute('tabindex', '-1');
      else el.removeAttribute('tabindex');
    });
    primaryNav.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    navToggle.setAttribute('aria-controls', 'primaryNav');
  }
  syncNavReachability();
  mobileNavMQ.addEventListener('change', () => {
    if(!mobileNavMQ.matches && primaryNav.classList.contains('open')) setNavOpen(false);
    else syncNavReachability();
  });

  // Keep Tab inside the open drawer
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Tab' || !primaryNav.classList.contains('open')) return;
    const items = Array.from(primaryNav.querySelectorAll('a, button'))
      .filter(el => el.offsetParent !== null);
    if(!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  navToggle.addEventListener('click', () => setNavOpen(!primaryNav.classList.contains('open')));
  navClose.addEventListener('click', () => setNavOpen(false));
  navOverlay.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && primaryNav.classList.contains('open')) setNavOpen(false);
  });
  primaryNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNavOpen(false)));

  // ---------- Active nav link on scroll ----------
  // Watches exactly the sections the nav links point at (the old list didn't
  // match the links, so some items never lit up) and picks whichever section
  // covers the most of the viewport.
  const navLinks = Array.from(primaryNav.querySelectorAll('a[href^="#"]'))
    .filter(a => !a.classList.contains('nav-drawer-cta'));
  const navTargets = navLinks
    .map(a => ({ link:a, el:document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter(t => t.el);

  const navPill = document.getElementById('navPill');
  const deskNavMQ = window.matchMedia('(min-width:761px)');

  function movePillTo(link){
    if(!navPill || !deskNavMQ.matches) return;
    if(!link){ navPill.classList.remove('on'); return; }
    navPill.style.setProperty('--nav-pill-x', link.offsetLeft + 'px');
    navPill.style.setProperty('--nav-pill-w', link.offsetWidth + 'px');
    navPill.classList.add('on');
  }
  const activeLink = () => navLinks.find(l => l.classList.contains('active')) || null;
  const parkPill = () => movePillTo(activeLink());

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => movePillTo(link));
    link.addEventListener('focus', () => movePillTo(link));
  });
  primaryNav.addEventListener('mouseleave', parkPill);
  primaryNav.addEventListener('focusout', () => {
    if(!primaryNav.contains(document.relatedTarget)) parkPill();
  });
  window.addEventListener('resize', parkPill);
  deskNavMQ.addEventListener('change', parkPill);
  // the language toggle rewrites the labels, so widths change
  document.getElementById('langToggle')?.addEventListener('click', () => {
    window.setTimeout(parkPill, 120);
  });

  const setActive = (link) => {
    if(link && link.classList.contains('active')) return;
    navLinks.forEach(l => l.classList.toggle('active', l === link));
    parkPill();
  };

  const visibility = new Map();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    let best = null, bestRatio = 0;
    navTargets.forEach(t => {
      const ratio = visibility.get(t.el.id) || 0;
      if(ratio > bestRatio){ bestRatio = ratio; best = t.link; }
    });
    setActive(bestRatio > 0.06 ? best : null);
  }, { threshold:[0, 0.06, 0.25, 0.5, 0.75, 1], rootMargin:'-72px 0px -20% 0px' });
  navTargets.forEach(t => spy.observe(t.el));

  // Reveal on scroll (3D) — one-shot, GPU-only (transform/opacity), will-change cleared after use
  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const el = entry.target;
        el.classList.add('in');
        const clearWillChange = () => { el.style.willChange = 'auto'; el.removeEventListener('transitionend', clearWillChange); };
        el.addEventListener('transitionend', clearWillChange);
        revealObs.unobserve(el);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObs.observe(el));

  // ---------- Whole-screen slide transition (left/right, repeats on every scroll) ----------
  // Every full section (except the hero, which is already on screen on load)
  // slides in from the right or left, alternating, and slides back out the
  // same way when scrolled past — so it replays every time, not just once.
  // Runs identically on phone and desktop; respects prefers-reduced-motion
  // via the CSS (.screen-slide under that media query disables the transform).
  (function(){
    const screens = Array.from(document.querySelectorAll('main > section'))
      .filter(el => !el.classList.contains('hero'));
    screens.forEach((el, i) => {
      el.classList.add('screen-slide', i % 2 === 0 ? 'dir-r' : 'dir-l');
    });
    const screenObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('in', entry.isIntersecting);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });
    screens.forEach(el => screenObs.observe(el));
  })();

  // Values (Quality/Capabilities/Journey/Ambition): same staggered reveal +
  // icon line-draw + touch "sheen" replay pattern used for the why-us rows,
  // so this section flows like the rest of the site instead of a card grid.
  const valueItems = document.querySelectorAll('.value-reveal');
  const valueIsTouchDevice = window.matchMedia('(hover:none), (pointer:coarse)').matches;
  const valueObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      const delay = idx * 110;

      setTimeout(() => {
        el.classList.add('in');

        const shapes = el.querySelectorAll('.value-icon svg path, .value-icon svg circle, .value-icon svg polygon, .value-icon svg line');
        shapes.forEach((shape, i) => {
          if (typeof shape.getTotalLength !== 'function') return;
          const len = shape.getTotalLength();
          shape.style.transition = 'none';
          shape.style.strokeDasharray = len;
          shape.style.strokeDashoffset = len;
          requestAnimationFrame(() => {
            shape.style.transition = `stroke-dashoffset 1s cubic-bezier(.16,.84,.44,1) ${i * 0.15}s`;
            shape.style.strokeDashoffset = '0';
          });
        });

        if (valueIsTouchDevice) {
          setTimeout(() => {
            el.classList.add('is-active');
            setTimeout(() => el.classList.remove('is-active'), 1000);
          }, 250);
        }
      }, delay);

      valueObs.unobserve(el);
    });
  }, { threshold: 0.25 });
  valueItems.forEach(el => valueObs.observe(el));

  // Values accordion: each row (Quality & Safety / Capabilities / Journey /
  // Ambition) opens on click to reveal its body, closing any other open row
  // first — a single-open-at-a-time accordion rather than a static list.
  (function(){
    const rows = Array.from(document.querySelectorAll('.value-row'));
    if(!rows.length) return;

    function closeRow(row){
      const btn = row.querySelector('[data-value-toggle]');
      const collapse = row.querySelector('.value-body-collapse');
      row.classList.remove('is-open');
      if(btn) btn.setAttribute('aria-expanded', 'false');
      if(collapse) collapse.style.maxHeight = '0px';
    }

    function openRow(row){
      const btn = row.querySelector('[data-value-toggle]');
      const collapse = row.querySelector('.value-body-collapse');
      row.classList.add('is-open');
      if(btn) btn.setAttribute('aria-expanded', 'true');
      if(collapse) collapse.style.maxHeight = collapse.scrollHeight + 'px';
    }

    rows.forEach(row => {
      const btn = row.querySelector('[data-value-toggle]');
      if(!btn) return;
      btn.addEventListener('click', () => {
        const wasOpen = row.classList.contains('is-open');
        rows.forEach(r => { if(r !== row) closeRow(r); });
        wasOpen ? closeRow(row) : openRow(row);
      });
    });

    // Recompute the open panel's height on resize and expose a manual
    // refresh hook so the language switch (which changes text length) can
    // keep the currently open panel sized correctly.
    function refreshOpenRow(){
      const openRowEl = rows.find(r => r.classList.contains('is-open'));
      if(!openRowEl) return;
      const collapse = openRowEl.querySelector('.value-body-collapse');
      if(collapse) collapse.style.maxHeight = collapse.scrollHeight + 'px';
    }
    window.addEventListener('resize', refreshOpenRow);
    window.__refreshOpenValueRow = refreshOpenRow;
  })();

  // ---------- 3D pointer tilt for cards (desktop / precise-pointer only) ----------
  // Skips entirely on touch devices and when the user prefers reduced motion,
  // so mobile never pays for mousemove listeners it can't use.
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (prefersReducedMotion || !hasFinePointer) return;

    const TILT_TARGETS = [
      { selector: '.service-card', max: 8,  lift: -8,  scale: 1.02 }
    ];

    TILT_TARGETS.forEach(({ selector, max, lift, scale }) => {
      document.querySelectorAll(selector).forEach(el => {
        let rect = null;
        let ticking = false;
        let pendingEvent = null;

        const update = () => {
          ticking = false;
          if (!pendingEvent || !rect) return;
          const px = (pendingEvent.clientX - rect.left) / rect.width;
          const py = (pendingEvent.clientY - rect.top) / rect.height;
          const rx = (0.5 - py) * max;   // rotateX: up/down tilt
          const ry = (px - 0.5) * max;   // rotateY: left/right tilt
          el.style.transform = `translateY(${lift}px) perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
        };

        el.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
          rect = el.getBoundingClientRect();
          el.style.willChange = 'transform';
        });

        el.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
          pendingEvent = e;
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        });

        el.addEventListener('pointerleave', () => {
          el.style.transform = '';
          el.style.willChange = 'auto';
          rect = null;
        });
      });
    });
  })();

  // ---------- Hero 3D parallax on scroll (rAF-throttled, transform-only) ----------
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Parallax targets the wrapper div, not .hero-bg itself — the video already
    // runs its own continuous heroZoom transform animation, so moving a separate
    // wrapper avoids two transform sources fighting over the same element.
    const heroBgWrap = document.querySelector('.hero-bg-wrap');
    const heroContent = document.querySelector('.hero-content');
    const heroSection = document.querySelector('.hero');
    if (prefersReducedMotion || !heroBgWrap || !heroContent || !heroSection) return;

    // heroZoom (the continuous CSS zoom animation) is disabled on mobile for
    // performance, but a light scroll-linked parallax is still cheap (transform
    // only) — so phones get a toned-down version instead of nothing.
    const isMobile = window.matchMedia('(max-width:760px)').matches;
    const bgShift = isMobile ? 18 : 40;
    const bgScaleAmt = isMobile ? 0.015 : 0.03;
    const contentShift = isMobile ? -10 : -18;
    const contentTilt = isMobile ? 2 : 5;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = heroSection.getBoundingClientRect();
      const h = rect.height || 1;
      // progress: 0 at top of hero in view, 1 once fully scrolled past
      const progress = Math.min(Math.max(-rect.top / h, 0), 1);
      if (rect.bottom < 0 || rect.top > window.innerHeight) return; // off-screen, skip work
      heroBgWrap.style.transform = `translateY(${progress * bgShift}px) scale(${1 + progress * bgScaleAmt})`;
      heroContent.style.transform = `translateY(${progress * contentShift}px) rotateX(${progress * contentTilt}deg) translateZ(0)`;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  })();

  // ---------- Gallery images: continuous parallax drift while scrolling ----------
  // Unlike .gallery-reveal (a one-shot enter animation), this keeps each photo
  // gently drifting the whole time it's in view — most noticeable on phones,
  // where the gallery is scrolled through slowly one card at a time.
  (function(){
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgs = Array.from(document.querySelectorAll('.gallery-item img'));
    if (prefersReducedMotion || !imgs.length) return;

    const isMobile = window.matchMedia('(max-width:760px)').matches;
    const STRENGTH = isMobile ? 12 : 20; // max px drift

    // Only elements currently near the viewport get updated each frame.
    const visible = new Set();
    const parallaxObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
    }, { rootMargin: '15% 0px' });
    imgs.forEach(img => parallaxObs.observe(img));

    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      visible.forEach(img => {
        const rect = img.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const distance = elCenter - vh / 2;
        const progress = distance / (vh / 2 + rect.height / 2); // ~ -1..1
        const clamped = Math.max(-1, Math.min(1, progress));
        img.style.setProperty('--py', (clamped * STRENGTH).toFixed(1) + 'px');
      });
    };
    update();
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    });
  })();

  // Why-us rows: staggered reveal + icon line-draw
  const whyItems = document.querySelectorAll('.why-reveal');
  const isTouchDevice = window.matchMedia('(hover:none), (pointer:coarse)').matches;
  const whyObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      const delay = idx * 110;

      setTimeout(() => {
        el.classList.add('in');

        // icon draws itself in like a blueprint line
        const path = el.querySelector('.why-icon svg path');
        if(path){
          const len = path.getTotalLength();
          path.style.transition = 'none';
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          requestAnimationFrame(() => {
            path.style.transition = 'stroke-dashoffset 1s cubic-bezier(.16,.84,.44,1)';
            path.style.strokeDashoffset = '0';
          });
        }

        // On touch devices there's no hover to trigger the accent sweep /
        // sheen / icon glow, so replay that same flourish once here instead,
        // right after the row settles in.
        if (isTouchDevice) {
          setTimeout(() => {
            el.classList.add('is-active');
            setTimeout(() => el.classList.remove('is-active'), 1000);
          }, 250);
        }
      }, delay);

      whyObs.unobserve(el);
    });
  }, { threshold: 0.3 });
  whyItems.forEach(el => whyObs.observe(el));

  // Visual tap feedback on the "why" rows — replays the accent sweep /
  // sheen / icon glow on each genuine tap (the haptic buzz itself is
  // handled by the global tap-feedback module above, which already covers
  // .why-row). Listens for 'app:tap' so scrolling past a row never
  // triggers it — see the shared tap detector near the top of this file.
  if (isTouchDevice) {
    document.querySelectorAll('.why-row').forEach(row => {
      row.addEventListener('app:tap', () => {
        row.classList.add('is-active');
        window.clearTimeout(row._shineTimer);
        row._shineTimer = window.setTimeout(() => row.classList.remove('is-active'), 1000);
      });
    });
  }

  // Why-us rows: the icon next to each heading is now the accordion
  // trigger — tapping it opens/closes that row's hidden description.
  // Rows are independent (opening one doesn't close the others).
  document.querySelectorAll('.why-row').forEach(row => {
    const btn = row.querySelector('.why-icon');
    if (!btn) return;

    const toggle = () => {
      const isOpen = row.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    // The icon stays the real button (keyboard + screen readers use it),
    // and it stops propagation so the row handler below doesn't undo it.
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    // Anywhere else on the row works too.
    row.addEventListener('click', (e) => {
      // Don't hijack a link, or a click that was really a text selection.
      if (e.target.closest('a, button')) return;
      const sel = window.getSelection();
      if (sel && String(sel).length > 0) return;
      toggle();
    });
  });

  // ---------- Shared line-aware typewriter helpers ----------
  // Typing straight into flowing text lets the browser re-wrap mid-word: the
  // last word of a line starts appearing at the line's end, then the whole
  // (partially-typed) word jumps down as soon as it no longer fits. To avoid
  // that, we first measure — on the real, already-rendered content — exactly
  // which words land on which visual line, then type each line inside its
  // own line box, so a word is only ever typed on the line it belongs on.
  // Used by the section/hero title typewriter and the "why us" row typing.
  function twComputeLines(root){
    const lines = [];
    let current = [];
    let lastTop = null;

    function ancestorPath(node){
      const path = [];
      let el = node.parentElement;
      while (el && el !== root) { path.unshift(el.tagName); el = el.parentElement; }
      return path;
    }

    function handleTextNode(node){
      const text = node.textContent;
      if (!text) return;
      const tokens = text.match(/\s+|\S+/g) || [];
      const path = ancestorPath(node);
      let offset = 0;
      tokens.forEach(tok => {
        const start = offset;
        offset += tok.length;
        let top = lastTop;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, offset);
        const rects = range.getClientRects();
        if (rects.length) top = Math.round(rects[0].top);
        if (lastTop !== null && Math.abs(top - lastTop) > 1) {
          lines.push(current);
          current = [];
        }
        current.push({ path, text: tok });
        lastTop = top;
      });
    }

    (function walk(node){
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) handleTextNode(child);
        else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      });
    })(root);

    if (current.length) lines.push(current);
    return lines;
  }

  function twMergeRuns(tokens){
    const runs = [];
    tokens.forEach(tok => {
      const key = tok.path.join('>');
      const last = runs[runs.length - 1];
      if (last && last.key === key) last.text += tok.text;
      else runs.push({ key, path: tok.path, text: tok.text });
    });
    return runs;
  }

  function twBuildChain(path){
    let top = null, leaf = null;
    path.forEach(tag => {
      const el = document.createElement(tag);
      if (leaf) leaf.appendChild(el); else top = el;
      leaf = el;
    });
    return { top, leaf };
  }

  // Types `root`'s precomputed `lines` (from twComputeLines) into fresh
  // per-line boxes, keeping `cursor` at the caret. Leaves any partial state
  // as-is (for the caller to handle) if `alive()` turns false mid-typing.
  async function twTypeLines(root, lines, speed, cursor, alive, sleep){
    for (const lineTokens of lines) {
      if (!alive()) return false;
      const lineEl = document.createElement('span');
      lineEl.className = 'tw-line';
      root.appendChild(lineEl);
      lineEl.appendChild(cursor);

      const runs = twMergeRuns(lineTokens);
      for (const run of runs) {
        if (!alive()) return false;
        let leafParent = lineEl;
        if (run.path.length) {
          const chain = twBuildChain(run.path);
          lineEl.insertBefore(chain.top, cursor);
          leafParent = chain.leaf;
        }
        const tn = document.createTextNode('');
        leafParent.insertBefore(tn, leafParent === lineEl ? cursor : null);
        for (let i = 0; i < run.text.length; i++) {
          if (!alive()) return false;
          tn.textContent += run.text[i];
          await sleep(speed);
        }
      }
    }
    return true;
  }

  // Why-us rows: type the description out character by character when the
  // row opens. The real <p> keeps the text (so it stays selectable, stays
  // readable by screen readers, and stays the element the AR/EN switcher
  // rewrites); it's just faded while an overlay span types the same string
  // over it. We type line-by-line (see twComputeLines above) with slice()
  // within each line — rather than one <span> per letter — so Arabic
  // letters keep their joined forms while a line builds up.
  (function whyTypewriter(){
    const rows = document.querySelectorAll('.why-row');
    if (!rows.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const SPEED = 24;        // ms per character
    const START_DELAY = 200; // let the row finish expanding first

    rows.forEach(row => {
      const p = row.querySelector('.why-row-details > p');
      if (!p) return;

      const out = document.createElement('span');
      out.className = 'why-typed-out';
      out.setAttribute('aria-hidden', 'true');
      p.parentNode.appendChild(out);

      let timer = null;

      const stop = () => {
        window.clearTimeout(timer);
        timer = null;
        row.classList.remove('is-typing');
        out.innerHTML = '';
      };

      const play = () => {
        stop();
        if (reduceMotion.matches) return;

        const text = (p.textContent || '').trim();
        if (!text) return;

        // Measure the real, already-laid-out paragraph to find exactly which
        // words fall on which of its (up to 3) visual lines, then type each
        // line inside its own box — see twComputeLines above for why.
        const lineStrings = twComputeLines(p)
          .map(tokens => tokens.map(t => t.text).join('').trim())
          .filter(Boolean);
        if (!lineStrings.length) return;

        row.classList.add('is-typing');
        const lineEls = lineStrings.map(() => {
          const s = document.createElement('span');
          s.className = 'tw-line';
          out.appendChild(s);
          return s;
        });
        const cursor = document.createElement('span');
        cursor.className = 'tw-cursor';

        let lineIdx = 0, charIdx = 0;

        const step = () => {
          const lineText = lineStrings[lineIdx];
          const lineEl = lineEls[lineIdx];
          charIdx++;
          lineEl.textContent = lineText.slice(0, charIdx);
          lineEl.appendChild(cursor); // keep the caret on the line being typed

          if (charIdx < lineText.length) {
            // A touch of jitter so it reads like typing, not a machine.
            const ch = lineText.charAt(charIdx - 1);
            const pause = /[.،,؛;:!؟?]/.test(ch) ? SPEED * 7 : SPEED + Math.random() * 18;
            timer = window.setTimeout(step, pause);
            return;
          }
          lineIdx++;
          charIdx = 0;
          if (lineIdx < lineStrings.length) {
            timer = window.setTimeout(step, SPEED + Math.random() * 18);
            return;
          }
          // Done: fade the caret, then hand the lines back to the real <p>.
          cursor.style.animation = 'none';
          cursor.style.transition = 'opacity .5s ease';
          cursor.style.opacity = '0';
          timer = window.setTimeout(() => {
            row.classList.remove('is-typing');
            out.innerHTML = '';
          }, 520);
        };

        timer = window.setTimeout(step, START_DELAY);
      };

      // Drive off the .is-open class so any way of opening the row (the
      // icon button, or anything we add later) triggers the same effect.
      // Only react to the open state actually flipping — the class list
      // also changes when we add/remove .is-typing ourselves.
      let wasOpen = row.classList.contains('is-open');
      new MutationObserver(() => {
        const isOpen = row.classList.contains('is-open');
        if (isOpen === wasOpen) return;
        wasOpen = isOpen;
        isOpen ? play() : stop();
      }).observe(row, { attributes: true, attributeFilter: ['class'] });
      if (wasOpen) play();

      // Language switch while a row is open: retype in the new language.
      new MutationObserver(() => {
        if (row.classList.contains('is-open')) play();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

      if (typeof reduceMotion.addEventListener === 'function') {
        reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) stop(); });
      }
    });
  })();

  // Services cards: staggered reveal + icon line-draw
  const serviceItems = document.querySelectorAll('.service-reveal');
  const serviceObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      const delay = idx * 120;

      setTimeout(() => {
        el.classList.add('in');

        const path = el.querySelector('.icon svg path');
        if(path){
          const len = path.getTotalLength();
          path.style.transition = 'none';
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          requestAnimationFrame(() => {
            path.style.transition = 'stroke-dashoffset .9s cubic-bezier(.16,.84,.44,1)';
            path.style.strokeDashoffset = '0';
          });
        }
      }, delay);

      serviceObs.unobserve(el);
    });
  }, { threshold: 0.25 });
  serviceItems.forEach(el => serviceObs.observe(el));

  // Click-to-open detail cards (services grid + about capability cards)
  // Each group behaves as its own accordion — one open card per group.
  (function(){
    const initExpandGroup = (cards) => {
      if(!cards.length) return;

      const currentLang = () => (document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar');

      const syncHint = (card) => {
        const hint = card.querySelector('.hint-text');
        if(!hint) return;
        const lang = currentLang();
        const open = card.classList.contains('is-open');
        hint.textContent = open
          ? hint.getAttribute(`data-${lang}-close`)
          : hint.getAttribute(`data-${lang}-open`);
      };

      const closeCard = (card) => {
        card.classList.remove('is-open');
        card.setAttribute('aria-expanded', 'false');
        syncHint(card);
      };

      const openCard = (card) => {
        card.classList.add('is-open');
        card.setAttribute('aria-expanded', 'true');
        syncHint(card);
      };

      const toggleCard = (card) => {
        const willOpen = !card.classList.contains('is-open');
        cards.forEach(other => { if(other !== card) closeCard(other); });
        if(willOpen) openCard(card); else closeCard(card);
      };

      cards.forEach(card => {
        syncHint(card);
        card.addEventListener('click', () => toggleCard(card));
        card.addEventListener('keydown', (e) => {
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            toggleCard(card);
          }
        });
      });

      document.querySelectorAll('.lang-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          setTimeout(() => cards.forEach(syncHint), 0);
        });
      });
    };

    initExpandGroup(Array.from(document.querySelectorAll('[data-service-card]')));
  })();

  // About section: interactive capability panel (pill tabs, fade/slide content)
  (function(){
    const panel = document.querySelector('[data-spec-panel]');
    if(!panel) return;

    const tabs = Array.from(panel.querySelectorAll('.spec-pill'));
    const views = Array.from(panel.querySelectorAll('.spec-view'));
    if(!tabs.length || !views.length) return;

    const TRANSITION_MS = 380;

    const activate = (index) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if(active) tab.scrollIntoView({ behavior:'smooth', inline:'nearest', block:'nearest' });
      });

      const nextView = views[index];

      views.forEach((view, i) => {
        if(view === nextView) return;
        if(view.classList.contains('is-active')){
          // Let the outgoing panel crossfade out instead of vanishing instantly.
          view.classList.remove('is-active');
          view.classList.add('is-leaving');
          window.clearTimeout(view._specLeaveTimer);
          view._specLeaveTimer = window.setTimeout(() => {
            view.classList.remove('is-leaving');
            view.setAttribute('hidden', '');
          }, TRANSITION_MS);
        } else {
          view.classList.remove('is-active', 'is-leaving');
          view.setAttribute('hidden', '');
        }
      });

      window.clearTimeout(nextView._specLeaveTimer);
      nextView.classList.remove('is-leaving');
      nextView.removeAttribute('hidden');
      // Force reflow so re-selecting the same tab (or a fast re-entry)
      // restarts the entrance + stagger animations rather than no-op-ing.
      nextView.classList.remove('is-active');
      void nextView.offsetWidth;
      nextView.classList.add('is-active');
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(i));
      tab.addEventListener('keydown', (e) => {
        let target = null;
        if(e.key === 'ArrowRight') target = i + 1;
        else if(e.key === 'ArrowLeft') target = i - 1;
        else if(e.key === 'Home') target = 0;
        else if(e.key === 'End') target = tabs.length - 1;
        if(target === null) return;
        e.preventDefault();
        target = ((target % tabs.length) + tabs.length) % tabs.length;
        tabs[target].focus();
        activate(target);
      });
    });
  })();

  // Language toggle (Arabic <-> English)
  (function(){
    const htmlEl = document.documentElement;
    const titleEl = document.querySelector('title');
    const descEl = document.querySelector('meta[name="description"]');
    const labelEls = document.querySelectorAll('.lang-toggle-label');

    const titles = {
      ar: 'مي أرابيا للمقاولات العامة — مقاولات عامة وخدمات صناعية',
      en: 'MiArabia — General Contracting & Industrial Services'
    };
    const descriptions = {
      ar: 'مي أرابيا للمقاولات العامة — شركة سعودية متخصصة في أعمال الأنابيب واللحام والتصنيع والصيانة وخدمات القوى العاملة، وفق أعلى معايير السلامة والجودة.',
      en: 'MiArabia for General Contracting — a Saudi company delivering piping, welding & fabrication, maintenance and manpower services to the highest safety and quality standards.'
    };

    // Capture the original Arabic content once, before any switching happens.
    document.querySelectorAll('[data-en]').forEach(el => el.setAttribute('data-ar', el.textContent));
    document.querySelectorAll('[data-en-html]').forEach(el => el.setAttribute('data-ar-html', el.innerHTML));
    document.querySelectorAll('[data-en-placeholder]').forEach(el => el.setAttribute('data-ar-placeholder', el.getAttribute('placeholder') || ''));

    function setLanguage(lang){
      htmlEl.setAttribute('lang', lang);
      htmlEl.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

      document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = lang === 'ar' ? el.getAttribute('data-ar') : el.getAttribute('data-en');
      });
      document.querySelectorAll('[data-en-html]').forEach(el => {
        el.innerHTML = lang === 'ar' ? el.getAttribute('data-ar-html') : el.getAttribute('data-en-html');
      });
      document.querySelectorAll('[data-en-placeholder]').forEach(el => {
        el.setAttribute('placeholder', lang === 'ar' ? el.getAttribute('data-ar-placeholder') : el.getAttribute('data-en-placeholder'));
      });
      document.querySelectorAll('[data-tooltip-en]').forEach(el => {
        const text = lang === 'ar' ? el.getAttribute('data-tooltip') : el.getAttribute('data-tooltip-en');
        el.setAttribute('title', text);
        el.setAttribute('aria-label', text);
      });

      titleEl.textContent = titles[lang];
      descEl.setAttribute('content', descriptions[lang]);
      labelEls.forEach(l => { l.textContent = lang === 'ar' ? 'English' : 'العربية'; });

      try { localStorage.setItem('mijdaf-lang', lang); } catch(e) {}

      if (typeof window.__refreshOpenValueRow === 'function') {
        // Wait a tick for the text swap above to reflow before measuring.
        requestAnimationFrame(window.__refreshOpenValueRow);
      }
    }

    document.querySelectorAll('.lang-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = htmlEl.getAttribute('lang') === 'ar' ? 'ar' : 'en';
        setLanguage(current === 'ar' ? 'en' : 'ar');
      });
    });

    let saved = null;
    try { saved = localStorage.getItem('mijdaf-lang'); } catch(e) {}
    if (saved === 'en') setLanguage('en');
  })();

  // Forward a submitted form to the admin dashboard (no-op until Supabase is connected)
  function sendToDashboard(payload){
    try {
      if (window.mijdafData && window.mijdafData.isReady()) {
        window.mijdafData.submitMessage(payload);
      }
    } catch (e) { console.error('sendToDashboard failed', e); }
  }

  // Contact form -> WhatsApp handoff (same number as the quick-action popups)
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('fname').value.trim();
    const company = document.getElementById('fcompany').value.trim();
    const email = document.getElementById('femail').value.trim();
    const service = document.getElementById('fservice').value;
    const phone = document.getElementById('fphone').value.trim();
    const phone2 = document.getElementById('fphone2').value.trim();
    const details = document.getElementById('fmsg').value.trim();

    let msg = `طلب جديد من موقع مي أرابيا:\n\n*الاسم:* ${name}`;
    if (company) msg += `\n*الشركة:* ${company}`;
    msg += `\n*البريد الإلكتروني:* ${email}`;
    msg += `\n*الخدمة المطلوبة:* ${service}`;
    msg += `\n*رقم الجوال:* ${phone}`;
    if (phone2) msg += `\n*رقم بديل:* ${phone2}`;
    if (details) msg += `\n*تفاصيل المشروع:* ${details}`;

    const url = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    sendToDashboard({
      source: 'contact',
      name, company, email, phone, phone2,
      service, message: details,
    });

    success.classList.add('show');
    form.querySelectorAll('input, textarea').forEach(el => el.value = '');
    success.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });

  // Quick action popups (Request a Quote / Inquiries) -> WhatsApp handoff
  (function(){
    const WHATSAPP_NUMBER = CONTACT_WHATSAPP_NUMBER;
    let lastFocused = null;

    // Lighter, glassy look once the hero (dark video) is scrolled past, so page content stays prominent.
    // We check boundingClientRect.bottom directly (not just isIntersecting) because relying on
    // isIntersecting alone can misfire depending on scroll position at load time.
    const quickActions = document.getElementById('quickActions');
    const collapseAnchor = document.querySelector('.hero');
    if (quickActions && collapseAnchor) {
      const heroObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const scrolledPast = entry.boundingClientRect.bottom < 0;
          quickActions.classList.toggle('past-hero', scrolledPast);
        });
      }, { threshold: [0, 1] });
      heroObs.observe(collapseAnchor);
    }

    // The two quick-action pills (Request a Quote / Inquiries) are always
    // visible by design — no FAB toggle needed, nothing to expand/collapse.

    function openModal(overlay){
      lastFocused = document.activeElement;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      const firstField = overlay.querySelector('input, textarea, select');
      if (firstField) setTimeout(() => firstField.focus(), 300);
    }

    function closeModal(overlay){
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    function openWhatsApp(message){
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }

    function setupModal({ openBtnId, overlayId, formId, successId, buildMessage, buildPayload }){
      const openBtn = document.getElementById(openBtnId);
      const overlay = document.getElementById(overlayId);
      const modalForm = document.getElementById(formId);
      const successEl = document.getElementById(successId);
      if (!openBtn || !overlay || !modalForm) return;

      openBtn.addEventListener('click', () => openModal(overlay));

      overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(overlay));
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(overlay);
      });

      modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (successEl) successEl.classList.add('show');

        const message = buildMessage(modalForm);
        openWhatsApp(message);

        if (buildPayload) sendToDashboard(buildPayload(modalForm));

        modalForm.querySelectorAll('input, textarea').forEach(el => el.value = '');
        setTimeout(() => closeModal(overlay), 1400);
        setTimeout(() => { if (successEl) successEl.classList.remove('show'); }, 1800);
      });
    }

    setupModal({
      openBtnId: 'openRequestModal',
      overlayId: 'requestModalOverlay',
      formId: 'quickRequestForm',
      successId: 'requestFormSuccess',
      buildMessage: (form) => {
        const name = form.querySelector('#qrName').value.trim();
        const company = form.querySelector('#qrCompany').value.trim();
        const phone = form.querySelector('#qrPhone').value.trim();
        const service = form.querySelector('#qrService').value;
        let msg = `طلب جديد من موقع مي أرابيا:\n\n*الاسم:* ${name}`;
        if (company) msg += `\n*الشركة:* ${company}`;
        msg += `\n*رقم الجوال:* ${phone}\n*الخدمة المطلوبة:* ${service}`;
        return msg;
      },
      buildPayload: (form) => ({
        source: 'quick_request',
        name: form.querySelector('#qrName').value.trim(),
        company: form.querySelector('#qrCompany').value.trim(),
        phone: form.querySelector('#qrPhone').value.trim(),
        service: form.querySelector('#qrService').value,
      })
    });

    setupModal({
      openBtnId: 'openInquiryModal',
      overlayId: 'inquiryModalOverlay',
      formId: 'quickInquiryForm',
      successId: 'inquiryFormSuccess',
      buildMessage: (form) => {
        const message = form.querySelector('#qiMessage').value.trim();
        const phone = form.querySelector('#qiPhone').value.trim();
        return `استفسار جديد من موقع مي أرابيا:\n\n*الاستفسار:* ${message}\n*رقم التواصل:* ${phone}`;
      },
      buildPayload: (form) => ({
        source: 'quick_inquiry',
        message: form.querySelector('#qiMessage').value.trim(),
        phone: form.querySelector('#qiPhone').value.trim(),
      })
    });
  })();

  // Gallery: load from Supabase when connected, otherwise keep the built-in images.
  // Then wire up the scroll reveal + lightbox on whichever items end up in the DOM.
  (async function(){
    const grid = document.getElementById('galleryGrid');
    if (grid && window.mijdafData && window.mijdafData.isReady()) {
      try {
        const images = await window.mijdafData.listImages();
        if (images.length) {
          grid.innerHTML = images.map((img, i) => {
            const sizeClass = img.size === 'wide' ? 'g-wide' : img.size === 'big' ? 'g-big' : '';
            const tag = String(i + 1).padStart(2, '0');
            return `
              <figure class="gallery-item gallery-reveal ${sizeClass}" style="--i:${i}" data-gallery-item tabindex="0" role="button" aria-haspopup="dialog"
                data-caption-title="${img.titleAr}" data-caption-title-en="${img.titleEn || img.titleAr}"
                data-caption-text="${img.textAr}" data-caption-text-en="${img.textEn || img.textAr}">
                <img src="${img.url}" alt="${img.titleAr}" loading="lazy">
                <span class="gallery-expand" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </span>
                <figcaption class="gallery-caption">
                  <span class="gallery-tag">${tag}</span>
                  <h4 data-en="${img.titleEn || img.titleAr}">${img.titleAr}</h4>
                  <p data-en="${img.textEn || img.textAr}">${img.textAr}</p>
                </figcaption>
              </figure>`;
          }).join('');
        }
      } catch (e) {
        console.error('gallery load failed, showing default images', e);
      }
    }

    // Staggered bento reveal on scroll
    const galleryItems = document.querySelectorAll('.gallery-reveal');
    if (galleryItems.length) {
      const galleryObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
          setTimeout(() => el.classList.add('in'), idx * 90);
          galleryObs.unobserve(el);
        });
      }, { threshold: 0.15 });
      galleryItems.forEach(el => galleryObs.observe(el));
    }

    setupGalleryLightbox();
  })();

  // Gallery: click-to-expand lightbox
  function setupGalleryLightbox(){
    const items = Array.from(document.querySelectorAll('[data-gallery-item]'));
    const overlay = document.getElementById('lightboxOverlay');
    if (!items.length || !overlay) return;

    const imgEl = document.getElementById('lightboxImg');
    const titleEl = document.getElementById('lightboxTitle');
    const textEl = document.getElementById('lightboxText');
    const closeBtn = document.getElementById('lightboxClose');
    let lastFocused = null;

    const isEnglish = () => document.documentElement.getAttribute('lang') === 'en';

    function openLightbox(item){
      lastFocused = document.activeElement;
      const src = item.querySelector('img').getAttribute('src');
      const alt = item.querySelector('img').getAttribute('alt') || '';
      imgEl.setAttribute('src', src);
      imgEl.setAttribute('alt', alt);

      const titleAr = item.getAttribute('data-caption-title') || '';
      const titleEn = item.getAttribute('data-caption-title-en') || titleAr;
      const textAr = item.getAttribute('data-caption-text') || '';
      const textEn = item.getAttribute('data-caption-text-en') || textAr;
      titleEl.textContent = isEnglish() ? titleEn : titleAr;
      textEl.textContent = isEnglish() ? textEn : textAr;

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtn.focus(), 250);
    }

    function closeLightbox(){
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    items.forEach(item => {
      item.addEventListener('click', () => openLightbox(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(item);
        }
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeLightbox();
    });
  }

  // Process circles: click a step's icon circle to open a popup with its content
  (function(){
    const circles = Array.from(document.querySelectorAll('[data-process-circle]'));
    const overlay = document.getElementById('processModalOverlay');
    if (!circles.length || !overlay) return;

    const iconEl = document.getElementById('processModalIcon');
    const numEl = document.getElementById('processModalNum');
    const titleEl = document.getElementById('processModalTitle');
    const textEl = document.getElementById('processModalText');
    const closeBtn = overlay.querySelector('.modal-close');
    let lastFocused = null;

    const isEnglish = () => document.documentElement.getAttribute('lang') === 'en';

    function openProcessModal(circle){
      lastFocused = document.activeElement;

      const svg = circle.querySelector('.process-circle-ring svg');
      iconEl.innerHTML = svg ? svg.outerHTML : '';
      numEl.textContent = circle.getAttribute('data-num') || '';

      const titleAr = circle.getAttribute('data-title-ar') || '';
      const titleEn = circle.getAttribute('data-title-en') || titleAr;
      const textAr = circle.getAttribute('data-text-ar') || '';
      const textEn = circle.getAttribute('data-text-en') || textAr;
      titleEl.textContent = isEnglish() ? titleEn : titleAr;
      textEl.textContent = isEnglish() ? textEn : textAr;

      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtn && closeBtn.focus(), 250);
    }

    function closeProcessModal(){
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    circles.forEach(circle => {
      circle.addEventListener('click', () => openProcessModal(circle));
    });

    overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeProcessModal);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeProcessModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeProcessModal();
    });
  })();

// ---------- easter egg: click the logo 2x fast ----------
(function(){
  const logo = document.querySelector('header .logo');
  if(!logo) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const EMOJIS = ['🦺','⛑️','🔧','🚧','🧰','⚙️','📐'];

  let clickCount = 0;
  let resetTimer = null;

  function spawnRain(){
    if(prefersReducedMotion) return;
    const count = 28;
    for(let i = 0; i < count; i++){
      const span = document.createElement('span');
      span.className = 'egg-emoji';
      span.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      span.style.left = (Math.random() * 100) + 'vw';
      span.style.fontSize = (18 + Math.random() * 22) + 'px';
      span.style.animationDuration = (2 + Math.random() * 1.6) + 's';
      span.style.animationDelay = (Math.random() * 0.5) + 's';
      document.body.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    }
  }

  function triggerEasterEgg(){
    if(!prefersReducedMotion){
      document.body.classList.add('egg-shake');
      setTimeout(() => document.body.classList.remove('egg-shake'), 550);
    }
    spawnRain();
  }

  logo.addEventListener('click', (e) => {
    clickCount++;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { clickCount = 0; }, 1800);

    if(clickCount >= 2){
      e.preventDefault();
      clickCount = 0;
      triggerEasterEgg();
    }
  });
})();

// ---------- easter egg: request button plays hard-to-get (desktop mouse only) ----------
(function(){
  const btn = document.getElementById('openRequestModal');
  if(!btn) return;

  const hasFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!hasFinePointer || prefersReducedMotion) return; // touch & reduced-motion users: normal button, always

  const MAX_DODGES = 1;
  const PADDING = 14;
  let dodges = 0;
  let settled = true;
  let initialRect = null;

  function getInitialRect(){
    if(!initialRect){
      initialRect = btn.getBoundingClientRect();
    }
    return initialRect;
  }

  function settle(){
    settled = true;
    btn.style.transition = 'transform .35s ease';
    btn.style.transform = 'translate(0px, 0px)';
    btn.classList.add('qa-caught');
    setTimeout(() => btn.classList.remove('qa-caught'), 500);
  }

  function dodge(){
    if(dodges >= MAX_DODGES){ settle(); return; }
    dodges++;
    settled = false;
    const rect = getInitialRect();
    const minX = Math.min(PADDING - rect.left, (window.innerWidth - PADDING) - rect.right);
    const maxX = Math.max(PADDING - rect.left, (window.innerWidth - PADDING) - rect.right);
    const minY = Math.min(PADDING - rect.top, (window.innerHeight - PADDING) - rect.bottom);
    const maxY = Math.max(PADDING - rect.top, (window.innerHeight - PADDING) - rect.bottom);
    const dx = minX + Math.random() * (maxX - minX);
    const dy = minY + Math.random() * (maxY - minY);
    btn.style.transition = 'transform .28s cubic-bezier(.34,1.56,.64,1)';
    btn.style.transform = `translate(${dx}px, ${dy}px)`;
    if(dodges >= MAX_DODGES){
      // After teasing a few times, it gives up so the request can actually be submitted
      setTimeout(settle, 260);
    }
  }

  btn.addEventListener('pointerenter', (e) => {
    if(e.pointerType !== 'mouse') return; // touch/pen: never dodges, always tappable
    dodge();
  });

  btn.addEventListener('click', () => {
    // Reset the game for next time, after letting this click go through
    setTimeout(() => { dodges = 0; settle(); }, 400);
  });

  window.addEventListener('resize', () => {
    initialRect = null;
    settle();
    dodges = 0;
  });
})();

// About section: capability pills swap places every 3 seconds (FLIP animation)
// "مقاولات عامة" is the anchor pill, centered above; these three shuffle beneath it.
// Connector lines are drawn from the anchor down to each child, and stay glued
// to them (like workflow-diagram links) even while they animate into new spots.
(function(){
  const kicker = document.querySelector('[data-kicker]');
  const anchor = document.querySelector('.spec-pill[data-anchor]');
  const container = document.querySelector('[data-kicker-sub]');
  const svg = document.querySelector('[data-kicker-lines]');
  if(!kicker || !anchor || !container) return;

  let pills = Array.from(container.children);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- connector lines (anchor -> each child) ----
  const drawLines = () => {
    if(!svg) return;
    const host = kicker.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const x0 = (a.left + a.right) / 2 - host.left;
    const y0 = a.bottom - host.top + 6;

    let markup = '';
    Array.from(container.children).forEach(pill => {
      const c = pill.getBoundingClientRect();
      const x1 = (c.left + c.right) / 2 - host.left;
      const y1 = c.top - host.top;
      const midY = y0 + (y1 - y0) / 2;
      markup += `<path d="M ${x0} ${y0} C ${x0} ${midY}, ${x1} ${midY}, ${x1} ${y1}"/>`;
      markup += `<circle cx="${x0}" cy="${y0}" r="4"/><circle cx="${x1}" cy="${y1}" r="4"/>`;
    });
    svg.innerHTML = markup;
  };

  const syncSvgBox = () => {
    if(!svg) return;
    const host = kicker.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${host.width} ${host.height}`);
    drawLines();
  };

  // Keep the lines glued to the pills for the whole ~650ms FLIP transition
  let rafId = null;
  const followDuringAnimation = (durationMs) => {
    const start = performance.now();
    const step = (now) => {
      drawLines();
      if(now - start < durationMs){
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
      }
    };
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  };

  window.addEventListener('resize', syncSvgBox);
  window.addEventListener('load', syncSvgBox);
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(syncSvgBox).catch(() => {});
  }
  syncSvgBox();
  // Re-check shortly after paint in case web fonts/layout shifted things
  setTimeout(syncSvgBox, 300);

  // Keep the lines glued to the pills while the section's own fade/rise-in plays
  const revealWatcher = new MutationObserver(() => {
    if(kicker.classList.contains('in')) followDuringAnimation(850);
  });
  revealWatcher.observe(kicker, { attributes:true, attributeFilter:['class'] });

  if(reduceMotion || pills.length < 2){
    return; // keep static lines, skip the shuffling below
  }

  const shuffle = (arr) => {
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const reorder = () => {
    if(document.hidden) return;

    // FIRST: record current positions
    const first = new Map();
    pills.forEach(pill => first.set(pill, pill.getBoundingClientRect()));

    // Pick a new order guaranteed to differ from the current one
    let newOrder = shuffle(pills);
    let attempts = 0;
    while(newOrder.every((pill, i) => pill === pills[i]) && attempts < 5){
      newOrder = shuffle(pills);
      attempts++;
    }

    // LAST: reflow the DOM into the new order, right after the anchor pill
    newOrder.forEach(pill => container.appendChild(pill));
    pills = newOrder;

    // INVERT + PLAY: animate each pill from its old spot to its new one
    newOrder.forEach(pill => {
      const last = pill.getBoundingClientRect();
      const firstRect = first.get(pill);
      const dx = firstRect.left - last.left;
      const dy = firstRect.top - last.top;
      if(!dx && !dy) return;

      window.clearTimeout(pill._flipTimer);
      pill.style.transition = 'none';
      pill.style.transform = `translate(${dx}px, ${dy}px)`;
      void pill.offsetWidth; // force reflow
      pill.style.transition = 'transform .6s cubic-bezier(.16,.84,.44,1)';
      pill.style.transform = 'translate(0, 0)';
      pill._flipTimer = window.setTimeout(() => {
        pill.style.transition = '';
        pill.style.transform = '';
      }, 620);
    });

    // Lines follow the pills through the whole transition
    followDuringAnimation(650);
  };

  setInterval(reorder, 3000);
})();

/* ---------- logo shake easter egg ---------- */
(function(){
  const logoLink = document.getElementById('logoShake');
  const logoImg  = document.getElementById('logoImg');
  if(!logoLink || !logoImg) return;

  const EMOJIS = ['🛠️','🔧','⚙️','🏗️','👷','🔩','✨','🎉'];
  let shaking = false;

  function spawnEmojis(){
    const burst = document.createElement('div');
    burst.className = 'logo-emoji-burst';
    logoLink.appendChild(burst);

    const count = 8;
    for(let i = 0; i < count; i++){
      const span = document.createElement('span');
      span.className = 'logo-emoji';
      span.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5 - 0.25);
      const distance = 46 + Math.random() * 34;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 10;
      const rot = (Math.random() * 140 - 70) + 'deg';

      span.style.setProperty('--tx', tx.toFixed(1) + 'px');
      span.style.setProperty('--ty', ty.toFixed(1) + 'px');
      span.style.setProperty('--rot', rot);
      span.style.animationDelay = (Math.random() * 80) + 'ms';

      burst.appendChild(span);
    }

    window.setTimeout(() => burst.remove(), 1100);
  }

  logoLink.addEventListener('click', (e) => {
    // Let the anchor still jump to #top, we just layer the fun on top.
    if(shaking) return;
    shaking = true;

    logoLink.classList.add('hint-dismissed');
    logoImg.classList.remove('is-shaking');
    void logoImg.offsetWidth; // restart animation if clicked again quickly
    logoImg.classList.add('is-shaking');
    spawnEmojis();

    window.setTimeout(() => {
      logoImg.classList.remove('is-shaking');
      shaking = false;
    }, 620);
  });
})();

// ---------- Typewriter effect for screen titles (hero h1 + section h2) ----------
// Types out the heading's own markup (so inline tags like <em> stay intact)
// character-by-character with a blinking cursor at the caret. Runs once per
// element the first time it's on screen, then leaves the finished text in
// place. Skipped entirely for prefers-reduced-motion.
(function(){
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const titles = Array.from(document.querySelectorAll('main h1, main h2'));
  if(!titles.length || prefersReducedMotion) return;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function typeWriter(root, speed){
    // Measure the real, already-laid-out heading first (so we know exactly
    // which words land on which line), then clear and type line-by-line —
    // see twComputeLines()/twTypeLines() above for why.
    const originalHTML = root.innerHTML;
    const lines = twComputeLines(root);
    root.innerHTML = '';
    root.classList.add('tw-typing');
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    await twTypeLines(root, lines, speed, cursor, () => true, sleep);
    root.innerHTML = originalHTML; // back to the real markup: stays responsive on resize
    root.classList.remove('tw-typing');
  }

  const heroTitle = document.querySelector('.hero h1');
  const sectionTitles = titles.filter(el => el !== heroTitle);

  // Hero titles are typed by the hero slider itself (every slide, each time it
  // becomes active) — see typeHeroTitle() in the hero slider block below.

  // Every other section title: type out once it scrolls into view.
  const titleObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        typeWriter(entry.target, 48);
        titleObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  sectionTitles.forEach(el => titleObs.observe(el));
})();

// ---- Worker Videos: one or more standalone cards, plus any horizontal,
// swipe-between-them groups. There can be several `.video-stack` containers
// on the page (e.g. one lone video here, a swipeable pair there) — reveal,
// "has a real file yet" swap, and the play/pause + ambient-pause behaviour
// apply to every video card on the page; the swipe/drag/dots wiring below
// only kicks in for a given stack when it actually holds more than one card.
(function(){
  const allStacks = Array.from(document.querySelectorAll('.video-stack'));
  if (!allStacks.length) return;
  const videoCards = allStacks.flatMap(s => Array.from(s.querySelectorAll('.video-card')));
  if (!videoCards.length) return;

  // Staggered reveal on scroll (same pattern as the gallery grid).
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      setTimeout(() => el.classList.add('in'), idx * 120);
      revealObs.unobserve(el);
    });
  }, { threshold: 0.15 });
  videoCards.forEach(el => revealObs.observe(el));

  // Each card starts in an "empty" state (placeholder overlay). Once a real
  // .mp4 file is uploaded to assets/video/ with the matching filename, the
  // <video> tag will load metadata successfully and we swap to "has-video".
  videoCards.forEach(card => {
    const video = card.querySelector('.video-card-media');
    if (!video) return;
    video.addEventListener('loadedmetadata', () => card.classList.add('has-video'));
    video.addEventListener('error', () => card.classList.remove('has-video'));
  });

  // Each video plays independently: the centre button toggles play/pause,
  // and the video pauses itself again once it reaches the end. While any
  // video is actually playing we tell the ambient background animations
  // (WebGL pipe-rack scene + 2 canvas layers, all running continuously
  // behind the page) to pause — decoding video alongside those is what
  // was causing the stutter.
  let playingCount = 0;
  videoCards.forEach(card => {
    const video = card.querySelector('.video-card-media');
    const btn = card.querySelector('.video-playpause');
    if (!video || !btn) return;
    video.addEventListener('play', () => {
      card.classList.add('is-playing');
      playingCount++;
      if (playingCount === 1) document.dispatchEvent(new CustomEvent('mijdaf:video-play'));
    });
    const onStop = () => {
      if (!card.classList.contains('is-playing')) return;
      card.classList.remove('is-playing');
      playingCount = Math.max(0, playingCount - 1);
      if (playingCount === 0) document.dispatchEvent(new CustomEvent('mijdaf:video-pause'));
    };
    video.addEventListener('pause', onStop);
    video.addEventListener('ended', onStop);
    if (!video.paused) { card.classList.add('is-playing'); playingCount++; }
    btn.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
  });

  // Wire up swipe/drag/dots per stack — only meaningful for a stack that
  // actually has more than one video in it.
  allStacks.forEach(setupCarousel);

  function setupCarousel(stack){
  const cards = Array.from(stack.querySelectorAll('.video-card'));
  if (cards.length < 2) return; // just one video here — nothing to swipe between
  const dotsWrap = stack.parentElement ? stack.parentElement.querySelector('.video-stack-dots') : null;

  // Swipe/scroll carousel: native horizontal scroll-snap drives the swipe,
  // this just builds the pagination dots and keeps them (and clicks on
  // them) in sync with whichever video is currently centred.
  if (dotsWrap) {
    const dots = cards.map((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `فيديو ${i + 1}`);
      dot.addEventListener('click', () => {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      dotsWrap.appendChild(dot);
      return dot;
    });
    dots[0].classList.add('is-active');

    const setActive = (activeCard) => {
      const idx = cards.indexOf(activeCard);
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    };

    const centerObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) setActive(entry.target);
      });
    }, { root: stack, threshold: [0, 0.6, 1] });
    cards.forEach(card => centerObs.observe(card));
  }

  // A plain overflow-x container ignores mouse drags — a trackpad/mouse user
  // gets no swipe at all. Add manual drag-to-scroll for mouse/pen input;
  // CSS scroll-snap still handles settling on the nearest video afterwards.
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  stack.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // let native touch-scroll handle this
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartScrollLeft = stack.scrollLeft;
    stack.classList.add('is-dragging');
  });
  stack.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 4) dragMoved = true;
    stack.scrollLeft = dragStartScrollLeft - dx;
  });
  function endDrag(){
    if (!dragging) return;
    dragging = false;
    stack.classList.remove('is-dragging');
    if (!dragMoved) return;
    // Manually dragged scrollLeft doesn't always trigger native scroll-snap,
    // so settle on whichever video is now closest to centred.
    const width = stack.clientWidth || 1;
    const idx = Math.round(stack.scrollLeft / width);
    const clamped = Math.max(0, Math.min(cards.length - 1, idx));
    cards[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);
  stack.addEventListener('pointerleave', endDrag);

  // Touch swipe: manually writing to `scrollLeft` (like the mouse-drag code
  // above) turned out to be the real problem, not a leftover — this page is
  // RTL (dir="rtl" on <html>), and `scrollLeft` numbers are notoriously
  // inconsistent across browsers in RTL (some count from 0 going negative,
  // older WebKit counts the opposite way). Our manual writes kept fighting
  // the browser's own (correct) RTL scrolling, which is what made it look
  // like the slide "snapped back". Fix: don't touch scrollLeft ourselves at
  // all on touch — let native touch-scrolling move the slide exactly like it
  // already knows how to. We only step in once the finger lifts: measure the
  // raw on-screen distance it travelled and, if that's a real swipe, command
  // the browser to land on the next/previous card with scrollIntoView()
  // (which is direction-safe since the browser computes it, not us). That
  // overrides native mandatory-snap's overly large "must cross half the
  // slide" threshold with a much smaller, natural one.
  function currentCardIndex(){
    const center = stack.getBoundingClientRect().left + stack.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartIndex = 0;
  let touchTracking = false;

  stack.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartIndex = currentCardIndex();
    touchTracking = true;
  }, { passive: true });

  stack.addEventListener('touchend', (e) => {
    if (!touchTracking) return;
    touchTracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < Math.abs(dy)) return; // a vertical gesture — leave it to the page scroll

    const width = stack.clientWidth || 1;
    const SWIPE_THRESHOLD = Math.min(60, width * 0.12); // a normal, modest swipe — not half the slide
    let idx = touchStartIndex;
    // RTL layout: the next video sits to the left, so a leftward drag (dx < 0) advances.
    if (dx < -SWIPE_THRESHOLD) idx = Math.min(cards.length - 1, touchStartIndex + 1);
    else if (dx > SWIPE_THRESHOLD) idx = Math.max(0, touchStartIndex - 1);

    if (idx !== touchStartIndex) dragMoved = true; // suppress the trailing click below
    cards[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, { passive: true });

  stack.addEventListener('touchcancel', () => { touchTracking = false; }, { passive: true });

  // After an actual drag/swipe, swallow the trailing click so it doesn't
  // accidentally toggle a video's play/pause button.
  stack.addEventListener('click', (e) => {
    if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; }
  }, true);
  } // end setupCarousel
})();

// ---------- Hero video slider ----------
// Four video slides (brand film + three site videos) with a caption and one
// CTA each. Auto-advances when a video ends (or after FALLBACK_MS if a video
// can't play, e.g. autoplay blocked / data saver). Only the first video is
// fetched up front; the next one is preloaded once the current one starts.
// Controls: progress segments (click to jump), pause/play, prev/next, keyboard
// arrows and horizontal swipe. Pauses when off-screen or in a background tab.
(function(){
  const hero = document.getElementById('heroSlider');
  if (!hero) return;
  const slides   = Array.from(hero.querySelectorAll('.hero-slide'));
  const captions = Array.from(hero.querySelectorAll('.hero-caption'));
  const segs     = Array.from(hero.querySelectorAll('.hero-seg'));
  const pauseBtn = hero.querySelector('.hero-pause');
  const prevBtn  = hero.querySelector('.hero-prev');
  const nextBtn  = hero.querySelector('.hero-next');
  const vids     = slides.map(s => s.querySelector('video'));
  const N = slides.length;
  if (N < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FALLBACK_MS = 8000;      // per-slide time when the video can't drive the clock
  const PENDING_MS  = 5000;      // give a slow video this long to start before using the timer

  let idx = 0;
  let autoplay = !reduceMotion;  // user (or reduced-motion) pause
  let inView = true;
  let mode = 'pending';          // 'pending' | 'video' | 'timer'
  let t0 = 0, raf = 0, started = false;

  // ---- helpers ----
  const running = () => autoplay && inView && !document.hidden && started;
  function setBar(k, p){ segs[k] && segs[k].style.setProperty('--p', String(p)); }

  function prepare(i){
    const v = vids[i];
    if (!v || v.dataset.ready) return;
    v.dataset.ready = '1';
    if (v.dataset.poster) v.poster = v.dataset.poster;
    const src = v.querySelector('source[data-src]');
    if (src){ src.src = src.dataset.src; }
    v.preload = 'auto';
    v.load();
  }

  function playCurrent(){
    const v = vids[idx];
    if (!v) { mode = 'timer'; t0 = performance.now(); return; }
    mode = 'pending'; t0 = performance.now();
    const p = v.play();
    if (p && p.then){
      p.then(() => { if (v === vids[idx] && mode === 'pending') mode = 'video'; })
       .catch(() => { if (v === vids[idx]) { mode = 'timer'; t0 = performance.now(); } });
    } else { mode = 'video'; }
  }

  function tick(now){
    raf = 0;
    if (!running()) return;
    let p = 0;
    const v = vids[idx];
    if (mode === 'video' && v && v.duration > 0){
      p = v.ended ? 1 : v.currentTime / v.duration;
    } else if (mode === 'timer'){
      p = (now - t0) / FALLBACK_MS;
    } else if (now - t0 > PENDING_MS){
      mode = 'timer'; t0 = now;
    }
    setBar(idx, Math.min(p, 1));
    if (p >= 1){ go(idx + 1); return; }
    raf = requestAnimationFrame(tick);
  }
  function kick(){ if (!raf && running()) raf = requestAnimationFrame(tick); }

  // ---- typewriter for the hero titles (same effect as the section titles) ----
  // Types the active slide's title character-by-character with the blinking
  // cursor. Its height is reserved up front so the text below doesn't jump,
  // and starting a new one (or switching language) safely cancels the old one.
  const heroTitles = captions.map(c => c.querySelector('h1, .hero-title'));
  const TW_SPEED = 48;
  let twToken = 0;
  const twSleep = (ms) => new Promise(r => setTimeout(r, ms));

  function twFinish(el){                       // put a half-typed title back to full text
    if (!el || el._twFull == null) return;
    if (el.querySelector('.tw-cursor')) el.innerHTML = el._twFull;
    el._twFull = null; el.style.minHeight = '';
  }

  async function typeHeroTitle(i){
    const el = heroTitles[i];
    if (!el || reduceMotion) return;
    const token = ++twToken;                   // cancels any earlier run
    heroTitles.forEach(twFinish);

    const full = el.innerHTML;
    const h = el.offsetHeight;
    if (h) el.style.minHeight = h + 'px';
    el._twFull = full;

    // Measure the real, already-laid-out title first (so we know exactly
    // which words land on which line), then clear and type line-by-line —
    // see twComputeLines()/twTypeLines() above for why.
    const lines = twComputeLines(el);
    el.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    el.appendChild(cursor);
    const alive = () => token === twToken && el.contains(cursor);

    await twSleep(300);                        // let the caption fade in first
    if (!alive()) { if (!el.contains(cursor)) { el._twFull = null; el.style.minHeight = ''; } return; }

    const done = await twTypeLines(el, lines, TW_SPEED, cursor, alive, twSleep);
    if (done && alive()){
      el.innerHTML = full; el._twFull = null; el.style.minHeight = ''; // back to the real markup: stays responsive on resize
    } else if (!el.contains(cursor)){          // content was replaced (e.g. language switch)
      el._twFull = null; el.style.minHeight = '';
    }
  }

  // ---- navigation ----
  function go(n, fromUser){
    n = (n + N) % N;
    const leaving = idx;
    if (leaving !== n && vids[leaving]) vids[leaving].pause();
    idx = n;

    slides.forEach((s, k) => s.classList.toggle('is-active', k === n));
    captions.forEach((c, k) => c.classList.toggle('is-active', k === n));
    segs.forEach((b, k) => {
      b.classList.toggle('is-active', k === n);
      b.setAttribute('aria-current', k === n ? 'true' : 'false');
      setBar(k, k < n ? 1 : 0);
    });
    hero.dataset.tone = slides[n].dataset.tone || 'brand';
    if (leaving !== n){ hero.classList.add('is-slid'); typeHeroTitle(n); }

    prepare(n);
    prepare((n + 1) % N);

    const v = vids[n];
    if (v){ v.loop = false; try { v.currentTime = 0; } catch(e){} }
    if (running() || (autoplay && started)) { playCurrent(); }
    else { mode = 'pending'; }
    kick();
  }

  // ---- video events ----
  vids.forEach((v, i) => {
    if (!v) return;
    v.loop = false;
    v.addEventListener('ended', () => { if (i === idx && running()) go(idx + 1); });
  });

  // ---- controls ----
  segs.forEach((b, k) => b.addEventListener('click', () => go(k, true)));
  prevBtn && prevBtn.addEventListener('click', () => go(idx - 1, true));
  nextBtn && nextBtn.addEventListener('click', () => go(idx + 1, true));

  // click / tap on the video area (anywhere in the hero that isn't a link,
  // button or control) moves to the next slide
  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label, .hero-controls')) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;   // user was selecting text
    go(idx + 1, true);
  });

  function setAutoplay(on){
    autoplay = on;
    pauseBtn && pauseBtn.classList.toggle('is-paused', !on);
    pauseBtn && pauseBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
    const v = vids[idx];
    if (!on){
      if (v) v.pause();
    } else if (started){
      // resume from where the current video is (or restart the timer)
      if (v && v.duration > 0 && !v.ended){
        const pp = v.play();
        if (pp && pp.catch) pp.catch(() => { mode = 'timer'; t0 = performance.now(); });
        mode = 'video';
      } else { playCurrent(); }
      kick();
    }
  }
  pauseBtn && pauseBtn.addEventListener('click', () => setAutoplay(!autoplay));

  // keyboard: arrows move between slides while focus is inside the hero
  hero.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const rtl = document.documentElement.getAttribute('dir') === 'rtl';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    go(idx + (e.key === fwd ? 1 : -1), true);
  });

  // swipe (horizontal) — direction follows reading direction
  let sx = 0, sy = 0, tracking = false;
  hero.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('.hero-controls, a, button')) return;
    tracking = true; sx = e.clientX; sy = e.clientY;
  });
  hero.addEventListener('pointerup', (e) => {
    if (!tracking) return; tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const rtl = document.documentElement.getAttribute('dir') === 'rtl';
    const forward = rtl ? dx > 0 : dx < 0;
    go(idx + (forward ? 1 : -1), true);
  });
  hero.addEventListener('pointercancel', () => { tracking = false; });

  // ---- pause when off-screen / tab hidden ----
  function syncVisibility(){
    const v = vids[idx];
    if (running()){
      if (v && v.paused && !v.ended && mode === 'video'){ const pp = v.play(); if (pp && pp.catch) pp.catch(() => {}); }
      if (mode === 'timer') t0 = performance.now() - (parseFloat(segs[idx].style.getPropertyValue('--p')) || 0) * FALLBACK_MS;
      kick();
    } else if (v && !v.paused){ v.pause(); }
  }
  if ('IntersectionObserver' in window){
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      syncVisibility();
    }, { threshold: 0.2 }).observe(hero);
  }
  document.addEventListener('visibilitychange', syncVisibility);

  // ---- control labels follow the page language ----
  const LABELS = {
    ar: { hero: 'مي أرابيا', group: 'التحكم في الشرائح', pause: 'إيقاف التبديل التلقائي', prev: 'السابق', next: 'التالي' },
    en: { hero: 'Mi Arabia', group: 'Slide controls', pause: 'Pause automatic slides', prev: 'Previous slide', next: 'Next slide' }
  };
  function applyLabels(){
    const L = LABELS[document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar'];
    hero.setAttribute('aria-label', L.hero);
    const grp = hero.querySelector('.hero-controls'); grp && grp.setAttribute('aria-label', L.group);
    pauseBtn && pauseBtn.setAttribute('aria-label', L.pause);
    prevBtn && prevBtn.setAttribute('aria-label', L.prev);
    nextBtn && nextBtn.setAttribute('aria-label', L.next);
  }
  new MutationObserver(applyLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  applyLabels();

  // ---- start: wait for the splash to leave so slide 1 plays from its beginning ----
  function start(){
    if (started) return;
    started = true;
    setAutoplay(autoplay);       // syncs button state
    prepare(1);
    const v = vids[0];
    if (v){ v.loop = false; try { v.currentTime = 0; } catch(e){} }
    if (autoplay) playCurrent();
    kick();
    typeHeroTitle(0);
  }
  if (reduceMotion){ autoplay = false; pauseBtn && pauseBtn.classList.add('is-paused'); pauseBtn && pauseBtn.setAttribute('aria-pressed', 'true'); }
  const splash = document.getElementById('splash');
  if (splash){
    const mo = new MutationObserver(() => { if (!document.getElementById('splash')){ mo.disconnect(); start(); } });
    mo.observe(document.body, { childList: true });
    setTimeout(start, 6500);     // safety net
  } else { start(); }
})();

// ---------- ticker: seamless, gap-free marquee ----------
// The track holds one set of items in the HTML. We clone that set enough
// times to fill (at least) the full screen width in each half of the track,
// then animate by exactly -50%, so the loop restarts with no empty space.
(function(){
  const track = document.getElementById('tickerTrack');
  if(!track) return;
  const ticker = track.parentElement;
  const base = Array.from(track.children);
  if(!base.length) return;

  const SPEED = 60; // px per second (keeps the same pace on any screen size)
  let lastKey = '';

  function build(){
    const setW0 = base.reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    const key = Math.round(setW0) + '|' + ticker.clientWidth;
    if(key === lastKey && track.classList.contains('is-ready')) return;   // nothing changed: don't restart the animation
    track.querySelectorAll('[data-ticker-clone]').forEach(n => n.remove());
    track.classList.remove('is-ready');

    const setW = base.reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    if(!setW) return;

    const viewW = ticker.clientWidth;
    const copies = Math.max(1, Math.ceil(viewW / setW));   // sets per half
    const frag = document.createDocumentFragment();
    for(let i = 1; i < copies * 2; i++){
      base.forEach(el => {
        const c = el.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('data-ticker-clone', '');
        frag.appendChild(c);
      });
    }
    track.appendChild(frag);

    track.style.setProperty('--ticker-duration', ((copies * setW) / SPEED).toFixed(2) + 's');
    track.classList.add('is-ready');
    lastKey = Math.round(setW) + '|' + viewW;
  }

  let t;
  function schedule(){ clearTimeout(t); t = setTimeout(build, 120); }

  build();
  window.addEventListener('resize', schedule);
  window.addEventListener('load', build);
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(build).catch(() => {}); }
  // text width changes when switching Arabic <-> English
  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
})();
