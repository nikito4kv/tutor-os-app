import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: `${t.auth.reset.title} — ${t.common.appName}` };
export const dynamic = "force-dynamic";

/**
 * Установка нового пароля по ссылке из письма. К этому моменту /auth/confirm уже
 * обменял token на recovery-сессию, поэтому наличие пользователя = ссылка валидна.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">{t.auth.reset.title}</CardTitle>
        <CardDescription>{user ? t.auth.reset.subtitle : t.auth.reset.linkInvalid}</CardDescription>
      </CardHeader>
      {user ? (
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      ) : null}
    </Card>
  );
}
