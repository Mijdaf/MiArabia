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

  // Mobile nav
  const navToggle = document.getElementById('navToggle');
  const navClose = document.getElementById('navClose');
  const navOverlay = document.getElementById('navOverlay');
  const primaryNav = document.getElementById('primaryNav');

  const setNavOpen = (open) => {
    primaryNav.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open);
    if(open){
      navOverlay.hidden = false;
      requestAnimationFrame(() => navOverlay.classList.add('open'));
      document.body.style.overflow = 'hidden';
    } else {
      navOverlay.classList.remove('open');
      document.body.style.overflow = '';
      window.setTimeout(() => { if(!primaryNav.classList.contains('open')) navOverlay.hidden = true; }, 350);
    }
  };

  navToggle.addEventListener('click', () => setNavOpen(!primaryNav.classList.contains('open')));
  navClose.addEventListener('click', () => setNavOpen(false));
  navOverlay.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && primaryNav.classList.contains('open')) setNavOpen(false);
  });
  primaryNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNavOpen(false)));

  // Active nav link on scroll
  const sections = ['about','services','gallery','why','contact'].map(id => document.getElementById(id));
  const navLinks = Array.from(primaryNav.querySelectorAll('a'));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const id = entry.target.id;
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#'+id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => s && spy.observe(s));

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
    if (window.matchMedia('(max-width:760px)').matches) return; // heroZoom itself is disabled on mobile

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = heroSection.getBoundingClientRect();
      const h = rect.height || 1;
      // progress: 0 at top of hero in view, 1 once fully scrolled past
      const progress = Math.min(Math.max(-rect.top / h, 0), 1);
      if (rect.bottom < 0 || rect.top > window.innerHeight) return; // off-screen, skip work
      heroBgWrap.style.transform = `translateY(${progress * 40}px) scale(${1 + progress * 0.03})`;
      heroContent.style.transform = `translateY(${progress * -18}px) rotateX(${progress * 5}deg) translateZ(0)`;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  })();

  // Why-us rows: staggered reveal + icon line-draw
  const whyItems = document.querySelectorAll('.why-reveal');
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
      }, delay);

      whyObs.unobserve(el);
    });
  }, { threshold: 0.3 });
  whyItems.forEach(el => whyObs.observe(el));

  // Haptic tap feedback on the "why" rows — Android/Chrome support the
  // Vibration API on touch taps (iOS Safari doesn't expose it; this is a
  // platform limitation, not a bug, so the tap still works fine there,
  // just silently without the buzz).
  if ('vibrate' in navigator) {
    document.querySelectorAll('.why-row').forEach(row => {
      row.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return; // mouse/pen taps stay silent
        navigator.vibrate(15);
      }, { passive: true });
    });
  }

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
      ar: 'مجداف العربية للمقاولات العامة — مقاولات عامة وخدمات صناعية',
      en: 'Mijdaf Arabia — General Contracting & Industrial Services'
    };
    const descriptions = {
      ar: 'مجداف العربية للمقاولات العامة — شركة سعودية متخصصة في أعمال الأنابيب واللحام والتصنيع والصيانة وخدمات القوى العاملة، وفق أعلى معايير السلامة والجودة.',
      en: 'Mijdaf Arabia for General Contracting — a Saudi company delivering piping, welding & fabrication, maintenance and manpower services to the highest safety and quality standards.'
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

    let msg = `طلب جديد من موقع مجداف العربية:\n\n*الاسم:* ${name}`;
    if (company) msg += `\n*الشركة:* ${company}`;
    msg += `\n*البريد الإلكتروني:* ${email}`;
    msg += `\n*الخدمة المطلوبة:* ${service}`;
    msg += `\n*رقم الجوال:* ${phone}`;
    if (phone2) msg += `\n*رقم بديل:* ${phone2}`;
    if (details) msg += `\n*تفاصيل المشروع:* ${details}`;

    const url = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

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

    function setupModal({ openBtnId, overlayId, formId, successId, buildMessage }){
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
        let msg = `طلب جديد من موقع مجداف العربية:\n\n*الاسم:* ${name}`;
        if (company) msg += `\n*الشركة:* ${company}`;
        msg += `\n*رقم الجوال:* ${phone}\n*الخدمة المطلوبة:* ${service}`;
        return msg;
      }
    });

    setupModal({
      openBtnId: 'openInquiryModal',
      overlayId: 'inquiryModalOverlay',
      formId: 'quickInquiryForm',
      successId: 'inquiryFormSuccess',
      buildMessage: (form) => {
        const message = form.querySelector('#qiMessage').value.trim();
        const phone = form.querySelector('#qiPhone').value.trim();
        return `استفسار جديد من موقع مجداف العربية:\n\n*الاستفسار:* ${message}\n*رقم التواصل:* ${phone}`;
      }
    });
  })();

  // Gallery: staggered bento reveal on scroll
  (function(){
    const galleryItems = document.querySelectorAll('.gallery-reveal');
    if (!galleryItems.length) return;
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
  })();

  // Gallery: click-to-expand lightbox
  (function(){
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
  })();
