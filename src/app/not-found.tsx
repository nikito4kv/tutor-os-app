import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/states/not-found-screen";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.errors.notFoundTitle} — ${t.common.appName}`,
};

export default function NotFound() {
  return <NotFoundScreen context="public" />;
}
