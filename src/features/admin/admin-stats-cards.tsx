import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { formatDelta } from "./admin-stats";
import type { AdminStats } from "./queries";

interface StatItem {
  key: keyof AdminStats;
  label: string;
  icon: LucideIcon;
  /** Без href карточка — статичный показатель (только репетиторы кликабельны). */
  href?: string;
  deltaKey?: keyof AdminStats;
}

const ITEMS: readonly StatItem[] = [
  {
    key: "tutors",
    label: t.admin.stats.tutors,
    icon: GraduationCap,
    href: "/admin/users",
    deltaKey: "tutors_new_7d",
  },
  {
    key: "students",
    label: t.admin.stats.students,
    icon: Users,
    deltaKey: "students_new_7d",
  },
];

const iconChip = "grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary";

/** Дельта за неделю или CTA «открыть» (только для кликабельных карточек). */
function StatFooter({ delta, clickable }: { delta: string | null; clickable: boolean }) {
  if (delta) {
    return (
      <p className="mt-2 flex h-5 items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
          <TrendingUp className="size-3" />
          {delta}
        </span>
        <span className="text-xs text-muted-foreground">{t.admin.stats.perWeek}</span>
      </p>
    );
  }
  if (!clickable) return <p className="mt-2 h-5" />;
  return (
    <p className="mt-2 flex h-5 items-center gap-1 text-xs font-medium text-primary">
      {t.admin.stats.openCta}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </p>
  );
}

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ITEMS.map(({ key, label, icon: Icon, href, deltaKey }) => {
        const delta = deltaKey ? formatDelta(stats[deltaKey]) : null;
        const body = (
          <Card className={cn("h-full p-5 transition-colors", href && "hover:border-primary")}>
            <span className={iconChip}>
              <Icon className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{stats[key]}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
            <StatFooter delta={delta} clickable={Boolean(href)} />
          </Card>
        );
        return href ? (
          <Link key={key} href={href} className={cn("group rounded-lg", focusRing)}>
            {body}
          </Link>
        ) : (
          <div key={key}>{body}</div>
        );
      })}

      <Link href="/admin/feedback?status=new" className={cn("group rounded-lg", focusRing)}>
        <Card className="h-full p-5 transition-colors hover:border-primary">
          <span className={iconChip}>
            <MessageSquare className="size-5" />
          </span>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{stats.feedback_new}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {t.admin.stats.feedbackNew}
          </p>
          <p className="mt-2 inline-flex h-5 items-center gap-1 text-xs font-medium text-primary">
            {t.admin.stats.reviewCta}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Card>
      </Link>
    </div>
  );
}
