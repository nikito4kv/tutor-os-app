"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/empty-state";
import { Pagination, usePaginated } from "@/components/states/pagination";
import { SHORT_TEXT_MAX } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { t } from "@/lib/i18n";
import type { AdminTutor } from "./queries";

function valueOrEmpty(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : t.admin.directory.emptyValue;
}

/**
 * Справочник репетиторов для админа: поиск по имени/email (как роутер учеников у
 * репетитора) + пагинация. Намеренно без «рабочих» метрик (уроки/ученики) — админ
 * не ведёт занятия; разбор по преподавателю живёт на его странице (аналитика).
 */
export function AdminTutorList({ tutors }: { tutors: AdminTutor[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase("ru");
  const filtered = useMemo(
    () =>
      q
        ? tutors.filter((tutor) =>
            `${tutor.name} ${tutor.email}`.toLocaleLowerCase("ru").includes(q),
          )
        : tutors,
    [tutors, q],
  );
  const { page, setPage, pageSize, setPageSize, total, pageItems } = usePaginated(filtered, [q]);

  if (tutors.length === 0) {
    return (
      <EmptyState
        title={t.admin.directory.tutorsEmpty}
        icon={<GraduationCap className="size-6" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={SHORT_TEXT_MAX}
          placeholder={t.admin.directory.searchPlaceholder}
          aria-label={t.admin.directory.searchPlaceholder}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title={t.admin.directory.searchEmpty} />
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {pageItems.map((tutor) => (
              <li key={tutor.id}>
                <Link
                  href={`/admin/users/${tutor.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{valueOrEmpty(tutor.name)}</p>
                    <p className="truncate text-sm text-muted-foreground">{tutor.email}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {formatDate(tutor.created_at)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
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
