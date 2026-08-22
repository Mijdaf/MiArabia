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
