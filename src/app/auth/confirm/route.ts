import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Только внутренние пути (защита от open-redirect). */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Обмен ссылки из письма на сессию. Поддерживает оба варианта шаблона Supabase:
 * современный `token_hash` + verifyOtp (самодостаточный, работает в любом браузере —
 * нужен для админского сброса пароля) и устаревший PKCE `code` + exchangeCodeForSession.
 * При успехе ведём на `next`, иначе — на /reset-password с пометкой ошибки.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? next : "/reset-password";
  if (!ok) url.searchParams.set("error", "1");
  return NextResponse.redirect(url);
}
