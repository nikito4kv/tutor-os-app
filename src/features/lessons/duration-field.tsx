"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_LESSON_DURATION_MIN, DURATION_PRESETS } from "@/lib/constants";
import { t } from "@/lib/i18n";

/** Duration in minutes: one-tap presets + a free-form number, shared by add/edit. */
export function DurationField({
  name = "duration_min",
  defaultValue = DEFAULT_LESSON_DURATION_MIN,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [duration, setDuration] = useState<number>(defaultValue);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{t.lessons.fields.duration}</Label>
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={duration === n ? "default" : "outline"}
            onClick={() => setDuration(n)}
          >
            {n} {t.lessons.durationUnit}
          </Button>
        ))}
      </div>
      <Input
        id={name}
        name={name}
        type="number"
        min={1}
        step={1}
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        required
      />
    </div>
  );
}
