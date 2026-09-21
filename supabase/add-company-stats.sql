-- أرقام الشركة (عدد الموظفين + عدد المشاريع)
-- بتظهر في الموقع قبل الفوتر، وبتتغيّر من الداشبورد (تاب "أرقام الشركة").
--
-- شغّل الملف ده مرة واحدة بس:
--   Supabase Dashboard > SQL Editor > New query > الصق الكود > Run
--
-- الأمر آمن: لو الأعمدة موجودة قبل كده مش هيعمل حاجة ومش هيمسح أي بيانات.

alter table site_settings
  add column if not exists employees_count integer not null default 0 check (employees_count >= 0),
  add column if not exists projects_count  integer not null default 0 check (projects_count  >= 0);

-- عشان Supabase يشوف الأعمدة الجديدة فورًا
notify pgrst, 'reload schema';
