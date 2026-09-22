(function () {
  console.log('[mijdaf-dashboard] dashboard.js v4 loaded');
  const SOURCE_LABELS = {
    contact: 'Contact form',
    quick_request: 'Quick request',
    quick_inquiry: 'Quick inquiry',
  };
  const CHANNEL_LABELS = {
    whatsapp: '📱 WhatsApp',
    email: '📧 Email',
  };

  // ---------------- Login / auth guard ----------------
  async function boot() {
    if (!window.mijdafData || !window.mijdafData.isReady()) {
      console.error('[mijdaf-dashboard] Supabase not ready — check supabase-config.js and the cdn.jsdelivr.net connection');
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

  // ---------------- Dashboard ----------------
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

  // ---------------- Browser notifications ----------------
  let notificationsEnabled = false;

  function setupNotifications() {
    const btn = document.getElementById('notifyBtn');
    if (!('Notification' in window)) {
      btn.hidden = true;
      return;
    }
    // notifications always start off; the user turns them on with the button
    notificationsEnabled = false;
    updateNotifyBtn(btn);

    btn.addEventListener('click', async () => {
      // if already on, one click is enough to turn it off instantly (no browser permission needed to turn off)
      if (notificationsEnabled) {
        notificationsEnabled = false;
        updateNotifyBtn(btn);
        return;
      }

      // if off, check the browser permission first
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        notificationsEnabled = true;
      } else {
        // the user denied permission at the browser level; they need to enable it from there first
        alert('Notifications are blocked in this site\'s browser settings. Please enable them from the site settings in your browser (the lock icon next to the address bar) first.');
        notificationsEnabled = false;
      }
      updateNotifyBtn(btn);
    });
  }

  function updateNotifyBtn(btn) {
    btn.classList.toggle('is-on', notificationsEnabled);
    btn.textContent = notificationsEnabled ? '🔔 Notifications on' : '🔕 Enable notifications';
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
    } catch (e) { /* some browsers need a user interaction first; fine if this fails */ }
  }

  function notifyNewMessage(row) {
    bumpTitleBadge();
    if (!notificationsEnabled) return;
    playBeep();
    const title = 'New message from the website';
    const body = `${SOURCE_LABELS[row.source] || row.source} — ${row.name || row.phone || ''}`;
    new Notification(title, { body, icon: '../assets/icon-192.png' });
  }

  let unreadTitleCount = 0;
  function bumpTitleBadge() {
    unreadTitleCount += 1;
    document.title = `(${unreadTitleCount}) Mijdaf Admin Dashboard`;
  }
  function resetTitleBadge() {
    unreadTitleCount = 0;
    document.title = 'Mijdaf Admin Dashboard';
  }

  // ---------------- Messages tab ----------------
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

      const date = new Date(row.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      card.innerHTML = `
        <div class="message-card-top">
          <span class="message-card-title">${escapeHtml(row.name || row.phone || 'No name')}</span>
          <span class="message-card-source">${SOURCE_LABELS[row.source] || row.source}</span>
        </div>
        <div class="message-card-date">${date}${row.channel ? ` • ${CHANNEL_LABELS[row.channel] || escapeHtml(row.channel)}` : ''}</div>
        <div class="message-card-body">
          <dl>
            ${row.company ? `<dt>Company</dt><dd>${escapeHtml(row.company)}</dd>` : ''}
            ${row.email ? `<dt>Email</dt><dd>${escapeHtml(row.email)}</dd>` : ''}
            ${row.phone ? `<dt>Phone</dt><dd>${escapeHtml(row.phone)}</dd>` : ''}
            ${row.phone2 ? `<dt>Alternate phone</dt><dd>${escapeHtml(row.phone2)}</dd>` : ''}
            ${row.service ? `<dt>Service</dt><dd>${escapeHtml(row.service)}</dd>` : ''}
          </dl>
          ${row.message ? `<p>${escapeHtml(row.message)}</p>` : ''}
          <div class="message-card-actions">
            ${row.status === 'new' ? '<button class="btn-ghost small" data-action="read">Mark as read</button>' : ''}
            <button class="link-danger" data-action="delete">Delete</button>
          </div>
        </div>`;

      card.addEventListener('click', (e) => {
        if (e.target.dataset.action) return; // buttons handle themselves
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
        if (!confirm('Delete this message?')) return;
        await window.mijdafData.deleteMessage(row.id);
        allMessages = allMessages.filter((m) => m.id !== row.id);
        renderMessages();
      });

      list.appendChild(card);
    });
  }

  // ---------------- Images tab ----------------
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

    const sizeLabels = { normal: 'Normal', wide: 'Wide', big: 'Big' };

    allImages.forEach((img) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <img src="${img.url}" alt="${escapeHtml(img.titleAr)}">
        <div class="image-card-body">
          <div class="image-card-title">${escapeHtml(img.titleAr || 'No title')}</div>
          <div class="image-card-meta">${sizeLabels[img.size] || img.size}</div>
          <div class="image-card-actions">
            <button class="link-danger" data-action="delete">Delete</button>
          </div>
        </div>`;
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm('Delete this image from the gallery?')) return;
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
      errorEl.textContent = 'Please choose an image from your device or enter an image URL.';
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
      errorEl.textContent = 'An error occurred while saving, please try again.';
      errorEl.hidden = false;
      console.error(err);
    }
  }

  // ---------------- Success partners tab ----------------
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
    const list = document.getElementById('partnersList');
    const empty = document.getElementById('partnersEmpty');
    empty.hidden = allPartners.length > 0;
    list.innerHTML = '';

    allPartners.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'partner-admin-row';
      row.innerHTML = `
        <span class="partner-admin-name">${escapeHtml(p.nameAr || 'No name')}</span>
        <button class="link-danger" data-action="delete" type="button">Delete</button>`;
      row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm('Delete this partner from the list?')) return;
        await window.mijdafData.deletePartner(p.id);
        allPartners = allPartners.filter((x) => x.id !== p.id);
        renderPartners();
      });
      list.appendChild(row);
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

    if (!nameAr) {
      errorEl.textContent = 'Please enter the company name.';
      errorEl.hidden = false;
      return;
    }

    try {
      await window.mijdafData.addPartner({ nameAr, nameEn, sortOrder: allPartners.length });
      closePartnerModal();
      await loadPartners();
    } catch (err) {
      errorEl.textContent = 'An error occurred while saving, please try again.';
      errorEl.hidden = false;
      console.error(err);
    }
  }

  // ---------------- Company stats tab ----------------
  // Accepts Arabic-Indic digits (٠١٢), Latin digits (012), and thousands separators (1,250), converting them to an integer.
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
        errorEl.textContent = 'Enter valid numbers only (no letters or symbols, up to 9 digits).';
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
          ? 'You need to run add-company-stats.sql in Supabase first (SQL Editor > Run), then save again.'
          : 'An error occurred while saving, please try again.';
        errorEl.hidden = false;
      }
    });
  }

  // ---------------- Settings tab ----------------
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
        errorEl.textContent = 'Enter the WhatsApp number using digits only.';
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
        errorEl.textContent = 'An error occurred while saving, please try again.';
        errorEl.hidden = false;
      }
    });
  }

  // ---------------- Helpers ----------------
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
