import { notFound } from "next/navigation";
import { getShareView } from "@/features/share/queries";
import { ShareHeader } from "@/features/share/share-header";
import { ScheduleSection } from "@/features/share/schedule-section";
import { HomeworkSection } from "@/features/share/homework-section";
import { ShareOverview } from "@/features/share/share-overview";
import { ShareRealtimeRefresh } from "@/features/share/share-realtime-refresh";
import { isShareTab, ShareTabs } from "@/features/share/share-tabs";
import { ChatThread } from "@/features/chat/chat-thread";
import { markStudentChatReadAction, sendStudentChatMessageAction } from "@/features/chat/actions";
import { cn } from "@/lib/utils";
import { revealUp } from "@/lib/styles";
import { t } from "@/lib/i18n";

// No-login student/parent page. Access is via the unguessable share_token only.
export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const view = await getShareView(token);
  if (!view) notFound();

  const assignedHomeworkCount = view.homework.filter((hw) => hw.status === "assigned").length;
  const activeTab = isShareTab(query.tab) ? query.tab : "overview";
  const tabCounts = {
    schedule: view.todayLessonsCount,
    chat: view.unreadChatCount,
    homework: assignedHomeworkCount,
  };

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      <ShareRealtimeRefresh />
      <ShareTabs
        activeTab={activeTab}
        token={token}
        counts={tabCounts}
        studentName={view.studentName}
      />

      <div className="min-w-0 flex-1">
        <ShareHeader
          studentName={view.studentName}
          subject={view.subject}
          tutorName={view.tutorName}
          lessonsLeft={view.lessonsLeft}
        />

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12 xl:px-10">
          <div className={cn("min-w-0", revealUp, "delay-75")}>
            {activeTab === "overview" ? <ShareOverview view={view} token={token} /> : null}
            {activeTab === "schedule" ? <ScheduleSection lessons={view.upcomingLessons} /> : null}
            {activeTab === "chat" ? (
              <ChatThread
                title={t.chat.title}
                subtitle={view.tutorName ? `${t.share.tutorLabel}: ${view.tutorName}` : null}
                messages={view.chatMessages}
                currentSender="student"
                action={sendStudentChatMessageAction.bind(null, token)}
                draftKey={`student:${token}`}
                realtimeStudentId={view.studentId}
                readKey={`student:${token}`}
                markReadAction={markStudentChatReadAction.bind(null, token)}
                compact
              />
            ) : null}
            {activeTab === "homework" ? (
              <HomeworkSection homework={view.homework} token={token} />
            ) : null}
          </div>
        </main>

        <footer
          className={cn(
            "mx-auto max-w-5xl px-4 pb-28 text-center text-xs text-muted-foreground lg:px-8 lg:pb-10 xl:px-10",
            revealUp,
            "delay-150",
          )}
        >
          {t.share.footerNote}
        </footer>
      </div>
    </div>
  );
}
