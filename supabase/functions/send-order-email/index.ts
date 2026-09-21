// Supabase Edge Function: send-order-email
// بتستقبل بيانات الطلب من الموقع وتبعت إيميل للإيميل الرسمي المسجّل
// في جدول site_settings (اللي بيتغيّر من تاب "الإعدادات" في الداشبورد).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// إيميل المرسل — لازم يكون على دومين متحقق منه في Resend (شرح في التعليمات.md)
const FROM_EMAIL = Deno.env.get("NOTIFY_FROM_EMAIL") || "onboarding@resend.dev";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCE_LABELS: Record<string, string> = {
  contact: "نموذج التواصل",
  quick_request: "طلب سريع",
  quick_inquiry: "استفسار سريع",
};

const FIELD_LABELS: [string, string][] = [
  ["name", "الاسم"],
  ["company", "الشركة"],
  ["email", "البريد الإلكتروني"],
  ["phone", "رقم الجوال"],
  ["phone2", "رقم بديل"],
  ["service", "الخدمة المطلوبة"],
  ["message", "التفاصيل / الرسالة"],
];

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing required secrets (RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
      return new Response(JSON.stringify({ error: "الخدمة غير مهيأة بعد من طرف السيرفر" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // نجيب الإيميل الرسمي من قاعدة البيانات نفسها (مش من الطلب اللي جاي من المتصفح)
    // عشان محدش يقدر يغيّر وجهة الإيميل من جهاز الزائر.
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("notify_email")
      .eq("id", 1)
      .single();

    if (settingsError) {
      console.error("settingsError", settingsError);
    }

    const toEmail = settings?.notify_email;
    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: "لسه مفيش إيميل إشعارات متسجل من لوحة التحكم (تاب الإعدادات)" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const rows = FIELD_LABELS
      .map(([key, label]) => [label, payload[key]])
      .filter(([, value]) => value);

    const html = `
      <div style="font-family:Tahoma,Arial,sans-serif; direction:rtl; text-align:right; max-width:560px; margin:0 auto;">
        <h2 style="color:#000032;">طلب جديد من الموقع</h2>
        <p style="color:#4d5680;">المصدر: ${escapeHtml(SOURCE_LABELS[payload.source] || payload.source || "غير محدد")}</p>
        <table style="border-collapse:collapse; width:100%;">
          ${rows.map(([label, value]) => `
            <tr>
              <td style="padding:8px 10px; font-weight:bold; color:#000032; border-bottom:1px solid #eee; white-space:nowrap;">${label}</td>
              <td style="padding:8px 10px; color:#0a0d1f; border-bottom:1px solid #eee;">${escapeHtml(String(value))}</td>
            </tr>`).join("")}
        </table>
      </div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `طلب جديد من الموقع — ${payload.name || payload.phone || ""}`.trim(),
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "فشل إرسال الإيميل، حاول تاني" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-order-email error:", e);
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
