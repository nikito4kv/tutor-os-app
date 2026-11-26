import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config";
import {
  CURRENT_PATH_HEADER,
  DEFAULT_APP_REDIRECT,
  LOGIN_REDIRECT_PARAM,
  safePostLoginRedirect,
} from "@/lib/auth-redirect";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Public route prefixes that don't require an authenticated tutor. The Telegram
 * webhook and the scheduled-notifications cron carry no session cookie and
 * authenticate themselves (secret token / CRON_SECRET), so they must not be
 * redirected to /login.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/s/",
  "/auth",
  "/reset-password",
  "/api/telegram/",
  "/api/cron/",
];

function isPublic(pathname: string): boolean {
  // Landing page is public; matched exactly so it doesn't whitelist every route.
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated users away from protected routes.
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CURRENT_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    // Запоминаем исходный путь, чтобы вернуть пользователя сюда после входа.
    const target = pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set(LOGIN_REDIRECT_PARAM, target);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const target =
      safePostLoginRedirect(request.nextUrl.searchParams.get(LOGIN_REDIRECT_PARAM)) ??
      DEFAULT_APP_REDIRECT;
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}
