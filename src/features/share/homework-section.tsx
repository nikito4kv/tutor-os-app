import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { SectionHeading } from "./section-heading";
import { ActiveHomeworkCard } from "./active-homework-card";
import { ReviewedHomeworkRow } from "./reviewed-homework-row";
import { t } from "@/lib/i18n";
import type { ShareView } from "./queries";

type Homework = ShareView["homework"][number];

/**
 * Splits homework into "needs doing" (assigned + submitted) and a collapsed
 * "reviewed" archive, so actionable items don't compete with finished ones.
 */
export function HomeworkSection({ homework, token }: { homework: Homework[]; token: string }) {
  if (homework.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeading title={t.students.tabs.homework} />
        <EmptyState title={t.share.noHomework} />
      </section>
    );
  }

  const active = homework.filter((hw) => hw.status !== "reviewed");
  const reviewed = homework.filter((hw) => hw.status === "reviewed");

  return (
    <div className="space-y-6">
      {active.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t.share.toSubmit} count={active.length} />
          {active.map((hw) => (
            <ActiveHomeworkCard key={hw.id} homework={hw} token={token} />
          ))}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t.share.allDone}</p>
      )}

      {reviewed.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading title={t.share.reviewed} count={reviewed.length} />
          <Card className="divide-y overflow-hidden">
            {reviewed.map((hw) => (
              <ReviewedHomeworkRow key={hw.id} homework={hw} />
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
