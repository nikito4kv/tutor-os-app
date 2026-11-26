"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { Student } from "@/features/students/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/empty-state";
import { Pagination, usePaginated } from "@/components/states/pagination";
import { SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";

type View = "list" | "cards";

/**
 * Client-side roster: search-as-you-type (name + subject/level), alphabetical
 * order, and a list/cards toggle. List is the default — it scans far better at
 * scale than the card grid. Data is fetched server-side and passed in whole;
 * filtering/sorting stay on the client (no per-keystroke round-trip).
 */
export function StudentList({ students }: { students: Student[] }) {
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [students],
  );

  const q = query.trim().toLocaleLowerCase("ru");
  const filtered = useMemo(
    () =>
      q
        ? sorted.filter((s) => `${s.name} ${studentMeta(s)}`.toLocaleLowerCase("ru").includes(q))
        : sorted,
    [sorted, q],
  );

  const { page, setPage, pageSize, setPageSize, total, pageItems } = usePaginated(filtered, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={SHORT_TEXT_MAX}
            placeholder={t.students.search}
            aria-label={t.students.search}
            className="pl-9"
          />
        </div>
        <div className="flex w-fit shrink-0 gap-1 rounded-md border p-1">
          <ViewTab
            label={t.students.views.list}
            active={view === "list"}
            onClick={() => setView("list")}
          />
          <ViewTab
            label={t.students.views.cards}
            active={view === "cards"}
            onClick={() => setView("cards")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title={t.students.noResults} />
      ) : (
        <>
          {view === "cards" ? (
            <StudentCards students={pageItems} />
          ) : (
            <StudentRows students={pageItems} />
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function StudentCards({ students }: { students: Student[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <Link
          key={student.id}
          href={`/students/${student.id}`}
          data-onboarding-target="student-row"
          className={cn("rounded-lg", focusRing)}
        >
          <Card className="h-full transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar name={student.name} />
              <div className="min-w-0">
                <div className="truncate font-medium">{student.name}</div>
                <div className="truncate text-sm text-muted-foreground">{studentMeta(student)}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function StudentRows({ students }: { students: Student[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {students.map((student) => (
        <li key={student.id}>
          <Link
            href={`/students/${student.id}`}
            data-onboarding-target="student-row"
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <Avatar name={student.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{student.name}</p>
              <p className="truncate text-sm text-muted-foreground">{studentMeta(student)}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Initials chip — a fast visual anchor when scanning a long roster. */
function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
    >
      {initials(name)}
    </div>
  );
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded px-3 py-1 text-sm font-medium transition-colors",
        focusRing,
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  const chars = second ? first.charAt(0) + second.charAt(0) : first.charAt(0);
  return (chars || "?").toLocaleUpperCase("ru");
}

function studentMeta(student: Student): string {
  return [student.subject, student.level].filter(Boolean).join(" · ") || "—";
}
