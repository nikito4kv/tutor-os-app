import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { STATUS_TONE, donutGradient, lessonSegments } from "./admin-stats";
import type { AdminStats } from "./queries";

/**
 * Разбивка уроков по статусам как кольцо-донат + легенда с долями. Кольцо рисуем
 * чистым `conic-gradient` на токенах (без чарт-либ, см. docs/DESIGN.md) — оно
 * декоративное (`aria-hidden`), все числа дублируются в доступной легенде.
 */
export function LessonStatusChart({ stats }: { stats: AdminStats }) {
  const { total, segments } = lessonSegments(stats);
  const gradient = donutGradient(segments, total);

  return (
    <Card className="bg-gradient-to-br from-card to-accent/20 p-6">
      <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
        {/* Кольцо: внешний круг с conic-градиентом + «дырка» цветом карточки.
            Сам градиент декоративен (его дублирует легенда), но центр кольца —
            это общий счётчик уроков, поэтому он остаётся доступным для ридеров. */}
        <div className="mx-auto">
          <div
            className="relative grid size-44 place-items-center rounded-full"
            style={gradient ? { background: gradient } : undefined}
          >
            {!gradient ? <div className="absolute inset-0 rounded-full bg-muted" /> : null}
            <div className="absolute inset-[16%] grid place-items-center rounded-full bg-card text-center shadow-sm">
              <div className="space-y-1">
                <span className="block text-3xl font-semibold tabular-nums leading-none">
                  {total}
                </span>
                <span className="block text-xs text-muted-foreground">{t.admin.stats.lessons}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Легенда: статус + count + доля + тонкий прогресс-бар. */}
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {segments.map((s) => {
            const tone = STATUS_TONE[s.tone];
            return (
              <li key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
                    <span className="text-muted-foreground">{s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{s.count}</span> · {s.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", tone.dot)}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
