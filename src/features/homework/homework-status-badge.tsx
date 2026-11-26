import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { HomeworkStatus } from "@/lib/supabase/database.types";

const STATUS_META: Record<
  HomeworkStatus,
  { label: string; variant: "secondary" | "warning" | "success" }
> = {
  assigned: { label: t.homework.statuses.assigned, variant: "secondary" },
  submitted: { label: t.homework.statuses.submitted, variant: "warning" },
  reviewed: { label: t.homework.statuses.reviewed, variant: "success" },
};

export function HomeworkStatusBadge({ status }: { status: HomeworkStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
