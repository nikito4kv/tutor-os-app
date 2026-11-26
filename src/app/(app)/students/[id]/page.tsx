import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStudent,
  getStudentTabCounts,
  getStudentOverview,
  type StudentOverview as StudentOverviewData,
} from "@/features/students/queries";
import { deleteStudentAction } from "@/features/students/actions";
import { StudentActionsMenu } from "@/features/students/student-actions-menu";
import { StudentOverview } from "@/features/students/student-overview";
import { StudentVitals } from "@/features/students/student-vitals";
import { getStudentBalance, listPackages, type Package } from "@/features/packages/queries";
import { AddPackage } from "@/features/packages/add-package";
import { DeletePackageButton } from "@/features/packages/delete-package-button";
import { deletePackageAction } from "@/features/packages/actions";
import { listPayments, type Payment } from "@/features/payments/queries";
import { AddPayment } from "@/features/payments/add-payment";
import { DeletePaymentButton } from "@/features/payments/delete-payment-button";
import { deletePaymentAction } from "@/features/payments/actions";
import {
  listUpcomingLessons,
  listLessonHistory,
  listLessonOptions,
  type Lesson,
} from "@/features/lessons/queries";
import { AddLesson } from "@/features/lessons/add-lesson";
import { LessonList } from "@/features/lessons/lesson-list";
import { listHomeworksByStudent, type Homework } from "@/features/homework/queries";
import { AddHomework } from "@/features/homework/add-homework";
import { HomeworkList } from "@/features/homework/homework-list";
import { ChatThread } from "@/features/chat/chat-thread";
import { markTutorChatReadAction, sendTutorChatMessageAction } from "@/features/chat/actions";
import { getChatThread, type ChatThread as ChatThreadData } from "@/features/chat/queries";
import { isHomeworkOverdue } from "@/features/homework/deadline";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { env } from "@/lib/config";
import { t } from "@/lib/i18n";
import { getCurrentTutor } from "@/lib/auth";
import { formatMoney, isCurrencyCode, DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";

const TABS = [
  { key: "overview", label: t.students.tabs.overview },
  { key: "packages", label: t.students.tabs.packages },
  { key: "lessons", label: t.students.tabs.lessons },
  { key: "homework", label: t.students.tabs.homework },
  { key: "chat", label: t.students.tabs.chat },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function StudentCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((x) => x.key === tab) ? (tab as TabKey) : "overview";

  const student = await getStudent(id);
  if (!student) notFound();

  // Balance + tab-badge counts are shown on every tab; the rest of each tab's
  // data loads only when that tab is active.
  const [lessonsLeft, tabCounts] = await Promise.all([
    getStudentBalance(id),
    getStudentTabCounts(id),
  ]);
  const lowBalance = lessonsLeft <= LOW_BALANCE_THRESHOLD;
  const subtitle = [student.subject, student.level].filter(Boolean).join(" · ");
  const shareUrl = `${env.appUrl}/s/${student.share_token}`;

  let overview: StudentOverviewData | null = null;
  let packages: Package[] = [];
  let payments: Payment[] = [];
  let currency: CurrencyCode = DEFAULT_CURRENCY;
  let upcoming: Lesson[] = [];
  let history: Lesson[] = [];
  let homework: Homework[] = [];
  let lessonOptions: Pick<Lesson, "id" | "starts_at" | "topic" | "status">[] = [];
  let chatThread: ChatThreadData | null = null;

  if (activeTab === "overview") {
    overview = await getStudentOverview(id);
  } else if (activeTab === "packages") {
    const [pkgs, pays, tutor] = await Promise.all([
      listPackages(id),
      listPayments(id),
      getCurrentTutor(),
    ]);
    packages = pkgs;
    payments = pays;
    currency = isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY;
  } else if (activeTab === "lessons") {
    [upcoming, history] = await Promise.all([listUpcomingLessons(id), listLessonHistory(id)]);
  } else if (activeTab === "homework") {
    [homework, lessonOptions] = await Promise.all([
      listHomeworksByStudent(id),
      listLessonOptions(id),
    ]);
  } else if (activeTab === "chat") {
    chatThread = await getChatThread(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{student.name}</h1>
          {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AddLesson studentId={id} lessonsLeft={lessonsLeft} />
          <StudentActionsMenu
            student={student}
            shareUrl={shareUrl}
            deleteAction={deleteStudentAction.bind(null, id)}
          />
        </div>
      </div>

      {/* Vital signs: balance hero + inline top-up when low */}
      <StudentVitals studentId={id} lessonsLeft={lessonsLeft} lowBalance={lowBalance} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/students/${id}?tab=${x.key}`}
            data-onboarding-target={`student-tab-${x.key}`}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-sm border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              focusRing,
              x.key === activeTab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {x.label}
            {x.key === "lessons" && tabCounts.upcoming > 0 ? (
              <Badge variant="secondary">{tabCounts.upcoming}</Badge>
            ) : null}
            {x.key === "homework" && tabCounts.homeworkToReview > 0 ? (
              <Badge variant="secondary">{tabCounts.homeworkToReview}</Badge>
            ) : null}
          </Link>
        ))}
      </div>

      {activeTab === "overview" && overview ? (
        <StudentOverview
          studentId={id}
          student={student}
          shareUrl={shareUrl}
          lessonsLeft={lessonsLeft}
          homeworkToReview={tabCounts.homeworkToReview}
          overview={overview}
        />
      ) : null}
      {activeTab === "packages" ? (
        <PackagesTab studentId={id} packages={packages} payments={payments} currency={currency} />
      ) : null}
      {activeTab === "lessons" ? (
        <LessonsTab
          studentId={id}
          upcoming={upcoming}
          history={history}
          lessonsLeft={lessonsLeft}
        />
      ) : null}
      {activeTab === "homework" ? (
        <HomeworkTab studentId={id} homework={homework} lessonOptions={lessonOptions} />
      ) : null}
      {activeTab === "chat" && chatThread ? <ChatTab thread={chatThread} /> : null}
    </div>
  );
}

function LessonsTab({
  studentId,
  upcoming,
  history,
  lessonsLeft,
}: {
  studentId: string;
  upcoming: Lesson[];
  history: Lesson[];
  lessonsLeft: number;
}) {
  // Seed the next lesson's date from the latest known lesson: furthest upcoming,
  // else the most recent past one (history is newest-first).
  const lastLessonAt = upcoming.at(-1)?.starts_at ?? history.at(0)?.starts_at;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t.lessons.upcoming}</h2>
            {upcoming.length > 0 ? <Badge variant="secondary">{upcoming.length}</Badge> : null}
          </div>
          <AddLesson studentId={studentId} lessonsLeft={lessonsLeft} lastLessonAt={lastLessonAt} />
        </div>
        {upcoming.length === 0 ? (
          <EmptyState title={t.common.emptyDefault} description={t.lessons.empty} />
        ) : (
          <LessonList lessons={upcoming} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t.lessons.history}</h2>
          {history.length > 0 ? <Badge variant="secondary">{history.length}</Badge> : null}
        </div>
        {history.length === 0 ? (
          <EmptyState title={t.common.emptyDefault} description={t.lessons.historyEmpty} />
        ) : (
          <LessonList lessons={history} order="desc" />
        )}
      </section>
    </div>
  );
}

function ChatTab({ thread }: { thread: ChatThreadData }) {
  return (
    <ChatThread
      title={thread.studentName}
      subtitle={thread.subject}
      messages={thread.messages}
      currentSender="tutor"
      action={sendTutorChatMessageAction.bind(null, thread.studentId)}
      draftKey={`tutor:${thread.studentId}`}
      realtimeStudentId={thread.studentId}
      readKey={`tutor:${thread.studentId}`}
      markReadAction={markTutorChatReadAction.bind(null, thread.studentId)}
      compact
    />
  );
}

function HomeworkTab({
  studentId,
  homework,
  lessonOptions,
}: {
  studentId: string;
  homework: Homework[];
  lessonOptions: Pick<Lesson, "id" | "starts_at" | "topic" | "status">[];
}) {
  // Surface what needs the tutor: submitted (to review) + overdue assignments.
  const now = Date.now();
  const attention = homework.filter(
    (h) => h.status === "submitted" || isHomeworkOverdue(h.due_at, h.status, now),
  );
  const attentionIds = new Set(attention.map((h) => h.id));
  const rest = homework.filter((h) => !attentionIds.has(h.id));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t.homework.title}</h2>
        <AddHomework studentId={studentId} lessons={lessonOptions} />
      </div>
      {homework.length === 0 ? (
        <HomeworkList studentId={studentId} homework={homework} />
      ) : (
        <div className="space-y-6">
          {attention.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t.homework.needsAttention}
                </h3>
                <Badge variant="secondary">{attention.length}</Badge>
              </div>
              <HomeworkList studentId={studentId} homework={attention} />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t.homework.others}</h3>
                <Badge variant="secondary">{rest.length}</Badge>
              </div>
              <HomeworkList studentId={studentId} homework={rest} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PackagesTab({
  studentId,
  packages,
  payments,
  currency,
}: {
  studentId: string;
  packages: Package[];
  payments: Payment[];
  currency: CurrencyCode;
}) {
  const purchased = packages.reduce((sum, p) => sum + p.total_lessons, 0);
  const remaining = packages.reduce((sum, p) => sum + p.lessons_left, 0);
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold">{t.packages.title}</h2>
          <AddPackage studentId={studentId} />
        </div>
        {packages.length === 0 ? (
          <EmptyState title={t.common.emptyDefault} description={t.packages.empty} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.packages.purchasedTotal}: {purchased} {t.packages.lessonsUnit} ·{" "}
              {t.packages.remainingTotal}: {remaining} {t.packages.lessonsUnit}
            </p>
            <ul className="divide-y rounded-md border">
              {packages.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {p.lessons_left} {t.packages.of} {p.total_lessons} {t.packages.lessonsUnit}
                      </p>
                      {p.price != null ? (
                        <p className="text-sm text-muted-foreground">
                          {formatMoney(p.price, currency)}
                        </p>
                      ) : null}
                    </div>
                    <DeletePackageButton action={deletePackageAction.bind(null, studentId, p.id)} />
                  </div>
                  {p.total_lessons > 0 ? (
                    <Progress
                      value={((p.total_lessons - p.lessons_left) / p.total_lessons) * 100}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold">{t.payments.title}</h2>
          <AddPayment studentId={studentId} />
        </div>
        {payments.length === 0 ? (
          <EmptyState title={t.common.emptyDefault} description={t.payments.empty} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t.payments.paidTotal}: {formatMoney(paidTotal, currency)}
            </p>
            <ul className="divide-y rounded-md border">
              {payments.map((pay) => (
                <li
                  key={pay.id}
                  className="flex flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatMoney(pay.amount, currency)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(pay.paid_at)}
                      {pay.note ? ` · ${pay.note}` : ""}
                    </p>
                  </div>
                  <DeletePaymentButton action={deletePaymentAction.bind(null, studentId, pay.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
