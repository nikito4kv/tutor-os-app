import { Activity, Moon, UserMinus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { AdminStats } from "./queries";

interface HealthItem {
  key: keyof AdminStats;
  label: string;
  icon: LucideIcon;
  /** Сигнал оттока/активации: подсвечиваем warning, когда значение > 0. */
  risk?: boolean;
}

/** Сигналы активации/оттока + пульс активности. Всё — агрегаты (counts). */
const ITEMS: readonly HealthItem[] = [
  { key: "lessons_done_7d", label: t.admin.stats.doneThisWeek, icon: Activity },
  { key: "tutors_no_students", label: t.admin.stats.noStudents, icon: UserMinus, risk: true },
  { key: "tutors_inactive_30d", label: t.admin.stats.inactive30d, icon: Moon, risk: true },
];

export function HealthCards({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ITEMS.map(({ key, label, icon: Icon, risk }) => {
        const value = stats[key];
        const alert = Boolean(risk) && value > 0;
        return (
          <Card key={key} className={cn("p-5", alert && "border-warning/40")}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  alert ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-5" />
              </span>
            </div>
            <p className={cn("mt-2 text-2xl font-semibold tabular-nums", alert && "text-warning")}>
              {value}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
