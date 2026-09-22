(function () {
  console.log('[mijdaf-login] login.js v4 loaded');

  async function boot() {
    if (!window.mijdafData || !window.mijdafData.isReady()) {
      console.error('[mijdaf-login] Supabase not ready — check supabase-config.js and the cdn.jsdelivr.net connection');
      return;
    }
    const session = await window.mijdafData.getSession();
    if (session) {
      location.replace('dashboard.html');
    }
  }

  // ---------------- CAPTCHA (reCAPTCHA) ----------------
  const CAPTCHA_PLACEHOLDER = 'PASTE_SITE_KEY_HERE';

  function captchaConfigured() {
    const el = document.querySelector('.g-recaptcha');
    return Boolean(el && el.dataset.sitekey && el.dataset.sitekey !== CAPTCHA_PLACEHOLDER);
  }

  function captchaPassed() {
    if (!captchaConfigured()) return true; // no key set yet, leave it disabled
    if (typeof grecaptcha === 'undefined') return false; // script hasn't loaded yet
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
      loginError.textContent = 'Please complete the captcha by checking "I\'m not a robot" before logging in.';
      loginError.hidden = false;
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await window.mijdafData.login(email, password);
      location.replace('dashboard.html');
    } catch (err) {
      loginError.textContent = 'Incorrect login details.';
      loginError.hidden = false;
      resetCaptcha();
    }
  });

  boot().catch((err) => {
    console.error('[mijdaf-login] boot() failed:', err);
  });
})();
