import { ru, type Dictionary } from "./ru";

export type Locale = "ru";

export const defaultLocale: Locale = "ru";

const dictionaries: Record<Locale, Dictionary> = { ru };

/**
 * Active dictionary. MVP is single-locale (ru); when we add locales this becomes
 * a per-request lookup, but components keep importing `t` unchanged.
 */
export const t: Dictionary = dictionaries[defaultLocale];

export type { Dictionary };
