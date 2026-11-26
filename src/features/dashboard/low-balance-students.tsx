import Link from "next/link";
import { Wallet } from "lucide-react";
import type { LowBalanceStudent } from "./aggregate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** Students at or below the low-balance threshold — "time to top up". Chips link to packages. */
export function LowBalanceStudents({ students }: { students: LowBalanceStudent[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{t.dashboard.lowBalance}</CardTitle>
        {students.length > 0 ? <Badge variant="warning">{students.length}</Badge> : null}
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <EmptyState icon={<Wallet className="size-6" />} title={t.dashboard.lowBalanceEmpty} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/students/${student.id}?tab=packages`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-auto gap-2 py-1.5",
                )}
              >
                <span className="font-medium">{student.name}</span>
                <Badge variant={student.lessonsLeft <= 0 ? "destructive" : "warning"}>
                  {student.lessonsLeft} {t.packages.lessonsUnit}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
