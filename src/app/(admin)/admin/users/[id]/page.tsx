import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TutorAdminPanel } from "@/features/admin/tutor-admin-panel";
import { TutorAnalytics } from "@/features/admin/tutor-analytics";
import { getAdminTutorDetail } from "@/features/admin/queries";
import { formatDate } from "@/lib/date";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${t.admin.tutorDetail.profileTitle} - ${t.common.appName}`,
};
export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function AdminTutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminTutorDetail(id);
  if (!detail) notFound();
  const { tutor, analytics } = detail;
  const d = t.admin.directory.fields;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          focusRing,
        )}
      >
        <ArrowLeft className="size-4" />
        {t.admin.tutorDetail.back}
      </Link>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-xl font-semibold">{tutor.name || tutor.email}</h1>
            <p className="break-all text-sm text-muted-foreground">{tutor.email}</p>
          </div>
          <TutorAdminPanel tutor={tutor} />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={d.currency} value={tutor.currency} />
          <Detail label={d.studentsCount} value={tutor.students_count} />
          <Detail label={d.lessonsCount} value={tutor.lessons_count} />
          <Detail label={d.createdAt} value={formatDate(tutor.created_at)} />
        </dl>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t.admin.tutorDetail.analyticsTitle}</h2>
        <TutorAnalytics analytics={analytics} currency={tutor.currency} />
      </section>
    </div>
  );
}
