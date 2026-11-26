"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { Lesson } from "../queries";
import { LessonDetailInner } from "./detail-inner";

/**
 * The hub modal for a single lesson: view details + linked homework, edit /
 * reschedule, complete (with topic/note/homework) and cancel / delete. The
 * `children` element is the trigger (a button/chip). Inner content mounts only
 * while open, so every open starts from a clean form state.
 */
export function LessonDetailDialog({
  lesson,
  studentName,
  children,
}: {
  lesson: Lesson;
  studentName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        {open ? (
          <LessonDetailInner
            lesson={lesson}
            studentName={studentName}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
