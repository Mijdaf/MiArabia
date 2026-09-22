-- شركاء النجاح (Success Partners)
-- شغّل الملف ده مرة واحدة بس في Supabase: Project > SQL Editor > New query > الصق الكود ده > Run
-- بعد ما تشغّله، تاب "شركاء النجاح" في الداشبورد هيشتغل على طول (اسم الشركة بس، من غير صور).

create table if not exists public.partners (
  id bigint generated always as identity primary key,
  name_ar text not null default '',
  name_en text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.partners enable row level security;

-- أي حد (حتى الزوار) يقدر يقرأ القائمة عشان تظهر في الموقع
drop policy if exists "Public can read partners" on public.partners;
create policy "Public can read partners"
  on public.partners for select
  using (true);

-- بس المستخدم المسجّل دخول (الأدمن) يقدر يضيف/يعدّل/يحذف
drop policy if exists "Authenticated can manage partners" on public.partners;
create policy "Authenticated can manage partners"
  on public.partners for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
