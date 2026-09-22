(function () {
  console.log('[mijdaf-dashboard] dashboard.js v4 loaded');
  const SOURCE_LABELS = {
    contact: 'نموذج التواصل',
    quick_request: 'طلب سريع',
    quick_inquiry: 'استفسار سريع',
  };
  const CHANNEL_LABELS = {
    whatsapp: '📱 واتساب',
    email: '📧 إيميل',
  };

  // ---------------- تسجيل الدخول / الحماية ----------------
  async function boot() {
    if (!window.mijdafData || !window.mijdafData.isReady()) {
      console.error('[mijdaf-dashboard] Supabase غير جاهز — تأكد من ملف supabase-config.js ومن اتصال cdn.jsdelivr.net');
      location.replace('index.html');
      return;
    }
    const session = await window.mijdafData.getSession();
    if (!session) {
      location.replace('index.html');
      return;
    }
    initDashboard();
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await window.mijdafData.logout();
    location.replace('index.html');
  });

  // ---------------- الداشبورد ----------------
  let unsubscribeRealtime = null;

  function initDashboard() {
    setupTabs();
    setupNotifications();
    setupMessages();
    setupImages();
    setupPartners();
    setupStats();
    setupSettings();
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = {
      messages: document.getElementById('tabMessages'),
      images: document.getElementById('tabImages'),
      partners: document.getElementById('tabPartners'),
      stats: document.getElementById('tabStats'),
      settings: document.getElementById('tabSettings'),
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
    // نبدأ بالإشعارات متوقفة دايمًا، والمستخدم هو اللي يفعّلها بالزرار
    notificationsEnabled = false;
    updateNotifyBtn(btn);

    btn.addEventListener('click', async () => {
      // لو شغالة، دوسة واحدة تكفي لإيقافها فورًا (مش محتاجين إذن المتصفح لإيقافها)
      if (notificationsEnabled) {
        notificationsEnabled = false;
        updateNotifyBtn(btn);
        return;
      }

      // لو مقفولة، نتأكد من إذن المتصفح الأول
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        notificationsEnabled = true;
      } else {
        // المستخدم رافض الإذن من إعدادات المتصفح نفسها؛ لازم يفعّله من هناك أولاً
        alert('الإشعارات محظورة من إعدادات المتصفح لهذا الموقع. يرجى تفعيلها من إعدادات الموقع في المتصفح (أيقونة القفل بجانب الرابط) أولاً.');
        notificationsEnabled = false;
      }
      updateNotifyBtn(btn);
    });
  }

  function updateNotifyBtn(btn) {
    btn.classList.toggle('is-on', notificationsEnabled);
    btn.textContent = notificationsEnabled ? '🔔 الإشعارات مفعّلة' : '🔕 تفعيل الإشعارات';
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
    bumpTitleBadge();
    if (!notificationsEnabled) return;
    playBeep();
    const title = 'رسالة جديدة من الموقع';
    const body = `${SOURCE_LABELS[row.source] || row.source} — ${row.name || row.phone || ''}`;
    new Notification(title, { body, icon: '../assets/icon-192.png' });
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
        <div class="message-card-date">${date}${row.channel ? ` • ${CHANNEL_LABELS[row.channel] || escapeHtml(row.channel)}` : ''}</div>
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
            ${row.status === 'new' ? '<button class="btn-ghost small" data-action="read">تحديد كمقروءة</button>' : ''}
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
        if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
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
        if (!confirm('هل تريد حذف هذه الصورة من المعرض؟')) return;
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
      errorEl.textContent = 'يرجى اختيار صورة من جهازك أو إدخال رابط صورة.';
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
      errorEl.textContent = 'حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.';
      errorEl.hidden = false;
      console.error(err);
    }
  }

  // ---------------- تاب شركاء النجاح ----------------
  let allPartners = [];

  function setupPartners() {
    document.getElementById('addPartnerBtn').addEventListener('click', () => openPartnerModal());
    document.getElementById('partnerModalClose').addEventListener('click', closePartnerModal);
    document.getElementById('partnerModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'partnerModalOverlay') closePartnerModal();
    });
    document.getElementById('partnerForm').addEventListener('submit', submitPartnerForm);
    loadPartners();
  }

  async function loadPartners() {
    allPartners = await window.mijdafData.listPartners();
    renderPartners();
  }

  function renderPartners() {
    const grid = document.getElementById('partnersGrid');
    const empty = document.getElementById('partnersEmpty');
    empty.hidden = allPartners.length > 0;
    grid.innerHTML = '';

    allPartners.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        ${p.logoUrl ? `<img src="${p.logoUrl}" alt="${escapeHtml(p.nameAr)}">` : `<div class="image-card-placeholder">${escapeHtml(p.nameAr)}</div>`}
        <div class="image-card-body">
          <div class="image-card-title">${escapeHtml(p.nameAr || 'بدون اسم')}</div>
          <div class="image-card-actions">
            <button class="link-danger" data-action="delete">حذف</button>
          </div>
        </div>`;
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm('هل تريد حذف هذا الشريك من القائمة؟')) return;
        await window.mijdafData.deletePartner(p.id, p.storagePath);
        allPartners = allPartners.filter((x) => x.id !== p.id);
        renderPartners();
      });
      grid.appendChild(card);
    });
  }

  function openPartnerModal() {
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerFormError').hidden = true;
    document.getElementById('partnerModalOverlay').classList.add('open');
  }
  function closePartnerModal() {
    document.getElementById('partnerModalOverlay').classList.remove('open');
  }

  async function submitPartnerForm(e) {
    e.preventDefault();
    const errorEl = document.getElementById('partnerFormError');
    errorEl.hidden = true;

    const nameAr = document.getElementById('prtNameAr').value.trim();
    const nameEn = document.getElementById('prtNameEn').value.trim();
    const file = document.getElementById('prtFile').files[0];
    const logoUrl = document.getElementById('prtLogoUrl').value.trim();

    if (!nameAr) {
      errorEl.textContent = 'يرجى كتابة اسم الشركة.';
      errorEl.hidden = false;
      return;
    }

    try {
      await window.mijdafData.uploadPartner(file, {
        nameAr,
        nameEn,
        logoUrl,
        sortOrder: allPartners.length,
      });
      closePartnerModal();
      await loadPartners();
    } catch (err) {
      errorEl.textContent = 'حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.';
      errorEl.hidden = false;
      console.error(err);
    }
  }

  // ---------------- تاب أرقام الشركة ----------------
  // بيقبل أرقام عربية (٠١٢) وإنجليزي (012) وفواصل الآلاف (1,250)، ويحوّلهم لرقم صحيح.
  function parseCount(raw) {
    const latin = String(raw || '')
      .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06F0))
      .replace(/[\s,\u066C\u060C]/g, '');
    if (latin === '') return 0;
    if (!/^\d{1,9}$/.test(latin)) return null;
    return parseInt(latin, 10);
  }

  function setupStats() {
    const form = document.getElementById('statsForm');
    const employeesInput = document.getElementById('setEmployees');
    const projectsInput = document.getElementById('setProjects');
    const errorEl = document.getElementById('statsError');
    const successEl = document.getElementById('statsSuccess');

    loadStats();

    async function loadStats() {
      try {
        const settings = await window.mijdafData.getSettings();
        employeesInput.value = settings.employeesCount || '';
        projectsInput.value = settings.projectsCount || '';
      } catch (err) {
        console.error('loadStats failed', err);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      successEl.hidden = true;

      const employeesCount = parseCount(employeesInput.value);
      const projectsCount = parseCount(projectsInput.value);

      if (employeesCount === null || projectsCount === null) {
        errorEl.textContent = 'اكتب أرقام صحيحة فقط (من غير حروف أو علامات، وبحد أقصى 9 خانات).';
        errorEl.hidden = false;
        return;
      }

      try {
        await window.mijdafData.updateCompanyStats({ employeesCount, projectsCount });
        employeesInput.value = employeesCount || '';
        projectsInput.value = projectsCount || '';
        successEl.hidden = false;
        setTimeout(() => { successEl.hidden = true; }, 2500);
      } catch (err) {
        console.error('updateCompanyStats failed', err);
        const missingColumns = err && (
          err.code === 'PGRST204' || err.code === '42703' ||
          /employees_count|projects_count/.test(err.message || '')
        );
        errorEl.textContent = missingColumns
          ? 'لازم تشغّل ملف add-company-stats.sql في Supabase الأول (SQL Editor > Run)، وبعدها احفظ تاني.'
          : 'حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.';
        errorEl.hidden = false;
      }
    });
  }

  // ---------------- تاب الإعدادات ----------------
  function setupSettings() {
    const form = document.getElementById('settingsForm');
    const whatsappInput = document.getElementById('setWhatsapp');
    const emailInput = document.getElementById('setEmail');
    const errorEl = document.getElementById('settingsError');
    const successEl = document.getElementById('settingsSuccess');

    loadSettings();

    async function loadSettings() {
      try {
        const settings = await window.mijdafData.getSettings();
        whatsappInput.value = settings.whatsappNumber || '';
        emailInput.value = settings.notifyEmail || '';
      } catch (err) {
        console.error('loadSettings failed', err);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      successEl.hidden = true;

      const whatsappNumber = whatsappInput.value.trim().replace(/[^0-9]/g, '');
      const notifyEmail = emailInput.value.trim();

      if (!whatsappNumber) {
        errorEl.textContent = 'اكتب رقم الواتساب بالأرقام فقط.';
        errorEl.hidden = false;
        return;
      }

      try {
        await window.mijdafData.updateSettings({ whatsappNumber, notifyEmail });
        whatsappInput.value = whatsappNumber;
        successEl.hidden = false;
        setTimeout(() => { successEl.hidden = true; }, 2500);
      } catch (err) {
        console.error('updateSettings failed', err);
        errorEl.textContent = 'حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.';
        errorEl.hidden = false;
      }
    });
  }

  // ---------------- أدوات ----------------
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  boot().catch((err) => {
    console.error('[mijdaf-dashboard] boot() failed:', err);
    location.replace('index.html');
  });
})();
