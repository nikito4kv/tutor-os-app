/**
 * Turn a free-text contact (phone / email / Telegram / link) into an actionable
 * link. Kept pure (no React/lucide) so it's trivially unit-testable; the icon
 * for each `kind` is chosen in the component. Returns null when the value isn't
 * confidently linkable — the UI then shows it as plain text.
 */

export type ContactKind = "telegram" | "email" | "phone" | "link";

export interface ContactLink {
  href: string;
  kind: ContactKind;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function contactHref(value: string | null | undefined): ContactLink | null {
  const v = value?.trim();
  if (!v) return null;

  // Already a URL — keep as-is; a t.me link reads as Telegram.
  if (/^https?:\/\//i.test(v)) {
    return { href: v, kind: /(?:^|\/\/|\.)t\.me\//i.test(v) ? "telegram" : "link" };
  }

  // @handle → Telegram (handles are word chars/underscore, no dots).
  if (v.startsWith("@") && /^@[A-Za-z0-9_]{3,}$/.test(v)) {
    return { href: `https://t.me/${v.slice(1)}`, kind: "telegram" };
  }

  if (EMAIL_RE.test(v)) {
    return { href: `mailto:${v}`, kind: "email" };
  }

  // Phone: mostly digits (with optional +, spaces, dashes, parens), ≥5 digits.
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length >= 5 && /^\+?[\d\s()-]+$/.test(v)) {
    return { href: `tel:${v.replace(/[^\d+]/g, "")}`, kind: "phone" };
  }

  return null;
}
