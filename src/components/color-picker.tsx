"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LESSON_COLOR,
  LESSON_COLOR_KEYS,
  lessonColorValue,
  type LessonColor,
} from "@/lib/lesson-colors";
import { t } from "@/lib/i18n";

/**
 * Lesson colour picker — an accessible radiogroup of swatches. Stores the palette
 * KEY in a hidden `<input name>`; the selection shows a Check (so colour isn't the
 * only cue) plus a contrasting border. Roving tabindex + arrow keys follow the
 * WAI-ARIA radiogroup pattern. Labels come from i18n for screen readers.
 */
export function ColorPicker({
  name = "color",
  defaultValue = DEFAULT_LESSON_COLOR,
}: {
  name?: string;
  defaultValue?: LessonColor;
}) {
  const [selected, setSelected] = React.useState<LessonColor>(defaultValue);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function move(from: number, delta: number) {
    const len = LESSON_COLOR_KEYS.length;
    const next = (from + delta + len) % len;
    const key = LESSON_COLOR_KEYS[next];
    if (!key) return;
    setSelected(key);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(i, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(i, -1);
    }
  }

  return (
    <div role="radiogroup" aria-label={t.lessons.fields.color} className="grid grid-cols-8 gap-2">
      <input type="hidden" name={name} value={selected} />
      {LESSON_COLOR_KEYS.map((key, i) => {
        const isSelected = key === selected;
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={t.lessons.colors[key]}
            title={t.lessons.colors[key]}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => setSelected(key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
              isSelected ? "border-foreground" : "border-transparent",
            )}
            style={{ backgroundColor: lessonColorValue(key) }}
          >
            {isSelected ? (
              <Check className="size-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
