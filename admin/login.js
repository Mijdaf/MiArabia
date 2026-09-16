(function () {
  console.log('[mijdaf-login] login.js v4 loaded');

  async function boot() {
    if (!window.mijdafData || !window.mijdafData.isReady()) {
      console.error('[mijdaf-login] Supabase غير جاهز — تأكد من ملف supabase-config.js ومن اتصال cdn.jsdelivr.net');
      return;
    }
    const session = await window.mijdafData.getSession();
    if (session) {
      location.replace('dashboard.html');
    }
  }

  // ---------------- كابتشا (reCAPTCHA) ----------------
  const CAPTCHA_PLACEHOLDER = 'PASTE_SITE_KEY_HERE';

  function captchaConfigured() {
    const el = document.querySelector('.g-recaptcha');
    return Boolean(el && el.dataset.sitekey && el.dataset.sitekey !== CAPTCHA_PLACEHOLDER);
  }

  function captchaPassed() {
    if (!captchaConfigured()) return true; // لسه ملهاش مفتاح، سيبها مش مفعّلة
    if (typeof grecaptcha === 'undefined') return false; // السكريبت لسه محملش
    return Boolean(grecaptcha.getResponse().trim());
  }

  function resetCaptcha() {
    if (captchaConfigured() && typeof grecaptcha !== 'undefined') {
      grecaptcha.reset();
    }
  }

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    if (!captchaPassed()) {
      loginError.textContent = 'يرجى إكمال التحقق (كابتشا) بتحديد خانة "أنا لست برنامج روبوت" قبل تسجيل الدخول.';
      loginError.hidden = false;
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await window.mijdafData.login(email, password);
      location.replace('dashboard.html');
    } catch (err) {
      loginError.textContent = 'بيانات الدخول غير صحيحة.';
      loginError.hidden = false;
      resetCaptcha();
    }
  });

  boot().catch((err) => {
    console.error('[mijdaf-login] boot() failed:', err);
  });
})();
