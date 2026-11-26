"use client";

import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import type { ChatConversation } from "./queries";

interface MobileConversationDrawerProps {
  conversations: ChatConversation[];
  selectedId: string;
}

export function MobileConversationDrawer({
  conversations,
  selectedId,
}: MobileConversationDrawerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? conversations.filter((conversation) =>
            [conversation.studentName, conversation.subject ?? ""].some((value) =>
              value.toLowerCase().includes(normalizedQuery),
            ),
          )
        : conversations,
    [conversations, normalizedQuery],
  );
  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="-ml-2 size-10 shrink-0 lg:hidden"
        aria-label={t.chat.openStudentList}
      >
        <Menu className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label={t.common.close}
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-[min(86vw,22rem)] flex-col border-r bg-card shadow-lg duration-200 animate-in slide-in-from-left-4 motion-reduce:animate-none">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.chat.studentList}</p>
                <p className="text-xs text-muted-foreground">
                  {totalUnread > 0
                    ? t.chat.unreadCount(totalUnread)
                    : t.chat.conversationCount(conversations.length)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.chat.searchStudents}
                  className="pl-9"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {filtered.map((conversation) => {
                const active = conversation.studentId === selectedId;
                return (
                  <Link
                    key={conversation.studentId}
                    href={`/messages?student=${conversation.studentId}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 transition-colors",
                      focusRing,
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(conversation.studentName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {conversation.studentName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {conversation.lastMessage?.body ||
                          conversation.lastMessage?.attachment_name ||
                          conversation.subject ||
                          t.chat.noMessagesYet}
                      </span>
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <Badge className="shrink-0 px-2" variant="default">
                        {conversation.unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
