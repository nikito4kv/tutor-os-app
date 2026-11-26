import { cn } from "@/lib/utils";

export function CharacterCounter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const nearLimit = value >= Math.ceil(max * 0.9);

  return (
    <span
      className={cn(
        "shrink-0 text-xs font-normal tabular-nums text-muted-foreground",
        nearLimit ? "text-warning" : "",
        className,
      )}
    >
      {value}/{max}
    </span>
  );
}
