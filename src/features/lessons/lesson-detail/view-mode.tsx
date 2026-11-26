"use client";

import * as React from "react";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  Check,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/date";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HomeworkStatusBadge } from "@/features/homework/homework-status-badge";
import { LessonStatusBadge } from "../lesson-status-badge";
import type { Lesson, LessonDetail } from "../queries";
import {
  cancelLessonAction,
  cancelSeriesAction,
  deleteLessonAction,
  deleteSeriesAction,
  markNoShowAction,
  reopenLessonAction,
  type SeriesScope,
  type SeriesTarget,
} from "../actions";
import { LowBalanceBanner, type Confirmable } from "./parts";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

type SecondaryLessonAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
};

export function ViewMode({
  lesson,
  studentName,
  detail,
  onEdit,
  onReschedule,
  onComplete,
  onClose,
}: {
  lesson: Lesson;
  studentName?: string;
  detail: LessonDetail | null;
  onEdit: () => void;
  onReschedule: () => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [scopePrompt, setScopePrompt] = React.useState<null | "cancel" | "delete">(null);
  const [confirm, setConfirm] = React.useState<null | Confirmable>(null);
  const [noShowBanner, setNoShowBanner] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isSeries = Boolean(lesson.series_id);

  function seriesTarget(): SeriesTarget {
    return {
      id: lesson.id,
      studentId: lesson.student_id,
      seriesId: lesson.series_id ?? "",
      startsAt: lesson.starts_at,
    };
  }

  function runScoped(action: "cancel" | "delete", scope: SeriesScope) {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "cancel") await cancelSeriesAction(seriesTarget(), scope);
        else await deleteSeriesAction(seriesTarget(), scope);
        onClose();
      } catch (e) {
        // Surface the failure inline instead of letting the throw reach the
        // route error boundary and tear down the whole page.
        setError(e instanceof Error ? e.message : t.common.errorTitle);
      }
    });
  }

  function runConfirmed(kind: Confirmable) {
    setError(null);
    startTransition(async () => {
      try {
        if (kind === "cancel") {
          await cancelLessonAction(lesson.id, lesson.student_id);
          onClose();
        } else if (kind === "delete") {
          await deleteLessonAction(lesson.id, lesson.student_id);
          onClose();
        } else if (kind === "reopen") {
          const res = await reopenLessonAction(lesson.id, lesson.student_id);
          if (res.error) setError(res.error);
          else onClose();
        } else {
          const res = await markNoShowAction(lesson.id, lesson.student_id);
          if (res.error) {
            setError(res.error);
          } else if (res.lowBalance) {
            setConfirm(null);
            setNoShowBanner(res.lessonsLeft ?? 0);
          } else {
            onClose();
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t.common.errorTitle);
      }
    });
  }

  function askCancel() {
    if (isSeries) return setScopePrompt("cancel");
    setConfirm("cancel");
  }
  function askDelete() {
    if (isSeries) return setScopePrompt("delete");
    setConfirm("delete");
  }

  const secondaryActions: SecondaryLessonAction[] =
    lesson.status === "scheduled"
      ? [
          { label: t.lessons.cancel, icon: Ban, onSelect: askCancel },
          { label: t.lessons.noShow, icon: UserX, onSelect: () => setConfirm("noShow") },
          { label: t.common.delete, icon: Trash2, onSelect: askDelete, destructive: true },
        ]
      : lesson.status === "canceled"
        ? [{ label: t.common.delete, icon: Trash2, onSelect: askDelete, destructive: true }]
        : [{ label: t.lessons.reopen, icon: RotateCcw, onSelect: () => setConfirm("reopen") }];

  // No-show pushed the balance low — surface the warning, then close.
  if (noShowBanner !== null) {
    return (
      <div className="space-y-4">
        <LowBalanceBanner lessonsLeft={noShowBanner} />
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={onClose}>{t.common.close}</Button>
          </DialogClose>
        </DialogFooter>
      </div>
    );
  }

  const confirmMessage =
    confirm === "cancel"
      ? t.lessons.cancelConfirm
      : confirm === "delete"
        ? t.lessons.deleteConfirm
        : confirm === "reopen"
          ? t.lessons.reopenConfirm
          : t.lessons.noShowConfirm;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{formatDateTime(lesson.starts_at)}</p>
        <div className="flex items-center gap-2">
          {isSeries ? <Badge variant="secondary">{t.lessons.recurrence.seriesBadge}</Badge> : null}
          <LessonStatusBadge status={lesson.status} />
        </div>
      </div>

      <div className="space-y-1.5 rounded-md border p-3">
        {studentName ? (
          <Row
            label={t.lessons.fields.student}
            value={
              <Link
                href={`/students/${lesson.student_id}?tab=lessons`}
                className="text-primary hover:underline"
              >
                {studentName}
              </Link>
            }
          />
        ) : null}
        <Row
          label={t.lessons.fields.duration}
          value={`${lesson.duration_min} ${t.lessons.durationUnit}`}
        />
        <Row label={t.students.balance} value={detail?.lessonsLeft ?? "—"} />
        {lesson.topic ? <Row label={t.lessons.fields.topic} value={lesson.topic} /> : null}
      </div>

      {lesson.note ? (
        <div>
          <p className="text-sm font-medium">{t.lessons.fields.note}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{lesson.note}</p>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-medium">{t.lessons.linkedHomework}</p>
        {detail && detail.homework.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {detail.homework.map((hw) => (
              <li key={hw.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{hw.title}</span>
                <HomeworkStatusBadge status={hw.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t.lessons.noLinkedHomework}</p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {scopePrompt ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t.lessons.recurrence.scopeTitle}</p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={pending}
              onClick={() => runScoped(scopePrompt, "one")}
            >
              {t.lessons.recurrence.scopeOne}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={pending}
              onClick={() => runScoped(scopePrompt, "future")}
            >
              {t.lessons.recurrence.scopeFuture}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={pending}
              onClick={() => runScoped(scopePrompt, "all")}
            >
              {t.lessons.recurrence.scopeAll}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            disabled={pending}
            onClick={() => setScopePrompt(null)}
          >
            {t.common.cancel}
          </Button>
        </div>
      ) : confirm ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm">{confirmMessage}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              disabled={pending}
              onClick={() => setConfirm(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant={confirm === "delete" ? "destructive" : "default"}
              size="sm"
              className="min-h-11"
              disabled={pending}
              onClick={() => runConfirmed(confirm)}
            >
              {t.common.confirm}
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className="flex-row flex-wrap items-center gap-2 sm:justify-normal">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground"
                disabled={pending}
                aria-label={t.common.moreActions}
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {secondaryActions.map(({ label, icon: Icon, onSelect, destructive }) => (
                <DropdownMenuItem
                  key={label}
                  onSelect={onSelect}
                  className={cn(destructive && "text-destructive focus:text-destructive")}
                >
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {lesson.status === "scheduled" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onEdit}
                disabled={pending}
              >
                <Pencil className="size-4" />
                {t.lessons.edit}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onReschedule}
                disabled={pending}
              >
                <CalendarClock className="size-4" />
                {t.lessons.reschedule}
              </Button>
              <Button size="sm" className="flex-1" onClick={onComplete} disabled={pending}>
                <Check className="size-4" />
                {t.lessons.complete}
              </Button>
            </>
          ) : lesson.status === "canceled" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onEdit}
                disabled={pending}
              >
                <Pencil className="size-4" />
                {t.lessons.edit}
              </Button>
              <Button size="sm" className="flex-1" onClick={onReschedule} disabled={pending}>
                <CalendarClock className="size-4" />
                {t.lessons.reschedule}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onEdit}
              disabled={pending}
            >
              <Pencil className="size-4" />
              {t.lessons.edit}
            </Button>
          )}
        </DialogFooter>
      )}
    </div>
  );
}
