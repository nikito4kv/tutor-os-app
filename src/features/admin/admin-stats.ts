import { CalendarClock, CheckCircle2, UserX, XCircle, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { AdminStats } from "./queries";

/** Подпись дельты для карточки: 8 → "+8"; 0 и меньше → null (ничего не рисуем). */
export function formatDelta(n: number): string | null {
  return n > 0 ? `+${n}` : null;
}

/**
 * Семантический «тон» статуса — токен из дизайн-системы (см. globals.css). Цвет
 * берём через токен (тема-aware), а не сырым hex — зеркало `lessonColorValue`.
 */
export type StatusTone = "primary" | "success" | "destructive" | "warning";

export const STATUS_TONE: Record<StatusTone, { dot: string; text: string; color: string }> = {
  primary: { dot: "bg-primary", text: "text-primary", color: "hsl(var(--primary))" },
  success: { dot: "bg-success", text: "text-success", color: "hsl(var(--success))" },
  destructive: {
    dot: "bg-destructive",
    text: "text-destructive",
    color: "hsl(var(--destructive))",
  },
  warning: { dot: "bg-warning", text: "text-warning", color: "hsl(var(--warning))" },
};

interface LessonStatusMeta {
  key: keyof AdminStats;
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
}

/**
 * Единый источник для рендера и тестов: четыре статуса урока в порядке жизненного
 * цикла. `satisfies` гарантирует, что каждый `key` — реальный ключ `AdminStats`
 * (компайл-тайм синхронизация со схемой `lesson`).
 */
export const LESSON_STATUS_META = [
  {
    key: "lessons_scheduled",
    label: t.admin.lessonStatus.scheduled,
    icon: CalendarClock,
    tone: "primary",
  },
  { key: "lessons_done", label: t.admin.lessonStatus.done, icon: CheckCircle2, tone: "success" },
  {
    key: "lessons_canceled",
    label: t.admin.lessonStatus.canceled,
    icon: XCircle,
    tone: "destructive",
  },
  { key: "lessons_no_show", label: t.admin.lessonStatus.no_show, icon: UserX, tone: "warning" },
] as const satisfies readonly LessonStatusMeta[];

export interface LessonSegment {
  key: keyof AdminStats;
  label: string;
  tone: StatusTone;
  count: number;
  /** Доля от всех уроков, 0–100, округлённая (для подписи и прогресс-бара). */
  pct: number;
}

/** Разложить уроки по статусам (count + доля). Чистая функция → покрыта юнит-тестом. */
export function lessonSegments(stats: AdminStats): { total: number; segments: LessonSegment[] } {
  const total = LESSON_STATUS_META.reduce((sum, m) => sum + stats[m.key], 0);
  const segments = LESSON_STATUS_META.map((m) => ({
    key: m.key,
    label: m.label,
    tone: m.tone,
    count: stats[m.key],
    pct: total === 0 ? 0 : Math.round((stats[m.key] / total) * 100),
  }));
  return { total, segments };
}

/**
 * CSS `conic-gradient` для кольца-донута. Сектора считаем по точной доле
 * (`count/total`), а не по округлённому `pct`, чтобы между ними не было щелей.
 * Пустые сегменты пропускаем; при `total === 0` возвращаем "" (caller рисует
 * нейтральное кольцо).
 */
export function donutGradient(segments: LessonSegment[], total: number): string {
  if (total === 0) return "";
  let acc = 0;
  const stops = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const start = (acc / total) * 360;
      acc += s.count;
      const end = (acc / total) * 360;
      return `${STATUS_TONE[s.tone].color} ${start}deg ${end}deg`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}
