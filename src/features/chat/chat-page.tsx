import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { markTutorChatReadAction, sendTutorChatMessageAction } from "@/features/chat/actions";
import { formatDateTime } from "@/lib/date";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { cn, initials } from "@/lib/utils";
import { ChatThread } from "./chat-thread";
import { MobileConversationDrawer } from "./mobile-conversation-drawer";
import type { ChatConversation, ChatThread as ChatThreadData } from "./queries";

interface ChatPageProps {
  conversations: ChatConversation[];
  selected: ChatThreadData | null;
}

export function ChatPage({ conversations, selected }: ChatPageProps) {
  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t.chat.title}</h1>
          <p className="text-sm text-muted-foreground">{t.chat.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalUnread > 0 ? <Badge>{t.chat.unreadCount(totalUnread)}</Badge> : null}
          <Badge variant="secondary">{t.chat.conversationCount(conversations.length)}</Badge>
        </div>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title={t.chat.noStudentsTitle}
          description={t.chat.noStudentsDescription}
          icon={<MessageCircle className="size-5" />}
        />
      ) : (
        <div className="grid h-[calc(100dvh-10rem)] min-h-[700px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="hidden h-full overflow-hidden rounded-lg border bg-card lg:block">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                <Search className="size-4" />
                <span>{t.chat.pickStudent}</span>
              </div>
            </div>
            <nav className="h-[calc(100%-61px)] overflow-y-auto p-2">
              {conversations.map((conversation) => {
                const active = selected?.studentId === conversation.studentId;
                return (
                  <Link
                    key={conversation.studentId}
                    href={`/messages?student=${conversation.studentId}`}
                    className={cn(
                      "flex gap-3 rounded-md px-3 py-3 transition-colors",
                      focusRing,
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(conversation.studentName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {conversation.studentName}
                        </span>
                        {conversation.lastMessage ? (
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {formatDateTime(conversation.lastMessage.created_at)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {conversation.lastMessage
                            ? conversation.lastMessage.body ||
                              conversation.lastMessage.attachment_name ||
                              t.chat.attachment
                            : conversation.subject || t.chat.noMessagesYet}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <Badge className="shrink-0 px-2" variant="default">
                            {conversation.unreadCount}
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {selected ? (
            <ChatThread
              key={selected.studentId}
              title={selected.studentName}
              subtitle={selected.subject}
              messages={selected.messages}
              currentSender="tutor"
              action={sendTutorChatMessageAction.bind(null, selected.studentId)}
              draftKey={`tutor:${selected.studentId}`}
              realtimeStudentId={selected.studentId}
              readKey={`tutor:${selected.studentId}`}
              markReadAction={markTutorChatReadAction.bind(null, selected.studentId)}
              headerStartAction={
                <MobileConversationDrawer
                  conversations={conversations}
                  selectedId={selected.studentId}
                />
              }
            />
          ) : (
            <EmptyState
              title={t.chat.pickStudent}
              description={t.chat.pickStudentDescription}
              icon={<MessageCircle className="size-5" />}
            />
          )}
        </div>
      )}
    </div>
  );
}
