"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Controlled modal wrapper for short create/edit forms. Standardises the trigger
 * → blurred overlay → titled card flow so every "add" form behaves identically
 * (focus-trap, ESC, click-outside, scroll-lock come from the Dialog primitive).
 * The caller owns `open` so it can collapse the modal on a successful submit.
 * `trigger` is optional — omit it to open the dialog purely from external state
 * (e.g. a dropdown-menu item), avoiding a Radix `asChild` child.
 * See docs/DESIGN.md → «Всплывающие окна».
 */
export function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
