import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free progress bar on tokens (no Radix needed for a static
 * indicator). Renders once on the server, so no width transition (DESIGN §11
 * animates transform/opacity, not width). `value` is a 0–100 percentage and is
 * clamped defensively.
 */
export function Progress({
  value,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  className?: string;
  "aria-label"?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}
