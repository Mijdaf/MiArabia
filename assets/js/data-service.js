/**
 * mijdafData
 * ----------
 * طبقة وسيطة بين الموقع/الداشبورد وبين Supabase.
 * لو Supabase لسه مش متوصل (supabase-config.js فاضي)، كل الدوال ترجع نتيجة فاضية
 * بأمان من غير ما توقف الموقع أو تظهر error للزائر.
 */
(function () {
  const GALLERY_BUCKET = 'gallery';
  let client = null;

  function getClient() {
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured()) return null;
    if (!client && window.supabase) {
      client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return client;
  }

  function publicUrlFor(sb, path) {
    if (!path) return '';
    // صورة مرفوعة على Supabase Storage
    if (!/^https?:\/\//i.test(path)) {
      return sb.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    // أو رابط خارجي حطه الأدمن يدويًا
    return path;
  }

  window.mijdafData = {
    isReady() {
      return Boolean(getClient());
    },

    // ---------------- معرض الصور ----------------
    async listImages() {
      const sb = getClient();
      if (!sb) return [];
      const { data, error } = await sb
        .from('gallery_images')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) { console.error('listImages', error); return []; }
      return (data || []).map((row) => ({
        id: row.id,
        url: publicUrlFor(sb, row.storage_path),
        storagePath: row.storage_path,
        titleAr: row.title_ar || '',
        titleEn: row.title_en || '',
        textAr: row.text_ar || '',
        textEn: row.text_en || '',
        size: row.size_class || 'normal',
        sortOrder: row.sort_order || 0,
      }));
    },

    async uploadImage(file, meta) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase غير متصل');
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${Date.now()}-${safeName}`;
      const { error: uploadError } = await sb.storage.from(GALLERY_BUCKET).upload(path, file);
      if (uploadError) throw uploadError;
      const { data, error } = await sb
        .from('gallery_images')
        .insert({
          storage_path: path,
          title_ar: meta.titleAr || '',
          title_en: meta.titleEn || '',
          text_ar: meta.textAr || '',
          text_en: meta.textEn || '',
          size_class: meta.size || 'normal',
          sort_order: meta.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async addImageByUrl(url, meta) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase غير متصل');
      const { data, error } = await sb
        .from('gallery_images')
        .insert({
          storage_path: url,
          title_ar: meta.titleAr || '',
          title_en: meta.titleEn || '',
          text_ar: meta.textAr || '',
          text_en: meta.textEn || '',
          size_class: meta.size || 'normal',
          sort_order: meta.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateImageOrder(items) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase غير متصل');
      for (const item of items) {
        await sb.from('gallery_images').update({ sort_order: item.sortOrder }).eq('id', item.id);
      }
    },

    async deleteImage(id, storagePath) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase غير متصل');
      if (storagePath && !/^https?:\/\//i.test(storagePath)) {
        await sb.storage.from(GALLERY_BUCKET).remove([storagePath]);
      }
      const { error } = await sb.from('gallery_images').delete().eq('id', id);
      if (error) throw error;
    },

    // ---------------- رسايل الفورم ----------------
    async submitMessage(payload) {
      const sb = getClient();
      if (!sb) return null; // الفورم فضل شغال بواتساب زي ما هو، من غير أي خطأ
      const { error } = await sb.from('form_messages').insert(payload);
      if (error) console.error('submitMessage', error);
      return true;
    },

    async listMessages() {
      const sb = getClient();
      if (!sb) return [];
      const { data, error } = await sb
        .from('form_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('listMessages', error); return []; }
      return data || [];
    },

    async markMessageRead(id) {
      const sb = getClient();
      if (!sb) return;
      await sb.from('form_messages').update({ status: 'read' }).eq('id', id);
    },

    async deleteMessage(id) {
      const sb = getClient();
      if (!sb) return;
      await sb.from('form_messages').delete().eq('id', id);
    },

    subscribeToNewMessages(callback) {
      const sb = getClient();
      if (!sb) return () => {};
      const channel = sb
        .channel('form-messages-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'form_messages' }, (payload) => {
          callback(payload.new);
        })
        .subscribe();
      return () => sb.removeChannel(channel);
    },

    // ---------------- تسجيل دخول الأدمن ----------------
    async login(email, password) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase غير متصل');
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async logout() {
      const sb = getClient();
      if (!sb) return;
      await sb.auth.signOut();
    },

    async getSession() {
      const sb = getClient();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session;
    },

    onAuthChange(callback) {
      const sb = getClient();
      if (!sb) return () => {};
      const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session));
      return () => data.subscription.unsubscribe();
    },
  };
})();
