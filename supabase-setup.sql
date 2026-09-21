-- ============================================================
-- شغّل الملف ده مرة واحدة في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) جدول إعدادات الموقع (رقم الواتساب + إيميل الإشعارات)
--    صف واحد بس (id = 1) بيتعدل من تاب "الإعدادات" في الداشبورد.
create table if not exists public.site_settings (
  id int primary key default 1,
  whatsapp_number text not null default '966536760429',
  notify_email text not null default '',
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into public.site_settings (id, whatsapp_number, notify_email)
values (1, '966536760429', '')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for update
  using (auth.role() = 'authenticated');

-- 2) جدول رسائل الفورم (لو مش موجود أصلاً — عادي لو already existing هيتجاهل الأمر)
create table if not exists public.form_messages (
  id uuid primary key default gen_random_uuid(),
  source text,
  channel text,
  name text,
  company text,
  email text,
  phone text,
  phone2 text,
  service text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- في حالة الجدول كان موجود من قبل بدون عمود channel
alter table public.form_messages add column if not exists channel text;

alter table public.form_messages enable row level security;

-- أي زائر في الموقع (anon) يقدر يضيف رسالة (submit) بس مايقدرش يقرا/يعدل/يمسح
drop policy if exists "form_messages_public_insert" on public.form_messages;
create policy "form_messages_public_insert"
  on public.form_messages for insert
  with check (true);

-- بس الأدمن (بعد تسجيل الدخول) يقدر يقرا / يعدل / يمسح الرسايل
drop policy if exists "form_messages_admin_select" on public.form_messages;
create policy "form_messages_admin_select"
  on public.form_messages for select
  using (auth.role() = 'authenticated');

drop policy if exists "form_messages_admin_update" on public.form_messages;
create policy "form_messages_admin_update"
  on public.form_messages for update
  using (auth.role() = 'authenticated');

drop policy if exists "form_messages_admin_delete" on public.form_messages;
create policy "form_messages_admin_delete"
  on public.form_messages for delete
  using (auth.role() = 'authenticated');

-- تفعيل الـ Realtime على جدول الرسايل عشان الإشعار الفوري في الداشبورد
-- (لو ظهر خطأ إن الجدول already added، تجاهله عادي)
alter publication supabase_realtime add table public.form_messages;
