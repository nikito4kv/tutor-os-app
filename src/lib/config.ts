/**
 * Single source of truth for environment access. Never read process.env directly
 * elsewhere — import from here so missing vars fail loudly and consistently.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example`);
  }
  return value;
}

export const env = {
  // Public — inlined into the client bundle by Next.
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get appUrl(): string {
    // Explicit override wins; on Vercel preview/prod fall back to the auto URL;
    // locally default to the dev server. Used server-side to build share links.
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  },

  // Server-only — accessing these from client code will throw at build/runtime.
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get resendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY || undefined;
  },
  get emailFrom(): string {
    return process.env.EMAIL_FROM ?? "tutorOS <noreply@tutor-os.online>";
  },

  // Telegram bot — all optional. Without a token the notifier runs in mock mode
  // (logs, sends nothing), exactly like email without RESEND_API_KEY.
  get telegramBotToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN || undefined;
  },
  /** Bot @username (no leading @) — used to build t.me/<username>?start=… links. */
  get telegramBotUsername(): string | undefined {
    return process.env.TELEGRAM_BOT_USERNAME || undefined;
  },
  /** Shared secret echoed by Telegram in the X-Telegram-Bot-Api-Secret-Token header. */
  get telegramWebhookSecret(): string | undefined {
    return process.env.TELEGRAM_WEBHOOK_SECRET || undefined;
  },
  /** Bearer secret the scheduled-notifications route requires from the cron caller. */
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET || undefined;
  },
} as const;
