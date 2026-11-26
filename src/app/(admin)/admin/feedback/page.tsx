import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { FeedbackFilterTabs } from "@/features/admin/feedback-filter-tabs";
import { FeedbackList } from "@/features/admin/feedback-list";
import { listFeedback } from "@/features/admin/queries";
import { parseFeedbackFilter } from "@/features/admin/schema";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: `${t.admin.feedback.title} — ${t.common.appName}` };
export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = parseFeedbackFilter(status);
  const items = await listFeedback(filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.admin.feedback.title}</h1>
      <FeedbackFilterTabs active={filter} />
      {items.length === 0 ? (
        <EmptyState title={t.admin.feedback.empty} icon={<Inbox className="size-6" />} />
      ) : (
        <FeedbackList items={items} />
      )}
    </div>
  );
}
