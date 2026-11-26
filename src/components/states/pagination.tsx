"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Размеры страницы из ТЗ; 25 — значение по умолчанию. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Client-side pagination over an already-loaded array. Keeps client filters/search
 * intact (we slice the *filtered* result), which server-side ranges would break.
 * Fits the MVP's small datasets; swap for a server range query if lists grow huge.
 *
 * `deps` — значения, при смене которых нужно вернуться на первую страницу
 * (например строка поиска), даже если общее число элементов не изменилось.
 */
export function usePaginated<T>(items: readonly T[], deps: readonly unknown[] = []) {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Любая смена набора/фильтра/размера возвращает на первую страницу.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), [pageSize, total, ...deps]);

  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return { page: safePage, setPage, pageSize, setPageSize, total, pageCount, pageItems };
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

/** Панель управления пагинацией: выбор размера страницы + переход по страницам. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="page-size" className="whitespace-nowrap">
          {t.common.pagination.perPage}
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap tabular-nums">
          {t.common.pagination.range(from, to, total)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={t.common.pagination.prev}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {t.common.pagination.page(page, pageCount)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label={t.common.pagination.next}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
