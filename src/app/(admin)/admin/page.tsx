import type { Metadata } from "next";
import { AdminStatsCards } from "@/features/admin/admin-stats-cards";
import { HealthCards } from "@/features/admin/health-cards";
import { LessonStatusChart } from "@/features/admin/lesson-status-chart";
import { getAdminStats } from "@/features/admin/queries";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.admin.title} — ${t.common.appName}` };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t.admin.title}</h1>
        <p className="text-sm text-muted-foreground">{t.admin.subtitle}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t.admin.sections.summary}</h2>
        <AdminStatsCards stats={stats} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t.admin.sections.lessons}</h2>
        <LessonStatusChart stats={stats} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t.admin.sections.activity}</h2>
        <HealthCards stats={stats} />
      </section>
    </div>
  );
}
