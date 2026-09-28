/**
 * إعدادات Supabase
 * ------------------
 * الموقع والداشبورد شغالين دلوقت بدون Supabase (الفورم بيروح على واتساب فقط، والصور ثابتة).
 * لما تنشئ مشروع Supabase (خطوات كاملة في ملف supabase/التعليمات.md):
 *   1) روح لـ Settings > API في مشروعك.
 *   2) هات "Project URL" و"anon public key" وحطهم تحت.
 *   3) رفع الملفات على السيرفر (أو استبدل النسخة القديمة بيها) وخلاص، هيشتغل تلقائي.
 *
 * لو سيبت القيمتين فاضيين، الموقع والداشبورد هيفضلوا شغالين بنفس الطريقة الحالية
 * (فورم بيروح واتساب فقط + صور المعرض الثابتة) من غير أي كسر أو خطأ.
 */
window.SUPABASE_URL = 'https://xrxmchyaemzfsrpnyzsu.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeG1jaHlhZW16ZnNycG55enN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDg2NjMsImV4cCI6MjEwNTA4NDY2M30.Xaghb5jw4qP4YcedPV8UZaMAbROjwkEMFRCgnPofGhc';

window.isSupabaseConfigured = function () {
  return Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
};
