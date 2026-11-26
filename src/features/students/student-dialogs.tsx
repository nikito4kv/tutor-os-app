"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/form-dialog";
import { t } from "@/lib/i18n";
import { createStudentAction, updateStudentAction } from "./actions";
import { StudentForm } from "./student-form";
import type { Student } from "./queries";

/** "Add student" trigger + modal. A successful submit redirects to the new card. */
export function CreateStudentDialog() {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.students.newStudent}
      trigger={
        <Button data-onboarding-target="add-student">
          <Plus className="size-4" />
          {t.students.addStudent}
        </Button>
      }
    >
      <StudentForm action={createStudentAction} />
    </FormDialog>
  );
}

/**
 * "Edit" trigger + modal on a student card. A successful submit redirects back.
 * Pass a custom `trigger` to open the same edit modal from elsewhere (e.g. the
 * overview's "add contact" affordance); defaults to the outline "Edit" button.
 */
export function EditStudentDialog({
  student,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  student: Student;
  trigger?: ReactNode;
  /** Controlled mode: drive open from outside (e.g. a dropdown-menu item). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setUncontrolledOpen;
  const action = updateStudentAction.bind(null, student.id);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.students.editStudent}
      trigger={
        isControlled
          ? undefined
          : (trigger ?? (
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                {t.common.edit}
              </Button>
            ))
      }
    >
      <StudentForm action={action} student={student} />
    </FormDialog>
  );
}
