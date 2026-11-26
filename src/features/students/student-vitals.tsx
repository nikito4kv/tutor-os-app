import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddPackage } from "@/features/packages/add-package";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/**
 * Vital signs strip shown above the tabs on every student tab. The lessons-left
 * balance is the product's hero number; when it runs low the strip tints
 * (warning token) and surfaces an inline "top up" that opens AddPackage right
 * here — so the warning is actionable instead of a dead end. Money lives here;
 * teaching to-dos live in the overview's attention zone (see docs spec, INV-X1).
 */
export function StudentVitals({
  studentId,
  lessonsLeft,
  lowBalance,
}: {
  studentId: string;
  lessonsLeft: number;
  lowBalance: boolean;
}) {
  return (
    <Card className={cn(lowBalance && "border-warning/40 bg-warning/5")}>
      <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className={cn("text-3xl font-semibold", lowBalance && "text-warning")}>
            {lessonsLeft}
          </span>
          <span className="text-sm text-muted-foreground">{t.students.lessonsLeft}</span>
          {lowBalance ? <Badge variant="warning">{t.students.lowBalance}</Badge> : null}
        </div>
        {lowBalance ? (
          <AddPackage
            studentId={studentId}
            trigger={
              <Button size="sm" variant="outline" data-onboarding-target="add-package">
                <Wallet className="size-4" />
                {t.students.topUp}
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
