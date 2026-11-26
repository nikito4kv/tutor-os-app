"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditStudentDialog } from "./student-dialogs";
import type { Student } from "./queries";
import { t } from "@/lib/i18n";

/**
 * Overflow "···" menu for the student card header — keeps the low-frequency
 * "edit" and the destructive "delete" out of the header's primary slot (now the
 * "add lesson" action). Edit opens a controlled <EditStudentDialog> rendered as
 * a sibling, not nested in a menu item, to avoid Radix's dialog-in-menu focus
 * clash. Copying the share link keeps the menu open so the ✓ feedback is
 * visible; delete confirms first.
 */
export function StudentActionsMenu({
  student,
  shareUrl,
  deleteAction,
}: {
  student: Student;
  shareUrl: string;
  deleteAction: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onDelete() {
    if (!window.confirm(t.students.deleteConfirm)) return;
    startTransition(() => {
      void deleteAction();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.students.actionsMenu}
            disabled={pending}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEditOpen(true);
            }}
          >
            <Pencil />
            {t.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void copy();
            }}
          >
            {copied ? <Check /> : <Copy />}
            {t.students.copyLink}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onDelete}
            disabled={pending}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditStudentDialog student={student} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
