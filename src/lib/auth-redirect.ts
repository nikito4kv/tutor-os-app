export const DEFAULT_APP_REDIRECT = "/students";
export const CURRENT_PATH_HEADER = "x-tutoros-current-path";
export const LOGIN_REDIRECT_PARAM = "redirect";

const AUTH_PREFIXES = ["/login", "/signup", "/auth", "/reset-password"];

function isUnsafeSlashPrefix(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    lower.startsWith("/%2f") ||
    lower.startsWith("/%5c")
  );
}

export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || isUnsafeSlashPrefix(trimmed)) return undefined;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return undefined;
  return trimmed;
}

export function safePostLoginRedirect(value: unknown): string | undefined {
  const path = safeRedirectPath(value);
  if (!path) return undefined;
  return AUTH_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`),
  )
    ? undefined
    : path;
}

export function loginPathWithRedirect(path: string | undefined): string {
  const safePath = safePostLoginRedirect(path);
  if (!safePath) return "/login";
  const params = new URLSearchParams({ [LOGIN_REDIRECT_PARAM]: safePath });
  return `/login?${params.toString()}`;
}
