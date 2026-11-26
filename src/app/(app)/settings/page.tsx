import { getCurrentTutor } from "@/lib/auth";
import { SettingsForm } from "@/features/settings/settings-form";
import { ChangePasswordDialog } from "@/features/settings/change-password-dialog";
import { OnboardingSettingsPanel } from "@/features/onboarding/onboarding-settings-panel";
import { TutorTelegramCard } from "@/features/telegram/tutor-telegram-card";
import { isCurrencyCode, DEFAULT_CURRENCY } from "@/lib/currency";
import { env } from "@/lib/config";
import { t } from "@/lib/i18n";

export default async function SettingsPage() {
  const tutor = await getCurrentTutor();
  const currency = isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.nav.settings}</h1>
      <SettingsForm name={tutor.name} currency={currency} />

      <section className="max-w-md space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.telegram.settings.title}</h2>
          <p className="text-sm text-muted-foreground">{t.telegram.settings.description}</p>
        </div>
        <TutorTelegramCard
          connected={Boolean(tutor.telegram_chat_id)}
          configured={Boolean(env.telegramBotUsername)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.settings.security}</h2>
        <ChangePasswordDialog />
      </section>

      <section className="max-w-md space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t.settings.onboarding.title}</h2>
          <p className="text-sm text-muted-foreground">{t.settings.onboarding.description}</p>
        </div>
        <OnboardingSettingsPanel />
      </section>
    </div>
  );
}
