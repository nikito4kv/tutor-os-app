import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.auth.signUpTitle} — ${t.common.appName}` };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <AuthForm mode="signup" redirectTo={redirect} />;
}
