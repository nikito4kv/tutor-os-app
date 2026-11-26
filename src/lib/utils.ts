import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner used by all UI primitives. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Up-to-two-letter initials for an avatar chip (Cyrillic-aware). First letters of
 * the first two name parts, e.g. "Анна Петрова" -> "АП", "Иван" -> "И".
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  const chars = second ? first.charAt(0) + second.charAt(0) : first.charAt(0);
  return (chars || "?").toLocaleUpperCase("ru");
}
