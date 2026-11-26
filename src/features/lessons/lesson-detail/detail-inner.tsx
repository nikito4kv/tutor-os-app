"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/error-state";
import { t } from "@/lib/i18n";
import type { Lesson, LessonDetail } from "../queries";
import { loadLessonDetailAction } from "../actions";
import { ModeSkeleton, type Mode } from "./parts";
import { ViewMode } from "./view-mode";

// `view` is the default face, so it stays in the modal's own chunk. The
// form-heavy modes (each pulls date/time fields, color picker or file upload)
// load on demand the first time the tutor switches into them.
const EditMode = dynamic(() => import("./edit-mode").then((m) => m.EditMode), {
  loading: () => <ModeSkeleton />,
});
const RescheduleMode = dynamic(() => import("./reschedule-mode").then((m) => m.RescheduleMode), {
  loading: () => <ModeSkeleton />,
});
const CompleteMode = dynamic(() => import("./complete-mode").then((m) => m.CompleteMode), {
  loading: () => <ModeSkeleton />,
});

export function LessonDetailInner({
  lesson,
  studentName,
  onClose,
}: {
  lesson: Lesson;
  studentName?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = React.useState<Mode>("view");
  const [detail, setDetail] = React.useState<LessonDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    loadLessonDetailAction(lesson.id)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lesson.id]);

  const title =
    mode === "reschedule"
      ? t.lessons.rescheduleTitle
      : mode === "edit"
        ? t.lessons.editTitle
        : mode === "complete"
          ? t.lessons.completeTitle
          : t.lessons.detailsTitle;

  const notFound = !loading && !loadError && detail === null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      {loadError ? (
        <ErrorState title={t.lessons.loadError} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : notFound ? (
        <ErrorState title={t.lessons.notFound} />
      ) : mode === "edit" ? (
        <EditMode lesson={lesson} onDone={onClose} onCancel={() => setMode("view")} />
      ) : mode === "reschedule" ? (
        <RescheduleMode lesson={lesson} onDone={onClose} onCancel={() => setMode("view")} />
      ) : mode === "complete" ? (
        <CompleteMode lesson={lesson} lessonsLeft={detail?.lessonsLeft ?? 0} onClose={onClose} />
      ) : (
        <ViewMode
          lesson={lesson}
          studentName={detail?.studentName ?? studentName}
          detail={detail}
          onEdit={() => setMode("edit")}
          onReschedule={() => setMode("reschedule")}
          onComplete={() => setMode("complete")}
          onClose={onClose}
        />
      )}
    </>
  );
}
