import Link from "next/link";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { FEEDBACK_FILTERS, type FeedbackFilter } from "./schema";

export function FeedbackFilterTabs({ active }: { active: FeedbackFilter }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FEEDBACK_FILTERS.map((filter) => {
        const isActive = filter === active;
        const href = filter === "all" ? "/admin/feedback" : `/admin/feedback?status=${filter}`;
        return (
          <Link
            key={filter}
            href={href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              focusRing,
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.admin.feedback.filters[filter]}
          </Link>
        );
      })}
    </div>
  );
}
