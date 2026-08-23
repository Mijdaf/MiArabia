  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

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

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObs.observe(el));

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

    // Lighter, glassy look once the hero (dark video) is scrolled past, so page content stays prominent
    const quickActions = document.getElementById('quickActions');
    const heroSection = document.querySelector('.hero');
    if (quickActions && heroSection) {
      const heroObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          quickActions.classList.toggle('past-hero', !entry.isIntersecting);
        });
      }, { threshold: 0, rootMargin: '0px 0px -15% 0px' });
      heroObs.observe(heroSection);
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
