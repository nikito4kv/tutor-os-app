import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.signInTitle} — ${t.common.appName}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <AuthForm mode="signin" redirectTo={redirect} />;
}
