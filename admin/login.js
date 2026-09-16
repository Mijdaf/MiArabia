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

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try {
      await window.mijdafData.login(email, password);
      location.replace('dashboard.html');
    } catch (err) {
      loginError.textContent = 'بيانات الدخول غير صحيحة.';
      loginError.hidden = false;
    }
  });

  boot().catch((err) => {
    console.error('[mijdaf-login] boot() failed:', err);
  });
})();
