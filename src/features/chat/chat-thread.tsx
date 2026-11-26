"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CharacterCounter } from "@/components/character-counter";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date";
import { t } from "@/lib/i18n";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CHAT_FILE_MAX_BYTES, CHAT_MESSAGE_MAX } from "./schema";
import type { ChatFormState } from "./actions";
import type { ChatMessage } from "./queries";

type ChatAction = (prev: ChatFormState, formData: FormData) => Promise<ChatFormState>;

interface ChatThreadProps {
  title: string;
  subtitle?: string | null;
  messages: ChatMessage[];
  currentSender: ChatMessage["sender"];
  action: ChatAction;
  draftKey: string;
  realtimeStudentId?: string;
  compact?: boolean;
  headerStartAction?: ReactNode;
  headerAction?: ReactNode;
  readKey?: string;
  markReadAction?: () => Promise<void>;
}

const initialState: ChatFormState = {};
const TEXTAREA_MAX_HEIGHT = 160;
const draftStorageKey = (key: string) => `tutorOS.chatDraft.${key}`;

export function ChatThread({
  title,
  subtitle,
  messages,
  currentSender,
  action,
  draftKey,
  realtimeStudentId,
  compact,
  headerStartAction,
  headerAction,
  readKey,
  markReadAction,
}: ChatThreadProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const skipNextDraftSaveRef = useRef(false);
  const markReadRef = useRef(markReadAction);
  const canSend = body.trim().length > 0 || !!fileName;
  const unreadSignature = useMemo(
    () =>
      messages
        .filter((message) => message.sender !== currentSender && !message.read_at)
        .map((message) => message.id)
        .join(":"),
    [currentSender, messages],
  );

  useEffect(() => {
    const saved = window.sessionStorage.getItem(draftStorageKey(draftKey)) ?? "";
    skipNextDraftSaveRef.current = true;
    setBody(saved);
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [draftKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }
    window.sessionStorage.setItem(draftStorageKey(draftKey), body);
  }, [body, draftKey]);

  useEffect(() => {
    markReadRef.current = markReadAction;
  }, [markReadAction]);

  useEffect(() => {
    if (!readKey || !unreadSignature || !markReadRef.current) return;
    let cancelled = false;
    markReadRef.current().then(() => {
      if (!cancelled) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [readKey, router, unreadSignature]);

  useEffect(() => {
    if (!realtimeStudentId) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`chat-message:${realtimeStudentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message",
          filter: `student_id=eq.${realtimeStudentId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [realtimeStudentId, router]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, [body]);

  useEffect(() => {
    if (!state.sentAt) return;
    setBody("");
    window.sessionStorage.removeItem(draftStorageKey(draftKey));
    setFileName(null);
    setFileError(null);
    formRef.current?.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    bottomRef.current?.scrollIntoView({ block: "end" });
    router.refresh();
  }, [draftKey, router, state.sentAt]);

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!pending && canSend) formRef.current?.requestSubmit();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) {
      setFileName(null);
      return;
    }

    if (file.size > CHAT_FILE_MAX_BYTES) {
      event.target.value = "";
      setFileName(null);
      setFileError(t.chat.fileTooLarge);
      return;
    }

    setFileName(file.name);
  }

  function clearFile() {
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card",
        compact ? "min-h-[480px]" : "h-full min-h-0",
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {headerStartAction}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {messages.length}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-secondary/30 px-3 py-4 sm:px-5">
        {messages.length === 0 ? (
          <EmptyState
            title={t.chat.emptyTitle}
            description={t.chat.emptyDescription}
            icon={<MessageCircle className="size-5" />}
            className="border-border bg-card/70"
          />
        ) : (
          <ol className="space-y-3">
            {messages.map((message) => {
              const own = message.sender === currentSender;
              return (
                <li key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[84%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[72%]",
                      own
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card text-card-foreground",
                    )}
                  >
                    {message.body ? (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {message.body}
                      </p>
                    ) : null}
                    {message.attachment_path ? (
                      <ChatAttachment message={message} own={own} />
                    ) : null}
                    <p
                      className={cn(
                        "mt-1 text-[11px] tabular-nums",
                        own ? "text-primary-foreground/75" : "text-muted-foreground",
                      )}
                    >
                      {message.sender === "tutor" ? t.chat.senderTutor : t.chat.senderStudent} ·{" "}
                      {formatDateTime(message.created_at)}
                      {own ? <ReadReceipt read={Boolean(message.read_at)} /> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      <form ref={formRef} action={formAction} className="border-t bg-card p-3">
        <input
          ref={fileInputRef}
          name="attachment"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          aria-label={t.chat.attachFile}
        />

        {fileName ? (
          <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-md border bg-secondary px-2.5 py-1.5 text-xs">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{fileName}</span>
            <button
              type="button"
              onClick={clearFile}
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t.chat.removeFile}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 left-2 z-10 size-8"
            aria-label={t.chat.attachFile}
          >
            <Paperclip className="size-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder={t.chat.placeholder}
            maxLength={CHAT_MESSAGE_MAX}
            rows={1}
            className="min-h-12 resize-none overflow-hidden py-3 pl-12 pr-12"
            aria-label={t.chat.placeholder}
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || !canSend}
            className="absolute bottom-2 right-2 z-10 size-8"
            aria-label={t.chat.send}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {fileError || state.error ? (
            <p role="alert" className="text-xs text-destructive">
              {fileError || state.error}
            </p>
          ) : (
            <span className="text-xs text-muted-foreground">{t.chat.sendHint}</span>
          )}
          <CharacterCounter value={body.length} max={CHAT_MESSAGE_MAX} />
        </div>
      </form>
    </section>
  );
}

function ReadReceipt({ read }: { read: boolean }) {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
      {read ? <CheckCheck className="size-3" /> : <Check className="size-3" />}
      <span>{read ? t.chat.read : t.chat.sentStatus}</span>
    </span>
  );
}

function ChatAttachment({ message, own }: { message: ChatMessage; own: boolean }) {
  const label = message.attachment_name || t.chat.attachment;
  const content = (
    <>
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {message.attachment_size ? (
        <span className="shrink-0 text-[11px] opacity-75">
          {formatFileSize(message.attachment_size)}
        </span>
      ) : null}
      {message.attachmentSignedUrl ? <Download className="size-4 shrink-0" /> : null}
    </>
  );

  const className = cn(
    "mt-2 flex max-w-full items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors",
    own
      ? "border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15"
      : "border-border bg-secondary hover:bg-accent",
  );

  return message.attachmentSignedUrl ? (
    <a
      href={message.attachmentSignedUrl}
      target="_blank"
      rel="noreferrer"
      className={className}
      aria-label={t.chat.openAttachment}
    >
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} КБ`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
}
