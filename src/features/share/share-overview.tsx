import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, ClipboardList, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeworkStatusBadge } from "@/features/homework/homework-status-badge";
import { formatDateTime, formatWhenLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { ShareView } from "./queries";
import { shareTabHref } from "./share-tabs";

type Lesson = ShareView["upcomingLessons"][number];
type Homework = ShareView["homework"][number];
type ChatMessage = ShareView["chatMessages"][number];

export function ShareOverview({ view, token }: { view: ShareView; token: string }) {
  const nextLesson = view.upcomingLessons[0] ?? null;
  const assignedHomework = view.homework.filter((hw) => hw.status === "assigned");
  const latestMessage = view.chatMessages.at(-1) ?? null;

  return (
    <section className="space-y-5">
      <div className="max-w-2xl space-y-1">
        <h2 className="text-lg font-semibold">{t.share.overviewTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.share.overviewSubtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<CalendarClock className="size-5 text-primary" />}
          title={t.nav.schedule}
          value={String(view.todayLessonsCount)}
          detail={nextLesson ? formatWhenLabel(nextLesson.starts_at) : t.share.noLessons}
        />
        <SummaryCard
          icon={<MessageCircle className="size-5 text-primary" />}
          title={t.chat.title}
          value={String(view.unreadChatCount)}
          detail={
            view.unreadChatCount > 0
              ? t.chat.unreadCount(view.unreadChatCount)
              : t.chat.noUnreadMessages
          }
        />
        <SummaryCard
          icon={<ClipboardList className="size-5 text-primary" />}
          title={t.students.tabs.homework}
          value={String(assignedHomework.length)}
          detail={assignedHomework.length > 0 ? t.share.toSubmit : t.share.allDone}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OverviewPanel
          title={t.nav.schedule}
          icon={<CalendarClock className="size-5 text-primary" />}
          href={shareTabHref(token, "schedule")}
        >
          {nextLesson ? (
            <LessonPreview lesson={nextLesson} />
          ) : (
            <MutedLine text={t.share.noLessons} />
          )}
        </OverviewPanel>

        <OverviewPanel
          title={t.students.tabs.homework}
          icon={<ClipboardList className="size-5 text-primary" />}
          href={shareTabHref(token, "homework")}
        >
          {assignedHomework.length > 0 ? (
            <div className="space-y-2">
              {assignedHomework.slice(0, 2).map((homework) => (
                <HomeworkPreview key={homework.id} homework={homework} />
              ))}
            </div>
          ) : (
            <MutedLine text={view.homework.length > 0 ? t.share.allDone : t.share.noHomework} />
          )}
        </OverviewPanel>
      </div>

      <OverviewPanel
        title={t.chat.title}
        icon={<MessageCircle className="size-5 text-primary" />}
        href={shareTabHref(token, "chat")}
      >
        {view.unreadChatCount > 0 ? (
          <UnreadMessagePreview count={view.unreadChatCount} />
        ) : latestMessage ? (
          <MessagePreview message={latestMessage} />
        ) : (
          <MutedLine text={t.chat.noMessagesYet} />
        )}
      </OverviewPanel>
    </section>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{value}</span>
            <span className="truncate text-xs text-muted-foreground">{detail}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewPanel({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon: ReactNode;
  href: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            {icon}
          </div>
          <CardTitle className="min-w-0 truncate text-base">{title}</CardTitle>
        </div>
        <Link
          href={href}
          scroll={false}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
        >
          {t.share.openTab}
          <ArrowRight className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </Card>
  );
}

function LessonPreview({ lesson }: { lesson: Lesson }) {
  return (
    <div className="rounded-md border bg-secondary/40 p-3">
      <p className="truncate text-sm font-medium">{lesson.topic || t.common.lesson}</p>
      <p className="mt-1 text-sm text-muted-foreground">{formatWhenLabel(lesson.starts_at)}</p>
    </div>
  );
}

function HomeworkPreview({ homework }: { homework: Homework }) {
  return (
    <div className="rounded-md border bg-secondary/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{homework.title}</p>
        <HomeworkStatusBadge status={homework.status} />
      </div>
      {homework.due_at ? (
        <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(homework.due_at)}</p>
      ) : null}
    </div>
  );
}

function UnreadMessagePreview({ count }: { count: number }) {
  return (
    <div className="rounded-md border bg-primary/10 p-3 text-primary">
      <p className="text-sm font-semibold">{t.chat.newMessage}</p>
      <p className="mt-1 text-sm">{t.chat.unreadCount(count)}</p>
    </div>
  );
}

function MessagePreview({ message }: { message: ChatMessage }) {
  const sender = message.sender === "tutor" ? t.chat.senderTutor : t.chat.senderStudent;
  const preview = message.body || message.attachment_name || t.chat.attachment;

  return (
    <div className="rounded-md border bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{sender}</span>
        <span>{formatDateTime(message.created_at)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm">{preview}</p>
    </div>
  );
}

function MutedLine({ text }: { text: string }) {
  return (
    <p className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">{text}</p>
  );
}
