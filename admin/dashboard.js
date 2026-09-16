(function () {
  console.log('[mijdaf-dashboard] dashboard.js v3 loaded');
  const SOURCE_LABELS = {
    contact: 'فورم التواصل',
    quick_request: 'طلب سريع',
    quick_inquiry: 'استفسار سريع',
  };

  const screens = {
    login: document.getElementById('screenLogin'),
    dashboard: document.getElementById('screenDashboard'),
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
  }

  // ---------------- إعدادات / تسجيل الدخول ----------------
  async function boot() {
    if (!window.mijdafData || !window.mijdafData.isReady()) {
      console.error('[mijdaf-dashboard] Supabase غير جاهز — تأكد من ملف supabase-config.js ومن اتصال cdn.jsdelivr.net');
      showScreen('login');
      return;
    }
    const session = await window.mijdafData.getSession();
    if (session) {
      showScreen('dashboard');
      initDashboard();
    } else {
      showScreen('login');
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
      showScreen('dashboard');
      initDashboard();
    } catch (err) {
      loginError.textContent = 'بيانات الدخول غير صحيحة.';
      loginError.hidden = false;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await window.mijdafData.logout();
    location.reload();
  });

  // ---------------- الداشبورد ----------------
  let dashboardStarted = false;
  let unsubscribeRealtime = null;

  function initDashboard() {
    if (dashboardStarted) return;
    dashboardStarted = true;

    setupTabs();
    setupNotifications();
    setupMessages();
    setupImages();
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = {
      messages: document.getElementById('tabMessages'),
      images: document.getElementById('tabImages'),
    };
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        Object.entries(panels).forEach(([key, panel]) => {
          panel.classList.toggle('is-active', key === tab.dataset.tab);
        });
      });
    });
  }

  // ---------------- إشعارات المتصفح ----------------
  let notificationsEnabled = false;

  function setupNotifications() {
    const btn = document.getElementById('notifyBtn');
    if (!('Notification' in window)) {
      btn.hidden = true;
      return;
    }
    notificationsEnabled = Notification.permission === 'granted';
    updateNotifyBtn(btn);

    btn.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      notificationsEnabled = permission === 'granted';
      updateNotifyBtn(btn);
    });
  }

  function updateNotifyBtn(btn) {
    btn.textContent = notificationsEnabled ? '🔔 الإشعارات مفعّلة' : '🔔 تفعيل الإشعارات';
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* بعض المتصفحات محتاجة تفاعل مستخدم أولاً، مش مشكلة لو فشل */ }
  }

  function notifyNewMessage(row) {
    playBeep();
    if (notificationsEnabled) {
      const title = 'رسالة جديدة من الموقع';
      const body = `${SOURCE_LABELS[row.source] || row.source} — ${row.name || row.phone || ''}`;
      new Notification(title, { body, icon: '../assets/icon-192.png' });
    }
    bumpTitleBadge();
  }

  let unreadTitleCount = 0;
  function bumpTitleBadge() {
    unreadTitleCount += 1;
    document.title = `(${unreadTitleCount}) لوحة تحكم مي أرابيا`;
  }
  function resetTitleBadge() {
    unreadTitleCount = 0;
    document.title = 'لوحة تحكم مي أرابيا';
  }

  // ---------------- تاب الرسايل ----------------
  let allMessages = [];

  function setupMessages() {
    document.getElementById('refreshMessagesBtn').addEventListener('click', loadMessages);
    loadMessages();

    unsubscribeRealtime = window.mijdafData.subscribeToNewMessages((row) => {
      allMessages.unshift(row);
      renderMessages();
      notifyNewMessage(row);
    });

    window.addEventListener('beforeunload', () => {
      if (unsubscribeRealtime) unsubscribeRealtime();
    });
  }

  async function loadMessages() {
    allMessages = await window.mijdafData.listMessages();
    renderMessages();
  }

  function renderMessages() {
    const list = document.getElementById('messagesList');
    const empty = document.getElementById('messagesEmpty');
    const badge = document.getElementById('unreadBadge');

    const unreadCount = allMessages.filter((m) => m.status === 'new').length;
    badge.hidden = unreadCount === 0;
    badge.textContent = String(unreadCount);
    if (unreadCount === 0) resetTitleBadge();

    empty.hidden = allMessages.length > 0;
    list.innerHTML = '';

    allMessages.forEach((row) => {
      const card = document.createElement('div');
      card.className = `message-card${row.status === 'new' ? ' is-new' : ''}`;

      const date = new Date(row.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

      card.innerHTML = `
        <div class="message-card-top">
          <span class="message-card-title">${escapeHtml(row.name || row.phone || 'بدون اسم')}</span>
          <span class="message-card-source">${SOURCE_LABELS[row.source] || row.source}</span>
        </div>
        <div class="message-card-date">${date}</div>
        <div class="message-card-body">
          <dl>
            ${row.company ? `<dt>الشركة</dt><dd>${escapeHtml(row.company)}</dd>` : ''}
            ${row.email ? `<dt>البريد</dt><dd>${escapeHtml(row.email)}</dd>` : ''}
            ${row.phone ? `<dt>الجوال</dt><dd>${escapeHtml(row.phone)}</dd>` : ''}
            ${row.phone2 ? `<dt>رقم بديل</dt><dd>${escapeHtml(row.phone2)}</dd>` : ''}
            ${row.service ? `<dt>الخدمة</dt><dd>${escapeHtml(row.service)}</dd>` : ''}
          </dl>
          ${row.message ? `<p>${escapeHtml(row.message)}</p>` : ''}
          <div class="message-card-actions">
            ${row.status === 'new' ? '<button class="btn-ghost small" data-action="read">تعليم كمقروء</button>' : ''}
            <button class="link-danger" data-action="delete">حذف</button>
          </div>
        </div>`;

      card.addEventListener('click', (e) => {
        if (e.target.dataset.action) return; // الأزرار تتعامل لوحدها
        card.classList.toggle('is-open');
      });

      card.querySelector('[data-action="read"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.mijdafData.markMessageRead(row.id);
        row.status = 'read';
        renderMessages();
      });

      card.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('حذف الرسالة دي؟')) return;
        await window.mijdafData.deleteMessage(row.id);
        allMessages = allMessages.filter((m) => m.id !== row.id);
        renderMessages();
      });

      list.appendChild(card);
    });
  }

  // ---------------- تاب الصور ----------------
  let allImages = [];

  function setupImages() {
    document.getElementById('addImageBtn').addEventListener('click', () => openImageModal());
    document.getElementById('imageModalClose').addEventListener('click', closeImageModal);
    document.getElementById('imageModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'imageModalOverlay') closeImageModal();
    });
    document.getElementById('imageForm').addEventListener('submit', submitImageForm);
    loadImages();
  }

  async function loadImages() {
    allImages = await window.mijdafData.listImages();
    renderImages();
  }

  function renderImages() {
    const grid = document.getElementById('imagesGrid');
    const empty = document.getElementById('imagesEmpty');
    empty.hidden = allImages.length > 0;
    grid.innerHTML = '';

    const sizeLabels = { normal: 'عادي', wide: 'عريض', big: 'كبير' };

    allImages.forEach((img) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <img src="${img.url}" alt="${escapeHtml(img.titleAr)}">
        <div class="image-card-body">
          <div class="image-card-title">${escapeHtml(img.titleAr || 'بدون عنوان')}</div>
          <div class="image-card-meta">${sizeLabels[img.size] || img.size}</div>
          <div class="image-card-actions">
            <button class="link-danger" data-action="delete">حذف</button>
          </div>
        </div>`;
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm('حذف الصورة دي من المعرض؟')) return;
        await window.mijdafData.deleteImage(img.id, img.storagePath);
        allImages = allImages.filter((i) => i.id !== img.id);
        renderImages();
      });
      grid.appendChild(card);
    });
  }

  function openImageModal() {
    document.getElementById('imageForm').reset();
    document.getElementById('imageFormError').hidden = true;
    document.getElementById('imageModalOverlay').classList.add('open');
  }
  function closeImageModal() {
    document.getElementById('imageModalOverlay').classList.remove('open');
  }

  async function submitImageForm(e) {
    e.preventDefault();
    const errorEl = document.getElementById('imageFormError');
    errorEl.hidden = true;

    const file = document.getElementById('imgFile').files[0];
    const url = document.getElementById('imgUrl').value.trim();
    const meta = {
      titleAr: document.getElementById('imgTitleAr').value.trim(),
      titleEn: document.getElementById('imgTitleEn').value.trim(),
      textAr: document.getElementById('imgTextAr').value.trim(),
      textEn: document.getElementById('imgTextEn').value.trim(),
      size: document.getElementById('imgSize').value,
      sortOrder: allImages.length,
    };

    if (!file && !url) {
      errorEl.textContent = 'اختار صورة من جهازك أو حط رابط صورة.';
      errorEl.hidden = false;
      return;
    }

    try {
      if (file) {
        await window.mijdafData.uploadImage(file, meta);
      } else {
        await window.mijdafData.addImageByUrl(url, meta);
      }
      closeImageModal();
      await loadImages();
    } catch (err) {
      errorEl.textContent = 'حصل خطأ أثناء الحفظ، جرب تاني.';
      errorEl.hidden = false;
      console.error(err);
    }
  }

  // ---------------- أدوات ----------------
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  boot().catch((err) => {
    console.error('[mijdaf-dashboard] boot() failed:', err);
    showScreen('login');
  });
})();
