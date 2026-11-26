"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function HomeworkFileField({ name, label }: { name: string; label: string }) {
  const id = React.useId();
  const [fileName, setFileName] = React.useState("");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({t.common.optional})
        </span>
      </Label>
      <input
        id={id}
        name={name}
        type="file"
        className="sr-only"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 cursor-pointer")}
        >
          <Upload className="size-4" />
          {t.homework.chooseFile}
        </label>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {fileName || t.homework.noFileSelected}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t.homework.fileLimit}</p>
    </div>
  );
}
