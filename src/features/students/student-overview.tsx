import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonDetailDialog } from "@/features/lessons/lesson-detail-dialog";
import { AddLesson } from "@/features/lessons/add-lesson";
import { CopyLinkButton } from "./copy-link-button";
import { EditStudentDialog } from "./student-dialogs";
import { contactHref, type ContactKind } from "./contact";
import { buildActivityFeed, buildAttentionItems, type AttentionItem } from "./overview";
import type { Student } from "./queries";
import type { StudentOverview as StudentOverviewData } from "./queries";
import type { Lesson } from "@/features/lessons/queries";
import { StudentTelegramLink } from "@/features/telegram/student-telegram-link";
import { disconnectStudentAction } from "@/features/telegram/actions";
import { buildBotDeepLink } from "@/features/telegram/link-code";
import { formatDate, formatRelativeToNow, formatWhenLabel } from "@/lib/date";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { env } from "@/lib/config";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const CONTACT_ICON: Record<ContactKind, LucideIcon> = {
  telegram: Send,
  email: Mail,
  phone: Phone,
  link: ExternalLink,
};

/**
 * Overview tab — the student card's cockpit landing. A two-column layout on lg+:
 * the main column carries the actionable bits (attention zone → next lesson →
 * recent activity); the aside carries reference (secondary KPI tiles, contacts,
 * share link). Money/balance lives in the vital strip above the tabs, not here
 * (see docs spec, INV-X1). Server component; interactive bits (lesson modal,
 * edit dialog, copy, add-lesson) are client components rendered within.
 */
export function StudentOverview({
  studentId,
  student,
  shareUrl,
  lessonsLeft,
  homeworkToReview,
  overview,
}: {
  studentId: string;
  student: Student;
  shareUrl: string;
  lessonsLeft: number;
  homeworkToReview: number;
  overview: StudentOverviewData;
}) {
  const { nextLesson, totalPaid, recentLessons, lastPayment, currency } = overview;
  const feed = buildActivityFeed(recentLessons, lastPayment);
  const attention = buildAttentionItems({
    toReview: homeworkToReview,
    overdue: overview.homeworkOverdue,
    noUpcoming: nextLesson == null,
  });
  const botUsername = env.telegramBotUsername;
  const telegramDeepLink = botUsername ? buildBotDeepLink(botUsername, student.share_token) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main column — what needs doing, then the next lesson, then history */}
      <div className="space-y-6 lg:col-span-2">
        <AttentionZone studentId={studentId} lessonsLeft={lessonsLeft} items={attention} />
        <NextLessonCard
          studentId={studentId}
          studentName={student.name}
          lessonsLeft={lessonsLeft}
          nextLesson={nextLesson}
        />
        {feed.length > 0 ? <RecentActivity feed={feed} currency={currency} /> : null}
      </div>

      {/* Aside — reference: secondary stats, contacts, share link */}
      <aside className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatTile
            label={t.students.overview.toReview}
            value={homeworkToReview}
            icon={ClipboardCheck}
            href={`/students/${studentId}?tab=homework`}
          />
          <StatTile
            label={t.students.overview.totalPaid}
            value={formatMoney(totalPaid, currency)}
            icon={Wallet}
            href={`/students/${studentId}?tab=packages`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ContactField
            label={t.students.fields.contact}
            value={student.contact}
            student={student}
          />
          <ContactField
            label={t.students.fields.parentContact}
            value={student.parent_contact}
            student={student}
          />
        </div>

        <ShareLink shareUrl={shareUrl} student={student} />

        {telegramDeepLink ? (
          <StudentTelegramLink
            deepLink={telegramDeepLink}
            connected={Boolean(student.telegram_chat_id)}
            disconnectAction={disconnectStudentAction.bind(null, studentId)}
          />
        ) : null}
      </aside>
    </div>
  );
}

/**
 * "Needs attention" zone — the card's to-do list. Teaching actions only (review
 * homework, overdue homework, no upcoming lesson); money lives in the vital
 * strip. Renders a card only when there's something to do, else a calm line.
 */
function AttentionZone({
  studentId,
  lessonsLeft,
  items,
}: {
  studentId: string;
  lessonsLeft: number;
  items: AttentionItem[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.students.attention.allClear}</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t.students.attention.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item) => (
          <AttentionRow
            key={item.kind}
            studentId={studentId}
            lessonsLeft={lessonsLeft}
            item={item}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AttentionRow({
  studentId,
  lessonsLeft,
  item,
}: {
  studentId: string;
  lessonsLeft: number;
  item: AttentionItem;
}) {
  const homeworkHref = `/students/${studentId}?tab=homework`;

  if (item.kind === "noUpcoming") {
    return (
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <CalendarPlus className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{t.students.attention.noUpcoming}</span>
        </span>
        <AddLesson studentId={studentId} lessonsLeft={lessonsLeft} />
      </div>
    );
  }

  const isOverdue = item.kind === "overdue";
  const Icon = isOverdue ? AlertTriangle : ClipboardCheck;
  const text = isOverdue ? t.students.attention.overdue : t.students.attention.reviewPending;
  const action = isOverdue ? t.students.attention.overdueAction : t.students.attention.reviewAction;

  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Icon
          className={cn("size-4 shrink-0", isOverdue ? "text-warning" : "text-muted-foreground")}
        />
        <span className="truncate">{text}</span>
        <Badge variant="secondary">{item.count}</Badge>
      </span>
      <Link
        href={homeworkHref}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
      >
        {action}
      </Link>
    </div>
  );
}

/** Forward-looking next-lesson card; empty state is an actionable CTA, not dead text. */
function NextLessonCard({
  studentId,
  studentName,
  lessonsLeft,
  nextLesson,
}: {
  studentId: string;
  studentName: string;
  lessonsLeft: number;
  nextLesson: Lesson | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.students.overview.nextLesson}
        </CardTitle>
        <CalendarClock className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {nextLesson ? (
          <LessonDetailDialog lesson={nextLesson} studentName={studentName}>
            <button
              type="button"
              className={cn(
                "-m-1 flex w-full flex-col gap-1.5 rounded-md p-1 text-left transition-colors hover:bg-accent",
                focusRing,
              )}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">
                  {formatWhenLabel(nextLesson.starts_at)}
                </span>
                <Badge variant="secondary">{formatRelativeToNow(nextLesson.starts_at)}</Badge>
              </span>
              {nextLesson.topic ? (
                <span className="truncate text-sm text-muted-foreground">{nextLesson.topic}</span>
              ) : null}
            </button>
          </LessonDetailDialog>
        ) : (
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">{t.students.overview.noNextLesson}</p>
            <AddLesson studentId={studentId} lessonsLeft={lessonsLeft} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShareLink({ shareUrl, student }: { shareUrl: string; student: Student }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t.students.shareLink}</p>
        <EditStudentDialog
          student={student}
          trigger={
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              <Pencil className="size-3.5" />
              {t.common.edit}
            </button>
          }
        />
      </div>

      {/* Show the code itself, not the full URL — the muted base hints the shape. */}
      <p className="mt-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm">
        <span className="text-muted-foreground">…/s/</span>
        <span className="text-foreground">{student.share_token}</span>
      </p>

      <div className="mt-2 flex gap-2">
        <CopyLinkButton url={shareUrl} className="flex-1" />
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t.students.overview.open}
          className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{t.students.share.editWarning}</p>
    </div>
  );
}

function RecentActivity({
  feed,
  currency,
}: {
  feed: ReturnType<typeof buildActivityFeed>;
  currency: CurrencyCode;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{t.students.overview.recentActivity}</p>
      <ul className="mt-2 divide-y rounded-md border">
        {feed.map((e, i) => {
          const Icon = e.kind === "payment" ? Wallet : GraduationCap;
          const label =
            e.kind === "payment"
              ? `${t.students.overview.paymentActivity} · ${formatMoney(e.amount, currency)}`
              : `${t.lessons.statuses[e.status]}${e.topic ? ` · ${e.topic}` : ""}`;
          return (
            <li
              key={i}
              className="flex flex-col items-start justify-between gap-1 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{label}</span>
              </span>
              <span className="whitespace-nowrap text-muted-foreground">{formatDate(e.at)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  href?: string;
}) {
  const card = (
    <Card className={href ? "h-full transition-colors hover:border-primary" : "h-full"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className={cn("block rounded-lg", focusRing)}>
      {card}
    </Link>
  ) : (
    card
  );
}

function ContactField({
  label,
  value,
  student,
}: {
  label: string;
  value: string | null;
  student: Student;
}) {
  const link = contactHref(value);
  const Icon = link ? CONTACT_ICON[link.kind] : null;
  const external = link?.kind === "telegram" || link?.kind === "link";

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {value && link && Icon ? (
        <a
          href={link.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className={cn(
            "mt-1 inline-flex items-center gap-1.5 rounded-sm text-sm text-primary hover:underline",
            focusRing,
          )}
        >
          <Icon className="size-4 shrink-0" />
          {value}
        </a>
      ) : value ? (
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      ) : (
        <EditStudentDialog
          student={student}
          trigger={
            <button
              type="button"
              className={cn(
                "mt-1 rounded-sm text-sm text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              + {t.students.overview.addContact}
            </button>
          }
        />
      )}
    </div>
  );
}
