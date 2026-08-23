  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

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

  // Header scroll state
  const header = document.getElementById('siteHeader');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  // Mobile nav
  const navToggle = document.getElementById('navToggle');
  const primaryNav = document.getElementById('primaryNav');
  navToggle.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open);
  });
  primaryNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    primaryNav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', false);
  }));

  // Active nav link on scroll
  const sections = ['about','services','why','contact'].map(id => document.getElementById(id));
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
      { selector: '.spec-card',    max: 8,  lift: -6,  scale: 1.02 },
      { selector: '.service-card', max: 8,  lift: -8,  scale: 1.02 },
      { selector: '.why-item',     max: 7,  lift: -8,  scale: 1.015 }
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

  // Why-us cards: staggered 3D reveal + icon line-draw + number count-up
  const whyItems = document.querySelectorAll('.why-reveal');
  const whyObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      const delay = idx * 140;

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

        // big background number counts up
        const numEl = el.querySelector('.why-bignum');
        if(numEl){
          const target = parseInt(numEl.textContent, 10) || 0;
          const duration = 750;
          const startTime = performance.now();
          const tick = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            numEl.textContent = String(Math.round(eased * target)).padStart(2, '0');
            if(p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }, delay);

      whyObs.unobserve(el);
    });
  }, { threshold: 0.3 });
  whyItems.forEach(el => whyObs.observe(el));

  // Capability cards (about section): staggered reveal + icon line-draw
  const specItems = document.querySelectorAll('.spec-reveal');
  const specObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;
      const idx = parseInt(el.style.getPropertyValue('--i')) || 0;
      const delay = idx * 120;

      setTimeout(() => {
        el.classList.add('in');

        const path = el.querySelector('.spec-icon svg path');
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

      specObs.unobserve(el);
    });
  }, { threshold: 0.25 });
  specItems.forEach(el => specObs.observe(el));

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

  // Contact form (front-end only demo)
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    success.classList.add('show');
    form.querySelectorAll('input, textarea').forEach(el => el.value = '');
    success.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });

  // Quick action popups (Request a Quote / Inquiries) -> WhatsApp handoff
  (function(){
    const WHATSAPP_NUMBER = '201152932977'; // Mijdaf Arabia WhatsApp (country code + number, no leading 0/plus)
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

    // FAB toggle: opens/closes the small menu (Request a Quote / Inquiries)
    const qaFab = document.getElementById('qaFab');
    const qaMenu = document.getElementById('qaMenu');
    if (qaFab && qaMenu && quickActions) {
      const closeMenu = () => {
        quickActions.classList.remove('open');
        qaFab.setAttribute('aria-expanded', 'false');
      };
      const openMenu = () => {
        quickActions.classList.add('open');
        qaFab.setAttribute('aria-expanded', 'true');
      };
      qaFab.addEventListener('click', () => {
        quickActions.classList.contains('open') ? closeMenu() : openMenu();
      });
      // Close after picking an option, so the menu doesn't stay open behind the modal
      qaMenu.querySelectorAll('.qa-item').forEach(item => {
        item.addEventListener('click', closeMenu);
      });
      // Close on outside click / tap
      document.addEventListener('pointerdown', (e) => {
        if (!quickActions.contains(e.target)) closeMenu();
      });
      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });

      // One-time "peek": briefly reveal the menu on first visit so the user
      // notices it exists, then auto-collapse back to the small round FAB.
      // Runs once per browser session (sessionStorage), and is skipped for
      // users who prefer reduced motion.
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion && !sessionStorage.getItem('qaPeeked')) {
        sessionStorage.setItem('qaPeeked', '1');
        const peekTimer = setTimeout(() => {
          if (!quickActions.classList.contains('open')) openMenu();
          setTimeout(() => {
            if (quickActions.classList.contains('open')) closeMenu();
          }, 2600);
        }, 1400);
        // If the user interacts before the peek fires, don't force it open
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(evt => {
          document.addEventListener(evt, () => clearTimeout(peekTimer), { once: true, passive: true });
        });
      }
    }

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
