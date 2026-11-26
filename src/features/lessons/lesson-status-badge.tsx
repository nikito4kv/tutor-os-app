import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { LessonStatus } from "@/lib/supabase/database.types";

const VARIANT: Record<LessonStatus, "default" | "success" | "warning" | "destructive"> = {
  scheduled: "default",
  done: "success",
  canceled: "warning",
  no_show: "destructive",
};

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return <Badge variant={VARIANT[status]}>{t.lessons.statuses[status]}</Badge>;
}
