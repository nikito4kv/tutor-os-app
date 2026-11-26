"use client";

import { useActionState, useState, useTransition } from "react";
import { KeyRound, Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/form-dialog";
import { EMAIL_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  deleteTutorAction,
  sendTutorPasswordResetAction,
  updateTutorEmailAction,
  updateTutorProfileAction,
  type AdminFormState,
} from "./actions";
import type { AdminTutor } from "./queries";

const initial: AdminFormState = {};

/** Действия админа над аккаунтом репетитора: профиль, email, сброс пароля, удаление. */
export function TutorAdminPanel({ tutor }: { tutor: AdminTutor }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function resetPassword() {
    setNotice(null);
    startTransition(async () => {
      const res = await sendTutorPasswordResetAction(tutor.email);
      setNotice(
        res.ok
          ? { kind: "ok", text: t.admin.tutorDetail.resetPasswordSent }
          : { kind: "error", text: res.error ?? t.common.errorTitle },
      );
    });
  }

  function deleteTutor() {
    if (!window.confirm(t.admin.tutorDetail.deleteConfirm)) return;
    setNotice(null);
    startTransition(async () => {
      const res = await deleteTutorAction(tutor.id);
      if (res?.error) setNotice({ kind: "error", text: res.error });
    });
  }

  return (
    <div className="space-y-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            <MoreHorizontal className="size-4" />
            {t.admin.tutorDetail.actions}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setProfileOpen(true);
            }}
          >
            <Pencil />
            {t.admin.tutorDetail.editProfile}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEmailOpen(true);
            }}
          >
            <Mail />
            {t.admin.tutorDetail.changeEmail}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              resetPassword();
            }}
            disabled={pending}
          >
            <KeyRound />
            {t.admin.tutorDetail.resetPassword}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              deleteTutor();
            }}
            disabled={pending}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            {t.admin.tutorDetail.deleteTutor}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {notice ? (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            notice.kind === "ok"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <FormDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title={t.admin.tutorDetail.editProfileTitle}
      >
        <ProfileForm tutor={tutor} />
      </FormDialog>

      <FormDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title={t.admin.tutorDetail.changeEmailTitle}
        description={t.admin.tutorDetail.changeEmailHint}
      >
        <EmailForm tutor={tutor} />
      </FormDialog>
    </div>
  );
}

function ProfileForm({ tutor }: { tutor: AdminTutor }) {
  const action = updateTutorProfileAction.bind(null, tutor.id);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      <PanelField id="name" label={t.admin.tutorDetail.fields.name} defaultValue={tutor.name} />
      <PanelField
        id="currency"
        label={t.admin.tutorDetail.fields.currency}
        defaultValue={tutor.currency}
        maxLength={8}
        required
      />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t.common.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EmailForm({ tutor }: { tutor: AdminTutor }) {
  const action = updateTutorEmailAction.bind(null, tutor.id);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      <PanelField
        id="email"
        type="email"
        label={t.admin.tutorDetail.fields.email}
        defaultValue={tutor.email}
        maxLength={EMAIL_MAX}
        required
      />
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t.common.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PanelField({
  id,
  label,
  defaultValue,
  required,
  type = "text",
  maxLength = SHORT_TEXT_MAX,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
      />
    </div>
  );
}
