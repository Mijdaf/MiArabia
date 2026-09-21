-- شغّل الملف ده كامل مرة واحدة في: Supabase Dashboard > SQL Editor > New query
--
-- لو الجدول form_messages كان اتعمل قبل كده (يعني شغّلت الملف ده قبل ما نضيف عمود
-- channel)، شغّل السطر ده لوحده مرة واحدة عشان يضيف العمود الناقص من غير ما يمسح
-- أي بيانات موجودة:
--   alter table form_messages add column if not exists channel text;


-- ============ جدول صور المعرض ============
create table if not exists gallery_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,       -- اسم الملف في bucket "gallery" أو رابط خارجي كامل
  title_ar text default '',
  title_en text default '',
  text_ar text default '',
  text_en text default '',
  size_class text default 'normal', -- normal | wide | big
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table gallery_images enable row level security;

-- أي زائر للموقع يقدر يقرأ الصور (عشان تظهر في المعرض)
create policy "gallery images are public to read"
  on gallery_images for select
  using (true);

-- الإضافة/التعديل/الحذف للأدمن (اللي عامل تسجيل دخول) فقط
create policy "gallery images write for admins only"
  on gallery_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ============ جدول رسايل الفورم ============
create table if not exists form_messages (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('contact', 'quick_request', 'quick_inquiry')),
  name text,
  company text,
  email text,
  phone text,
  phone2 text,
  service text,
  message text,
  channel text,
  status text default 'new' check (status in ('new', 'read')),
  created_at timestamptz default now()
);

alter table form_messages enable row level security;

-- أي زائر يقدر "يضيف" رسالة (submit للفورم) بس مش يقرأ رسايل غيره
create policy "anyone can submit a message"
  on form_messages for insert
  with check (true);

-- القراءة/التعديل (تعليم كمقروء)/الحذف للأدمن فقط
create policy "only admins can read messages"
  on form_messages for select
  using (auth.role() = 'authenticated');

create policy "only admins can update messages"
  on form_messages for update
  using (auth.role() = 'authenticated');

create policy "only admins can delete messages"
  on form_messages for delete
  using (auth.role() = 'authenticated');

-- مهم: لازم كذلك تفعّل الـ Realtime على الجدول ده من واجهة Supabase
-- (Database > Replication > حدد form_messages) عشان الإشعارات تعمل لحظيًا في الداشبورد.
