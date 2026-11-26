/** Money formatting. No payment processing in MVP — display only. */

export const SUPPORTED_CURRENCIES = ["RUB", "KZT", "GEL", "USD", "EUR", "UAH", "BYN"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "RUB";

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  RUB: "Российский рубль (₽)",
  KZT: "Казахстанский тенге (₸)",
  GEL: "Грузинский лари (₾)",
  USD: "Доллар США ($)",
  EUR: "Евро (€)",
  UAH: "Украинская гривна (₴)",
  BYN: "Белорусский рубль (Br)",
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Format an amount in the given currency using ru-RU conventions. */
export function formatMoney(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
